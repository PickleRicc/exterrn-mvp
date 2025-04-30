const express = require('express');
const router = express.Router();
const materialsController = require('../controllers/materialsController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all materials with optional filtering
router.get('/', materialsController.getAllMaterials);

// Get a single material by ID
router.get('/:id', materialsController.getMaterialById);

// Create a new material
router.post('/', materialsController.createMaterial);

// Update a material
router.put('/:id', materialsController.updateMaterial);

// Delete a material
router.delete('/:id', materialsController.deleteMaterial);

// Get materials by craftsman ID
router.get('/craftsman/:id', materialsController.getMaterialsByCraftsmanId);

module.exports = router;
