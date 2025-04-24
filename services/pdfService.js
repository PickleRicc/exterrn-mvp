const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

// Ensure the PDF output directory exists
const PDF_DIR = path.join(__dirname, '..', 'pdf-output');
fs.ensureDirSync(PDF_DIR);

/**
 * Generate an invoice PDF
 * @param {Object} invoiceData - The invoice data
 * @returns {Promise<Object>} - Object containing the PDF path and filename
 */
async function generateInvoicePdf(invoiceData) {
  try {
    // Create a document
    const doc = new PDFDocument({ margin: 50 });
    const filename = `invoice-${invoiceData.invoice_number}.pdf`;
    const pdfPath = path.join(PDF_DIR, filename);
    
    // Pipe the PDF to a file
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    
    // Add the ZIMMR logo and header
    doc.fontSize(20)
       .fillColor('#132f4c')
       .text('ZIMMR', 50, 50)
       .fontSize(10)
       .fillColor('#666')
       .text('Handwerker-Verwaltungssystem', 50, 75);
    
    // Add a line
    doc.moveTo(50, 90)
       .lineTo(550, 90)
       .stroke('#e91e63');
    
    // Add invoice title and number
    doc.fontSize(16)
       .fillColor('#000')
       .text('RECHNUNG', 50, 110)
       .fontSize(10)
       .text(`Rechnungsnummer: ${invoiceData.invoice_number}`, 50, 130)
       .text(`Datum: ${new Date(invoiceData.created_at).toLocaleDateString('de-DE')}`, 50, 145);
    
    if (invoiceData.due_date) {
      doc.text(`Fällig bis: ${new Date(invoiceData.due_date).toLocaleDateString('de-DE')}`, 50, 160);
    }
    
    // Add craftsman details
    if (invoiceData.craftsman) {
      doc.fontSize(12)
         .text('Handwerker:', 300, 110)
         .fontSize(10)
         .text(invoiceData.craftsman.name || '', 300, 130);
      
      if (invoiceData.craftsman.company) {
        doc.text(invoiceData.craftsman.company, 300, 145);
      }
      
      if (invoiceData.craftsman.address) {
        doc.text(invoiceData.craftsman.address, 300, 160);
      }
      
      if (invoiceData.craftsman.phone) {
        doc.text(`Tel: ${invoiceData.craftsman.phone}`, 300, 175);
      }
      
      if (invoiceData.craftsman.email) {
        doc.text(`Email: ${invoiceData.craftsman.email}`, 300, 190);
      }
      
      if (invoiceData.craftsman.tax_id) {
        doc.text(`USt-IdNr: ${invoiceData.craftsman.tax_id}`, 300, 205);
      }
    }
    
    // Add customer details
    if (invoiceData.customer) {
      doc.fontSize(12)
         .text('Kunde:', 50, 200)
         .fontSize(10)
         .text(invoiceData.customer.name || '', 50, 220);
      
      if (invoiceData.customer.address) {
        doc.text(invoiceData.customer.address, 50, 235);
      }
      
      if (invoiceData.customer.phone) {
        doc.text(`Tel: ${invoiceData.customer.phone}`, 50, 250);
      }
      
      if (invoiceData.customer.email) {
        doc.text(`Email: ${invoiceData.customer.email}`, 50, 265);
      }
    }
    
    // Add table header for line items
    if (invoiceData.items && invoiceData.items.length > 0) {
      doc.fontSize(10)
         .fillColor('#132f4c')
         .rect(50, 300, 500, 20)
         .fill()
         .fillColor('#fff')
         .text('Beschreibung', 60, 305)
         .text('Menge', 300, 305)
         .text('Einzelpreis', 350, 305)
         .text('Gesamt', 450, 305);
      
      // Add table rows
      let y = 330;
      invoiceData.items.forEach((item, i) => {
        const isEven = i % 2 === 0;
        if (isEven) {
          doc.rect(50, y - 5, 500, 25).fillColor('#f5f5f5').fill();
        }
        
        doc.fillColor('#000')
           .text(item.description, 60, y)
           .text(item.quantity.toString(), 300, y)
           .text(`€${Number(item.unit_price).toFixed(2)}`, 350, y)
           .text(`€${Number(item.total).toFixed(2)}`, 450, y);
        
        y += 25;
      });
      
      // Add totals
      y += 20;
      doc.text('Zwischensumme:', 350, y)
         .text(`€${Number(invoiceData.amount).toFixed(2)}`, 450, y);
      
      if (invoiceData.tax_amount !== undefined) {
        y += 20;
        const taxRate = invoiceData.tax_rate || (invoiceData.vat_exempt ? 0 : 19);
        doc.text(`MwSt. (${taxRate}%):`, 350, y)
           .text(`€${Number(invoiceData.tax_amount).toFixed(2)}`, 450, y);
      }
      
      y += 20;
      doc.fontSize(12)
         .text('Gesamtbetrag:', 350, y)
         .text(`€${Number(invoiceData.total_amount).toFixed(2)}`, 450, y);
    }
    
    // Add notes
    if (invoiceData.notes) {
      const y = doc.y + 50;
      doc.fontSize(10)
         .text('Hinweise:', 50, y)
         .text(invoiceData.notes, 50, y + 20, { width: 500 });
    }
    
    // Add footer
    const footerY = doc.page.height - 50;
    doc.fontSize(8)
       .fillColor('#666')
       .text('ZIMMR GmbH • Musterstraße 123 • 12345 Berlin • Deutschland', 50, footerY, { align: 'center', width: 500 })
       .text('Tel: +49 123 456789 • Email: info@zimmr.de • Web: www.zimmr.de', 50, footerY + 15, { align: 'center', width: 500 });
    
    // Finalize the PDF
    doc.end();
    
    // Return a promise that resolves when the stream is finished
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({
          path: pdfPath,
          filename: filename
        });
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate a test invoice PDF with sample data
 * @returns {Promise<Object>} - Object containing the PDF path and filename
 */
async function generateTestInvoicePdf() {
  // Sample invoice data
  const invoiceData = {
    invoice_number: `2025-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
    created_at: new Date(),
    due_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 days from now
    craftsman: {
      name: 'Max Mustermann',
      company: 'Mustermann GmbH',
      address: 'Musterstraße 123, 12345 Berlin',
      phone: '+49 123 456789',
      email: 'max@mustermann.de',
      tax_id: 'DE123456789'
    },
    customer: {
      name: 'Erika Musterfrau',
      address: 'Beispielweg 42, 54321 München',
      email: 'erika@musterfrau.de',
      phone: '+49 987 654321'
    },
    items: [
      { description: 'Rohrreinigung', quantity: 1, unit_price: 120.00, total: 120.00 },
      { description: 'Wasserhahn Reparatur', quantity: 1, unit_price: 80.00, total: 80.00 },
      { description: 'Anfahrtskosten', quantity: 1, unit_price: 45.00, total: 45.00 }
    ],
    amount: 245.00,
    tax_rate: 19,
    tax_amount: 46.55,
    total_amount: 291.55,
    notes: 'Zahlbar innerhalb von 16 Tagen ohne Abzug. Vielen Dank für Ihren Auftrag!'
  };
  
  return generateInvoicePdf(invoiceData);
}

module.exports = {
  generateInvoicePdf,
  generateTestInvoicePdf
};
