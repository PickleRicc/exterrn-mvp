const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');

/**
 * Generate a PDF invoice
 * @param {Object} options - Options for PDF generation
 * @param {number} options.invoiceId - Invoice ID
 * @param {boolean} options.stream - Whether to return a stream (true) or file path (false)
 * @param {string} options.outputPath - Optional custom output path for the PDF
 * @returns {Promise<string|PDFDocument>} - Returns PDF document stream or file path
 */
const generateInvoicePdf = async ({ invoiceId, stream = false, outputPath = null }) => {
  try {
    // Get invoice data
    const invoiceResult = await pool.query(
      `SELECT i.*, 
        c.name as customer_name, 
        c.address as customer_address, 
        c.phone as customer_phone,
        c.email as customer_email,
        cr.name as craftsman_name,
        cr.company_name,
        cr.address as craftsman_address,
        cr.phone as craftsman_phone,
        cr.email as craftsman_email,
        cr.vat_number,
        cr.bank_name,
        cr.bank_account,
        cr.tax_id
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1`,
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Get invoice items
    const itemsResult = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [invoiceId]
    );
    
    const items = itemsResult.rows;
    console.log(`Found ${items.length} items for invoice ${invoiceId}`);
    
    // Create a PDF document
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50 
    });
    
    // Handle stream mode
    if (stream) {
      console.log('Returning PDF as stream');
      return doc; // Return the document for streaming
    }
    
    // For file mode, pipe to a file
    const pdfPath = outputPath || path.join(process.cwd(), 'temp', `${invoice.type}_${invoice.invoice_number.replace(/\//g, '-')}.pdf`);
    
    // Ensure directory exists
    const dir = path.dirname(pdfPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    console.log(`Generating PDF file at: ${pdfPath}`);
    
    // Pipe the PDF to a file
    doc.pipe(fs.createWriteStream(pdfPath));
    
    // Add document title
    const documentType = invoice.type === 'invoice' ? 'INVOICE' : 'QUOTE';
    
    // Add company header
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(invoice.company_name || 'Company Name', 50, 50)
       .fontSize(10)
       .font('Helvetica')
       .text(invoice.craftsman_address || 'Address', 50, 70)
       .text(`Phone: ${invoice.craftsman_phone || 'N/A'}`, 50, 85)
       .text(`Email: ${invoice.craftsman_email || 'N/A'}`, 50, 100)
       .text(`VAT Number: ${invoice.vat_number || 'N/A'}`, 50, 115);
    
    // Add document title and number
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(documentType, 400, 50)
       .fontSize(10)
       .font('Helvetica')
       .text(`Number: ${invoice.invoice_number}`, 400, 70)
       .text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 85)
       .text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`, 400, 100);
    
    // Add customer information
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Bill To:', 50, 170);
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(invoice.customer_name || 'Customer Name Not Provided', 50, 195)
       .text(invoice.customer_address || 'Address Not Provided', 50, 210);
    
    if (invoice.customer_phone) {
      doc.text(`Phone: ${invoice.customer_phone}`, 50, 225);
    }
    
    if (invoice.customer_email) {
      doc.text(`Email: ${invoice.customer_email}`, 50, 240);
    }
    
    // Add invoice items table header
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Description', 50, 280)
       .text('Quantity', 300, 280)
       .text('Unit Price', 370, 280)
       .text('Tax Rate', 440, 280)
       .text('Amount', 510, 280);
    
    // Draw a line under the header
    doc.moveTo(50, 295)
       .lineTo(550, 295)
       .stroke();
    
    // Add invoice items
    let y = 310;
    let subtotal = 0;
    let taxTotal = 0;
    
    // Add at least one item if none exist
    if (items.length === 0) {
      items.push({
        description: 'Service',
        quantity: 1,
        unit_price: 0,
        tax_rate: 19,
        amount: 0
      });
    }
    
    items.forEach(item => {
      const amount = parseFloat(item.amount || (item.quantity * item.unit_price));
      subtotal += amount;
      
      if (!invoice.vat_exempt) {
        const taxRate = parseFloat(item.tax_rate || 19);
        const taxAmount = (amount * taxRate) / 100;
        taxTotal += taxAmount;
      }
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(item.description || 'Service', 50, y, { width: 240 })
         .text(item.quantity || '1', 300, y)
         .text(`€${parseFloat(item.unit_price || 0).toFixed(2)}`, 370, y)
         .text(`${invoice.vat_exempt ? 'Exempt' : `${parseFloat(item.tax_rate || 19)}%`}`, 440, y)
         .text(`€${amount.toFixed(2)}`, 510, y);
      
      y += 20;
      
      // Add a page break if needed
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    
    // Draw a line after the items
    doc.moveTo(50, y)
       .lineTo(550, y)
       .stroke();
    
    y += 20;
    
    // Add totals
    doc.fontSize(10)
       .font('Helvetica')
       .text('Subtotal:', 400, y)
       .text(`€${subtotal.toFixed(2)}`, 510, y);
    
    y += 20;
    
    if (!invoice.vat_exempt) {
      doc.text('Tax:', 400, y)
         .text(`€${taxTotal.toFixed(2)}`, 510, y);
      
      y += 20;
    }
    
    const totalAmount = invoice.vat_exempt ? subtotal : (subtotal + taxTotal);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Total:', 400, y)
       .text(`€${totalAmount.toFixed(2)}`, 510, y);
    
    // Add payment information
    y += 40;
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Payment Information', 50, y);
    
    y += 15;
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Bank: ${invoice.bank_name || 'N/A'}`, 50, y);
    
    y += 15;
    
    doc.text(`Account: ${invoice.bank_account || 'N/A'}`, 50, y);
    
    y += 15;
    
    // Add notes
    if (invoice.notes) {
      y += 20;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Notes', 50, y);
      
      y += 15;
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(invoice.notes, 50, y, { width: 500 });
    }
    
    // Add footer
    doc.fontSize(8)
       .font('Helvetica')
       .text(`${invoice.company_name || 'Company'} - ${invoice.craftsman_address || 'Address'} - Tax ID: ${invoice.tax_id || 'N/A'}`, 50, 750, { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    console.log(`PDF document finalized`);
    
    // Return a promise that resolves when the file is written
    return new Promise((resolve, reject) => {
      // Wait a moment to ensure the file is fully written
      setTimeout(() => {
        try {
          if (fs.existsSync(pdfPath)) {
            const stats = fs.statSync(pdfPath);
            if (stats.size > 0) {
              console.log(`PDF file created successfully: ${pdfPath}, size: ${stats.size} bytes`);
              resolve(pdfPath);
            } else {
              reject(new Error(`PDF file was created but is empty: ${pdfPath}`));
            }
          } else {
            reject(new Error(`PDF file was not created at path: ${pdfPath}`));
          }
        } catch (err) {
          console.error('Error verifying PDF file:', err);
          reject(err);
        }
      }, 500); // Give it 500ms to finish writing
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

module.exports = {
  generateInvoicePdf
};
