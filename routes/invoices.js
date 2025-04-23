const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceItems,
  convertQuoteToInvoice,
  generatePdf,
  previewPdf
} = require('../controllers/invoicesController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all invoices
router.get('/', getAllInvoices);

// GET invoice by ID
router.get('/:id', getInvoiceById);

// POST new invoice
router.post('/', createInvoice);

// PUT update invoice
router.put('/:id', updateInvoice);

// DELETE invoice
router.delete('/:id', deleteInvoice);

// GET invoice items
router.get('/:invoice_id/items', getInvoiceItems);

// POST convert quote to invoice
router.post('/:id/convert-to-invoice', convertQuoteToInvoice);

// GET generate PDF
router.get('/:id/pdf', generatePdf);

// GET preview PDF
router.get('/:id/pdf-preview', previewPdf);

module.exports = router;
