const pool = require('../db');
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
    console.log(`Generating PDF for invoice ${id} with craftsman ID ${craftsman_id}`);
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    if (!craftsman_id) {
      return res.status(400).json({ error: 'Craftsman ID is required' });
    }
    const invoiceQuery = `
      SELECT i.*, c.name as customer_name, c.address as customer_address, 
             c.phone as customer_phone, c.email as customer_email,
             cr.name as craftsman_name
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
    // Prepare directory for saving PDFs
    const publicDir = path.join(__dirname, '..', 'public');
    const pdfDir = path.join(publicDir, 'pdfs');
    fs.mkdirSync(pdfDir, { recursive: true });
    const fileName = `invoice_${invoice.invoice_number || invoice.id}_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);
    // Create and write PDF to file
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.fontSize(25).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
      .text(`Invoice Number: ${invoice.invoice_number || invoice.id}`)
      .text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`)
      .moveDown()
      .text(`Customer: ${invoice.customer_name || 'N/A'}`)
      .text(`Email: ${invoice.customer_email || 'N/A'}`)
      .moveDown()
      .text(`Amount: €${parseFloat(invoice.amount || 0).toFixed(2)}`)
      .text(`Tax: €${parseFloat(invoice.tax_amount || 0).toFixed(2)}`)
      .text(`Total: €${parseFloat(invoice.total_amount || 0).toFixed(2)}`);
    doc.moveDown().text('Thank you for your business!');
    doc.end();
    writeStream.on('finish', () => {
      const fileUrl = `${req.protocol}://${req.get('host')}/pdfs/${fileName}`;
      res.json({ url: fileUrl });
    });
    writeStream.on('error', (err) => {
      console.error('Error writing PDF file:', err);
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    console.error('Error generating PDF file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  generatePdf
};
