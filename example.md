// Simple PDF generation example
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Create a document
const doc = new PDFDocument();

// Pipe its output somewhere, like to a file
doc.pipe(fs.createWriteStream('output.pdf'));

// Add some content
doc.fontSize(25)
   .text('Hello, World!', 100, 100);

// Add another page
doc.addPage()
   .fontSize(25)
   .text('Here is another page!', 100, 100);

// Add some images (if needed, uncomment and provide a valid image path)
// doc.image('path/to/image.png', {
//   fit: [250, 300],
//   align: 'center',
//   valign: 'center'
// });

// Add some styling
doc.addPage()
   .fillColor('blue')
   .fontSize(20)
   .text('This text is blue and larger', 100, 100)
   .underline(100, 100, 300, 20, {color: 'blue'})
   .link(100, 100, 300, 20, 'https://pdfkit.org/');

// Finalize the PDF and end the stream
doc.end();

console.log('PDF created successfully!');


// Table creation example with PDFKit
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Create a document
const doc = new PDFDocument({margin: 50});

// Pipe its output somewhere, like to a file
doc.pipe(fs.createWriteStream('table-output.pdf'));

// Add a title
doc.fontSize(25).text('Simple Table Example', {align: 'center'});
doc.moveDown();

// Table data
const tableData = [
  ['Name', 'Email', 'Country'],
  ['John Doe', 'john@example.com', 'USA'],
  ['Jane Smith', 'jane@example.com', 'Canada'],
  ['Bob Johnson', 'bob@example.com', 'UK'],
  ['Alice Brown', 'alice@example.com', 'Australia']
];

// Table configuration
const startX = 50;
const startY = 150;
const rowHeight = 30;
const colWidth = 150;

// Draw table headers
doc.font('Helvetica-Bold');
tableData[0].forEach((header, i) => {
  doc.text(header, startX + i * colWidth, startY, {width: colWidth, align: 'center'});
});

// Draw table rows
doc.font('Helvetica');
for (let i = 1; i < tableData.length; i++) {
  const row = tableData[i];
  
  // Draw row background (alternating colors)
  if (i % 2 === 0) {
    doc.fillColor('#f0f0f0')
       .rect(startX, startY + i * rowHeight, colWidth * 3, rowHeight)
       .fill();
  }
  
  // Draw row content
  doc.fillColor('black');
  row.forEach((cell, j) => {
    doc.text(cell, startX + j * colWidth, startY + i * rowHeight + 7, {
      width: colWidth,
      align: 'center'
    });
  });
}

// Draw table border
doc.rect(startX, startY, colWidth * 3, rowHeight * tableData.length).stroke();

// Draw vertical lines
for (let i = 1; i < 3; i++) {
  doc.moveTo(startX + i * colWidth, startY)
     .lineTo(startX + i * colWidth, startY + rowHeight * tableData.length)
     .stroke();
}

// Draw horizontal lines
for (let i = 1; i < tableData.length; i++) {
  doc.moveTo(startX, startY + i * rowHeight)
     .lineTo(startX + colWidth * 3, startY + i * rowHeight)
     .stroke();
}

// Finalize the PDF and end the stream
doc.end();

console.log('Table PDF created successfully!');
