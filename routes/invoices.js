const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  generatePdf
} = require('../controllers/invoicesController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all invoices
router.get('/', getAllInvoices);

// GET invoice by ID
router.get('/:id', getInvoiceById);

// POST new invoice
router.post('/', createInvoice);

// GET generate PDF
router.get('/:id/pdf', generatePdf);

module.exports = router;
