const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * Generate a PDF invoice for the given invoice ID
 * @param {number} invoiceId - The ID of the invoice to generate
 * @returns {Object} Object containing filepath and filename of the generated PDF
 */
const generateInvoicePDF = async (invoiceId) => {
  try {
    // Get invoice data
    const invoice = await db.query(
      `SELECT i.*, c.name as customer_name, c.address as customer_address, c.email as customer_email,
       cr.name as craftsman_name, cr.phone as craftsman_phone, cr.email as craftsman_email,
       u.username as craftsman_username, a.title as appointment_title, a.start_time as appointment_date
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN craftsmen cr ON i.craftsman_id = cr.id
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN appointments a ON i.appointment_id = a.id
       WHERE i.id = $1`,
      [invoiceId]
    );
    
    if (!invoice.rows[0]) {
      throw new Error('Invoice not found');
    }
    
    const invoiceData = invoice.rows[0];
    
    // Get invoice items
    const items = await db.query(
      `SELECT ii.*, m.name as material_name 
       FROM invoice_items ii
       LEFT JOIN materials m ON ii.material_id = m.id
       WHERE ii.invoice_id = $1`,
      [invoiceId]
    );
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set up file paths
    const invoicesDir = path.join(__dirname, '../invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    
    const filename = `invoice_${invoiceData.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const filepath = path.join(invoicesDir, filename);
    
    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filepath));
    
    // Add company logo (if available)
    // const logoPath = path.join(__dirname, '../public/logo.png');
    // if (fs.existsSync(logoPath)) {
    //   doc.image(logoPath, 50, 45, { width: 150 });
    // }
    
    // Add document title
    doc.fontSize(20).text('ZIMMR', { align: 'left' });
    doc.fontSize(12).text('Professional Tiling Services', { align: 'left' });
    doc.moveDown(0.5);
    
    // Add invoice title
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.moveDown();
    
    // Add invoice details
    doc.fontSize(10)
      .text(`Invoice Number: ${invoiceData.invoice_number}`, { align: 'right' })
      .text(`Date: ${new Date(invoiceData.created_at).toLocaleDateString('de-DE')}`, { align: 'right' })
      .text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString('de-DE')}`, { align: 'right' })
      .moveDown(2);
    
    // Add craftsman and customer details
    doc.fontSize(12).text('From:', { underline: true })
      .fontSize(10)
      .text(`${invoiceData.craftsman_name}`)
      .text(`Phone: ${invoiceData.craftsman_phone}`)
      .text(`Email: ${invoiceData.craftsman_email}`)
      .moveDown()
      .fontSize(12).text('To:', { underline: true })
      .fontSize(10)
      .text(`${invoiceData.customer_name}`)
      .text(`${invoiceData.customer_address || 'No address provided'}`)
      .text(`Email: ${invoiceData.customer_email || 'No email provided'}`)
      .moveDown(2);
    
    // Add appointment details if available
    if (invoiceData.appointment_title) {
      doc.fontSize(12).text('Service Details:', { underline: true })
        .fontSize(10)
        .text(`Service: ${invoiceData.appointment_title}`)
        .text(`Date: ${new Date(invoiceData.appointment_date).toLocaleDateString('de-DE')}`)
        .moveDown(2);
    }
    
    // Add table headers
    const tableTop = doc.y;
    doc.fontSize(10)
      .text('Description', 50, tableTop, { width: 250 })
      .text('Quantity', 300, tableTop, { width: 50, align: 'right' })
      .text('Unit Price', 350, tableTop, { width: 100, align: 'right' })
      .text('Amount', 450, tableTop, { width: 100, align: 'right' });
    
    doc.moveDown();
    doc.lineCap('butt')
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.moveDown();
    
    // Add table rows
    let tableRowY = doc.y;
    items.rows.forEach(item => {
      // Format description to include material name if available
      let description = item.description;
      if (item.material_name && !description.includes(item.material_name)) {
        description = `${item.material_name} - ${description}`;
      }
      
      doc.text(description, 50, tableRowY, { width: 250 })
        .text(item.quantity.toString(), 300, tableRowY, { width: 50, align: 'right' })
        .text(`€${item.unit_price.toFixed(2)}`, 350, tableRowY, { width: 100, align: 'right' })
        .text(`€${item.amount.toFixed(2)}`, 450, tableRowY, { width: 100, align: 'right' })
        .moveDown();
      tableRowY = doc.y;
    });
    
    // Add line
    doc.lineCap('butt')
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.moveDown();
    
    // Add totals
    doc.text('Subtotal:', 350, doc.y, { width: 100, align: 'right' })
      .text(`€${invoiceData.amount.toFixed(2)}`, 450, doc.y - 12, { width: 100, align: 'right' })
      .moveDown()
      .text('VAT (19%):', 350, doc.y, { width: 100, align: 'right' })
      .text(`€${invoiceData.tax_amount.toFixed(2)}`, 450, doc.y - 12, { width: 100, align: 'right' })
      .moveDown()
      .fontSize(12)
      .text('Total:', 350, doc.y, { width: 100, align: 'right' })
      .text(`€${invoiceData.total_amount.toFixed(2)}`, 450, doc.y - 14, { width: 100, align: 'right' });
    
    // Add payment instructions
    doc.moveDown(2)
      .fontSize(10)
      .text('Payment Instructions:', { underline: true })
      .text(`Please pay the invoice by the due date. Bank transfer details are provided below.`)
      .moveDown();
    
    // Add bank details
    doc.text('Bank Details:', { underline: true })
      .text('Bank: Sample Bank')
      .text('IBAN: DE89 3704 0044 0532 0130 00')
      .text('BIC: COBADEFFXXX')
      .text('Account Holder: ZIMMR Tiling Services')
      .text(`Reference: ${invoiceData.invoice_number}`);
    
    // Add payment link if available
    if (invoiceData.payment_link) {
      doc.moveDown()
        .text('Online Payment:', { underline: true })
        .text(`To pay online, please visit: ${invoiceData.payment_link}`);
    }
    
    // Add notes if any
    if (invoiceData.notes) {
      doc.moveDown()
        .text('Notes:', { underline: true })
        .text(invoiceData.notes);
    }
    
    // Add footer
    doc.fontSize(8)
      .text(
        'Thank you for your business! This invoice was generated automatically by ZIMMR.',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );
    
    // Finalize the PDF
    doc.end();
    
    return {
      filepath,
      filename
    };
    
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
};

module.exports = {
  generateInvoicePDF
};
