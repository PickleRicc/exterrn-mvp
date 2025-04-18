const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
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

module.exports = router;
