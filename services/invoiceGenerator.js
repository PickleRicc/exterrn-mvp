const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../db');

/**
 * Generate a PDF invoice or quote that meets German legal requirements (§14 UStG)
 * @param {Object} options - Configuration options
 * @param {number} options.invoiceId - ID of the invoice to generate PDF for
 * @param {string} options.outputPath - Path to save the PDF (optional)
 * @param {boolean} options.stream - Return a stream instead of writing to file (optional)
 * @returns {Promise<string|stream>} - Path to the generated PDF or the PDF stream
 */
const generateInvoicePdf = async (options) => {
  const { invoiceId, outputPath, stream = false } = options;
  
  try {
    console.log(`Starting PDF generation for invoice ${invoiceId}, stream mode: ${stream}`);
    
    if (!invoiceId) {
      throw new Error('Invoice ID is required for PDF generation');
    }
    
    // Get invoice data with all related information
    const invoiceResult = await pool.query(`
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name, cr.tax_id, cr.vat_id, cr.address as craftsman_address, cr.contact_info
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1
    `, [invoiceId]);
    
    if (invoiceResult.rows.length === 0) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }
    
    const invoice = invoiceResult.rows[0];
    console.log(`Found invoice: ${invoice.id}, type: ${invoice.type}, number: ${invoice.invoice_number}`);
    
    // Validate required invoice data
    if (!invoice.invoice_number) {
      throw new Error('Invoice number is missing');
    }
    
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
      margin: 50,
      info: {
        Title: `${invoice.type === 'invoice' ? 'Invoice' : 'Quote'} #${invoice.invoice_number}`,
        Author: invoice.craftsman_name || 'ZIMMR',
        Subject: `${invoice.type === 'invoice' ? 'Invoice' : 'Quote'} for ${invoice.customer_name || 'Customer'}`,
        Keywords: 'invoice, quote, zimmr',
        CreationDate: new Date()
      }
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
    
    // Helper function to add text with proper line breaks
    const addFormattedText = (text, x, y, options = {}) => {
      if (!text) return y;
      
      const lines = doc.heightOfString(text, { 
        width: options.width || 400,
        ...options
      });
      
      doc.text(text, x, y, { 
        width: options.width || 400,
        ...options
      });
      
      return y + lines + (options.lineGap || 0);
    };
    
    // Document title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#0a1929')
       .text(invoice.type === 'invoice' ? 'INVOICE' : 'QUOTE', 50, 50);
    
    // Craftsman information (sender)
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#444444')
       .text(invoice.craftsman_name || 'ZIMMR', 50, 90)
       .text(invoice.craftsman_address || 'Address not provided', 50, 105);
    
    if (invoice.contact_info) {
      doc.text(invoice.contact_info, 50, 120);
    } else {
      doc.text('Contact: Not provided', 50, 120);
    }
    
    // Tax information (legally required)
    let taxInfoY = 135;
    if (invoice.tax_id) {
      doc.text(`Tax ID: ${invoice.tax_id}`, 50, taxInfoY);
      taxInfoY += 15;
    } else {
      doc.text('Tax ID: Not provided', 50, taxInfoY);
      taxInfoY += 15;
    }
    
    if (invoice.vat_id) {
      doc.text(`VAT ID: ${invoice.vat_id}`, 50, taxInfoY);
    } else {
      doc.text('VAT ID: Not provided', 50, taxInfoY);
    }
    
    // Invoice details
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(`${invoice.type === 'invoice' ? 'Invoice' : 'Quote'} #:`, 400, 90)
       .text('Date:', 400, 105)
       .text('Due Date:', 400, 120);
    
    if (invoice.service_date) {
      doc.text('Service Date:', 400, 135);
    }
    
    // Invoice values
    doc.fontSize(10)
       .font('Helvetica')
       .text(invoice.invoice_number, 470, 90)
       .text(formatDate(invoice.created_at), 470, 105)
       .text(invoice.due_date ? formatDate(invoice.due_date) : 'N/A', 470, 120);
    
    if (invoice.service_date) {
      doc.text(formatDate(invoice.service_date), 470, 135);
    }
    
    // Customer information (recipient) - legally required
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Bill To:', 50, 180);
    
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
    
    // Service location (if different from customer address)
    if (invoice.location && invoice.location !== invoice.customer_address) {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Service Location:', 300, 180);
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(invoice.location, 300, 195);
    }
    
    // Line items table header
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
    
    // Line items
    let y = 305;
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
      
      // Add a new page if we're near the bottom
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    
    // Draw a line above the totals
    doc.moveTo(50, y + 10)
       .lineTo(550, y + 10)
       .stroke();
    
    // Totals
    y += 20;
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Subtotal:', 400, y)
       .font('Helvetica')
       .text(`€${subtotal.toFixed(2)}`, 510, y);
    
    y += 20;
    if (!invoice.vat_exempt) {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('VAT (19%):', 400, y)
         .font('Helvetica')
         .text(`€${taxTotal.toFixed(2)}`, 510, y);
    } else {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('VAT:', 400, y)
         .font('Helvetica')
         .text('Exempt', 510, y);
    }
    
    y += 20;
    const total = subtotal + (invoice.vat_exempt ? 0 : taxTotal);
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Total:', 400, y)
       .text(`€${total.toFixed(2)}`, 510, y);
    
    // VAT exemption notice (if applicable) - legally required
    if (invoice.vat_exempt) {
      y += 40;
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .text('This invoice is exempt from VAT according to §19 UStG (Kleinunternehmerregelung).', 50, y, { width: 500 });
    }
    
    // Notes
    if (invoice.notes) {
      y += 40;
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Notes:', 50, y);
      
      y += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .text(invoice.notes, 50, y, { width: 500 });
    }
    
    // Payment information
    y += 40;
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Payment Information:', 50, y);
    
    y += 15;
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Please make payment within ${formatPaymentDeadline(invoice.payment_deadline)}.`, 50, y);
    
    if (invoice.payment_link) {
      y += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .text('Online payment link:', 50, y)
         .fillColor('blue')
         .text(invoice.payment_link, 150, y, { link: invoice.payment_link });
    }
    
    // Footer with legal information
    const footerY = doc.page.height - 50;
    doc.fontSize(8)
       .fillColor('#666666')
       .text(`${invoice.type === 'invoice' ? 'Invoice' : 'Quote'} generated by ZIMMR - Platform for craftsmen in Germany`, 50, footerY, { align: 'center', width: 500 });
    
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

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error(`Invalid date: ${dateString}`);
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error(`Error formatting date ${dateString}:`, error);
    return 'Date error';
  }
};

// Helper function to format payment deadline
const formatPaymentDeadline = (deadline) => {
  if (!deadline) return '16 days';
  
  try {
    // Ensure deadline is a string
    const deadlineStr = String(deadline);
    
    // Extract days from interval string
    const match = deadlineStr.match(/(\d+) days/);
    if (match && match[1]) {
      return `${match[1]} days`;
    }
    
    return deadlineStr;
  } catch (error) {
    console.error(`Error formatting payment deadline "${deadline}":`, error);
    return '16 days'; // Default fallback
  }
};

module.exports = {
  generateInvoicePdf
};