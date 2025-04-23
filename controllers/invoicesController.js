const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Get all invoices with optional filters
const getAllInvoices = async (req, res) => {
  try {
    const { craftsman_id } = req.query;
    
    let query = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (craftsman_id) {
      query += ` AND i.craftsman_id = $${paramIndex}`;
      queryParams.push(craftsman_id);
      paramIndex++;
    }
    
    query += ` ORDER BY i.created_at DESC`;
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Get invoice with customer details
    const invoiceQuery = `
      SELECT i.*, c.name as customer_name, c.address as customer_address, 
             c.phone as customer_phone, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1 AND i.craftsman_id = $2
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [id, craftsman_id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to access it' });
    }
    
    res.json(invoiceResult.rows[0]);
  } catch (error) {
    console.error(`Error getting invoice ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Create new invoice
const createInvoice = async (req, res) => {
  try {
    const {
      craftsman_id,
      customer_id,
      amount,
      tax_amount,
      total_amount,
      notes,
      due_date
    } = req.body;
    
    // Validate required fields
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    
    if (!amount || !total_amount) {
      return res.status(400).json({ error: 'amount and total_amount are required' });
    }
    
    // Create invoice
    const query = `
      INSERT INTO invoices (
        craftsman_id, customer_id, amount, tax_amount, total_amount, notes, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      craftsman_id,
      customer_id,
      amount,
      tax_amount || 0,
      total_amount,
      notes || '',
      due_date || null
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
};

// Generate PDF for download
const generatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    
    if (!craftsman_id) {
      return res.status(400).json({ error: 'Craftsman ID is required' });
    }
    
    // Check if invoice exists and belongs to craftsman
    const invoiceQuery = `
      SELECT i.*, c.name as customer_name, c.address as customer_address, 
             c.phone as customer_phone, c.email as customer_email,
             cr.name as craftsman_name, cr.company_name, cr.address as craftsman_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1 AND i.craftsman_id = $2
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [id, craftsman_id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or does not belong to craftsman' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Set headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.invoice_number || invoice.id}.pdf"`);
    
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Add invoice content
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Add company info
    doc.fontSize(12).text(`${invoice.company_name || 'Company Name'}`, { align: 'left' });
    doc.fontSize(10).text(`${invoice.craftsman_name || 'Craftsman Name'}`);
    doc.text(`${invoice.craftsman_address || 'Address'}`);
    doc.moveDown();
    
    // Add invoice details
    doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number || invoice.id}`);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`);
    doc.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();
    
    // Add customer info
    doc.fontSize(12).text('Bill To:');
    doc.fontSize(10).text(`${invoice.customer_name || 'Customer'}`);
    doc.text(`${invoice.customer_address || 'Address'}`);
    doc.text(`Phone: ${invoice.customer_phone || 'N/A'}`);
    doc.text(`Email: ${invoice.customer_email || 'N/A'}`);
    doc.moveDown();
    
    // Add table headers
    const startX = 50;
    const startY = 300;
    const rowHeight = 30;
    const colWidth = 100;
    
    doc.font('Helvetica-Bold');
    doc.text('Description', startX, startY, { width: 200 });
    doc.text('Amount', startX + 300, startY, { width: 100, align: 'right' });
    
    // Add line
    doc.moveTo(startX, startY + 20)
       .lineTo(startX + 400, startY + 20)
       .stroke();
    
    // Add invoice amount
    doc.font('Helvetica');
    doc.text('Services', startX, startY + 30, { width: 200 });
    doc.text(`€${parseFloat(invoice.amount).toFixed(2)}`, startX + 300, startY + 30, { width: 100, align: 'right' });
    
    // Add tax if applicable
    if (invoice.tax_amount && parseFloat(invoice.tax_amount) > 0) {
      doc.text('Tax', startX, startY + 60, { width: 200 });
      doc.text(`€${parseFloat(invoice.tax_amount).toFixed(2)}`, startX + 300, startY + 60, { width: 100, align: 'right' });
    }
    
    // Add total
    doc.moveTo(startX, startY + 90)
       .lineTo(startX + 400, startY + 90)
       .stroke();
    
    doc.font('Helvetica-Bold');
    doc.text('Total', startX, startY + 100, { width: 200 });
    doc.text(`€${parseFloat(invoice.total_amount).toFixed(2)}`, startX + 300, startY + 100, { width: 100, align: 'right' });
    
    // Add notes if any
    if (invoice.notes) {
      doc.moveDown(2);
      doc.font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(invoice.notes);
    }
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  generatePdf
};
