const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAppointments
} = require('../controllers/customersController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all customers
router.get('/', getAllCustomers);

// GET customer by ID
router.get('/:id', getCustomerById);

// POST new customer
router.post('/', createCustomer);

// PUT update customer
router.put('/:id', updateCustomer);

// DELETE customer
router.delete('/:id', deleteCustomer);

// GET customer appointments
router.get('/:id/appointments', getCustomerAppointments);

module.exports = router;
