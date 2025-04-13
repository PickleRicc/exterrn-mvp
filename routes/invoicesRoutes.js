const express = require('express');
const router = express.Router();
const invoicesController = require('../controllers/invoicesController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /invoices - Get all invoices with optional filtering
router.get('/', invoicesController.getAllInvoices);

// GET /invoices/:id - Get a single invoice by ID
router.get('/:id', invoicesController.getInvoiceById);

// POST /invoices - Create a new invoice
router.post('/', invoicesController.createInvoice);

// PUT /invoices/:id - Update an existing invoice
router.put('/:id', invoicesController.updateInvoice);

// DELETE /invoices/:id - Delete an invoice
router.delete('/:id', invoicesController.deleteInvoice);

// GET /invoices/:id/pdf - Generate PDF for an invoice
router.get('/:id/pdf', invoicesController.generateInvoicePDFEndpoint);

// POST /invoices/:id/send - Send invoice by email
router.post('/:id/send', invoicesController.sendInvoiceEmailEndpoint);

// POST /appointments/:id/complete - Complete appointment and create invoice
router.post('/appointments/:id/complete', invoicesController.completeAppointmentAndCreateInvoice);

module.exports = router;
