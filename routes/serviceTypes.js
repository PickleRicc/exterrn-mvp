const express = require('express');
const router = express.Router();
const serviceTypesController = require('../controllers/serviceTypesController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all service types with optional filtering
router.get('/', serviceTypesController.getAllServiceTypes);

// Get a single service type by ID
router.get('/:id', serviceTypesController.getServiceTypeById);

// Create a new service type (admin only)
router.post('/', serviceTypesController.createServiceType);

// Update a service type (admin only)
router.put('/:id', serviceTypesController.updateServiceType);

// Delete a service type (admin only)
router.delete('/:id', serviceTypesController.deleteServiceType);

// Get service types by category
router.get('/category/:category', serviceTypesController.getServiceTypesByCategory);

module.exports = router;
