const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const invoicesController = require('../controllers/invoicesController');
const path = require('path');

// Route to generate a PDF for a specific invoice
router.get('/:id/pdf', auth, invoicesController.generatePdf);

// Route to preview a PDF for a specific invoice (returns URL)
router.get('/:id/pdf-preview', auth, invoicesController.previewPdf);

// Route to generate a test PDF with sample data
router.get('/test-pdf', auth, invoicesController.generateTestPdf);

// Route to serve PDF files
router.get('/pdf-files/:filename', auth, (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'pdf-output', filename);
  res.sendFile(filePath);
});

module.exports = router;
