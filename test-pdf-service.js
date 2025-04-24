const { generateTestInvoicePdf } = require('./services/pdfService');

// Test the PDF generation
async function testPdfGeneration() {
  try {
    console.log('Generating test invoice PDF...');
    const result = await generateTestInvoicePdf();
    console.log('PDF generated successfully!');
    console.log(`PDF saved to: ${result.path}`);
    console.log(`Filename: ${result.filename}`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

// Run the test
testPdfGeneration();
