const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  getAllCraftsmen, 
  getCraftsmanById, 
  updateCraftsman, 
  getCraftsmanAppointments,
  checkCraftsmanAvailability,
  checkCraftsmanAvailabilityWithAlternatives
} = require('../controllers/craftsmenController');

// Get all craftsmen (public)
router.get('/', getAllCraftsmen);

// Get craftsman by ID (public)
router.get('/:id', getCraftsmanById);

// Check craftsman availability (public)
router.get('/:id/availability', checkCraftsmanAvailability);

// Check craftsman availability with alternatives (public)
router.get('/:id/availability-check', checkCraftsmanAvailabilityWithAlternatives);

// Protected routes
router.use(authenticateToken);

// Update craftsman (protected)
router.put('/:id', updateCraftsman);

// Get craftsman appointments (protected)
router.get('/:id/appointments', getCraftsmanAppointments);

module.exports = router;
