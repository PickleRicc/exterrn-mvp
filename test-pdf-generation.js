const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

// Ensure the output directory exists
const outputDir = path.join(__dirname, 'pdf-output');
fs.ensureDirSync(outputDir);

// Create a function to generate a test invoice PDF
function generateTestInvoice() {
  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });
  
  // Set the output file path
  const outputPath = path.join(outputDir, `test-invoice-${Date.now()}.pdf`);
  const stream = fs.createWriteStream(outputPath);
  
  // Pipe the PDF document to the file
  doc.pipe(stream);
  
  // Sample invoice data (based on your schema)
  const invoice = {
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
     .text(`Rechnungsnummer: ${invoice.invoice_number}`, 50, 130)
     .text(`Datum: ${invoice.created_at.toLocaleDateString('de-DE')}`, 50, 145)
     .text(`Fällig bis: ${invoice.due_date.toLocaleDateString('de-DE')}`, 50, 160);
  
  // Add craftsman details
  doc.fontSize(12)
     .text('Handwerker:', 300, 110)
     .fontSize(10)
     .text(invoice.craftsman.name, 300, 130)
     .text(invoice.craftsman.company, 300, 145)
     .text(invoice.craftsman.address, 300, 160)
     .text(`Tel: ${invoice.craftsman.phone}`, 300, 175)
     .text(`Email: ${invoice.craftsman.email}`, 300, 190)
     .text(`USt-IdNr: ${invoice.craftsman.tax_id}`, 300, 205);
  
  // Add customer details
  doc.fontSize(12)
     .text('Kunde:', 50, 200)
     .fontSize(10)
     .text(invoice.customer.name, 50, 220)
     .text(invoice.customer.address, 50, 235)
     .text(`Tel: ${invoice.customer.phone}`, 50, 250)
     .text(`Email: ${invoice.customer.email}`, 50, 265);
  
  // Add table header
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
  invoice.items.forEach((item, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      doc.rect(50, y - 5, 500, 25).fillColor('#f5f5f5').fill();
    }
    
    doc.fillColor('#000')
       .text(item.description, 60, y)
       .text(item.quantity.toString(), 300, y)
       .text(`€${item.unit_price.toFixed(2)}`, 350, y)
       .text(`€${item.total.toFixed(2)}`, 450, y);
    
    y += 25;
  });
  
  // Add totals
  y += 20;
  doc.text('Zwischensumme:', 350, y)
     .text(`€${invoice.amount.toFixed(2)}`, 450, y);
  
  y += 20;
  doc.text(`MwSt. (${invoice.tax_rate}%):`, 350, y)
     .text(`€${invoice.tax_amount.toFixed(2)}`, 450, y);
  
  y += 20;
  doc.fontSize(12)
     .text('Gesamtbetrag:', 350, y)
     .text(`€${invoice.total_amount.toFixed(2)}`, 450, y);
  
  // Add notes
  y += 50;
  doc.fontSize(10)
     .text('Hinweise:', 50, y)
     .text(invoice.notes, 50, y + 20, { width: 500 });
  
  // Add footer
  const footerY = doc.page.height - 50;
  doc.fontSize(8)
     .fillColor('#666')
     .text('ZIMMR GmbH • Musterstraße 123 • 12345 Berlin • Deutschland', 50, footerY, { align: 'center', width: 500 })
     .text('Tel: +49 123 456789 • Email: info@zimmr.de • Web: www.zimmr.de', 50, footerY + 15, { align: 'center', width: 500 });
  
  // Finalize the PDF
  doc.end();
  
  console.log(`PDF generated successfully at: ${outputPath}`);
  return outputPath;
}

// Generate a test invoice
const pdfPath = generateTestInvoice();
console.log(`Test invoice PDF generated at: ${pdfPath}`);
