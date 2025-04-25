const express = require('express');
const router = express.Router();
const { 
  authenticateToken 
} = require('../middleware/auth');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatuses
} = require('../controllers/invoicesController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Simple test route that doesn't require the controller
router.get('/test', (req, res) => {
  res.json({ message: 'Invoice routes are working' });
});

// GET all invoices
router.get('/', getAllInvoices);

// GET invoice by ID
router.get('/:id', getInvoiceById);

// POST new invoice
router.post('/', createInvoice);

// PUT update invoice
router.put('/:id', updateInvoice);

// POST to manually check and update invoice statuses
router.post('/check-overdue', async (req, res) => {
  try {
    const updatedInvoices = await updateInvoiceStatuses();
    res.json({
      success: true,
      message: `Checked for overdue invoices. Updated ${updatedInvoices.length} invoices.`,
      updatedInvoices
    });
  } catch (error) {
    console.error('Error in manual invoice status check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check invoice statuses'
    });
  }
});

// Export the router
module.exports = router;
