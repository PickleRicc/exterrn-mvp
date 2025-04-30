const express = require('express');
const router = express.Router();
const spacesController = require('../controllers/spacesController');
const authenticateToken = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all customer spaces with optional filtering
router.get('/', spacesController.getAllSpaces);

// Get a single customer space by ID
router.get('/:id', spacesController.getSpaceById);

// Create a new customer space
router.post('/', spacesController.createSpace);

// Update a customer space
router.put('/:id', spacesController.updateSpace);

// Delete a customer space
router.delete('/:id', spacesController.deleteSpace);

// Get spaces by customer ID
router.get('/customer/:id', spacesController.getSpacesByCustomerId);

module.exports = router;
