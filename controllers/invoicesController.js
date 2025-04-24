const db = require('../db');
const { generateInvoicePdf, generateTestInvoicePdf } = require('../services/pdfService');
const fs = require('fs-extra');
const path = require('path');

// Ensure the PDF directory exists
const PDF_DIR = path.join(__dirname, '..', 'pdf-output');
fs.ensureDirSync(PDF_DIR);

/**
 * Generate a PDF for an invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function generatePdf(req, res) {
  const { id } = req.params;
  
  try {
    // Get invoice data from database
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
    const invoiceResult = await db.query(invoiceQuery, [id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Get craftsman data
    const craftsmanQuery = `
      SELECT c.*, u.email 
      FROM craftsmen c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const craftsmanResult = await db.query(craftsmanQuery, [invoice.craftsman_id]);
    const craftsman = craftsmanResult.rows[0] || null;
    
    // Get customer data
    const customerQuery = 'SELECT * FROM customers WHERE id = $1';
    const customerResult = await db.query(customerQuery, [invoice.customer_id]);
    const customer = customerResult.rows[0] || null;
    
    // Get invoice items
    const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1';
    const itemsResult = await db.query(itemsQuery, [id]);
    const items = itemsResult.rows || [];
    
    // Prepare complete invoice data
    const invoiceData = {
      ...invoice,
      craftsman,
      customer,
      items
    };
    
    // Generate PDF
    const result = await generateInvoicePdf(invoiceData);
    
    // Send the file as download
    res.download(result.path, result.filename, (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
        // Don't delete the file on error so we can debug
      } else {
        // Optionally delete the file after sending
        // fs.unlinkSync(result.path);
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

/**
 * Generate a test PDF with sample data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function generateTestPdf(req, res) {
  try {
    // Generate test PDF
    const result = await generateTestInvoicePdf();
    
    // Send the file as download
    res.download(result.path, result.filename, (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
      }
    });
  } catch (error) {
    console.error('Error generating test PDF:', error);
    res.status(500).json({ error: 'Failed to generate test PDF' });
  }
}

/**
 * Preview a PDF for an invoice (returns URL)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function previewPdf(req, res) {
  const { id } = req.params;
  
  try {
    // Get invoice data from database
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
    const invoiceResult = await db.query(invoiceQuery, [id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Get craftsman data
    const craftsmanQuery = `
      SELECT c.*, u.email 
      FROM craftsmen c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const craftsmanResult = await db.query(craftsmanQuery, [invoice.craftsman_id]);
    const craftsman = craftsmanResult.rows[0] || null;
    
    // Get customer data
    const customerQuery = 'SELECT * FROM customers WHERE id = $1';
    const customerResult = await db.query(customerQuery, [invoice.customer_id]);
    const customer = customerResult.rows[0] || null;
    
    // Get invoice items
    const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1';
    const itemsResult = await db.query(itemsQuery, [id]);
    const items = itemsResult.rows || [];
    
    // Prepare complete invoice data
    const invoiceData = {
      ...invoice,
      craftsman,
      customer,
      items
    };
    
    // Generate PDF
    const result = await generateInvoicePdf(invoiceData);
    
    // Return the URL to the PDF
    const pdfUrl = `/api/invoices/pdf-files/${result.filename}`;
    res.json({ url: pdfUrl, filename: result.filename });
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    res.status(500).json({ error: 'Failed to generate PDF preview' });
  }
}

module.exports = {
  generatePdf,
  generateTestPdf,
  previewPdf
};
