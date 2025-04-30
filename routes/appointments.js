const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  approveAppointment,
  rejectAppointment,
  completeAppointment
} = require('../controllers/appointmentsController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all appointments
router.get('/', getAllAppointments);

// GET appointment by ID
router.get('/:id', getAppointmentById);

// POST new appointment
router.post('/', createAppointment);

// PUT update appointment
router.put('/:id', updateAppointment);

// DELETE appointment
router.delete('/:id', deleteAppointment);

// PUT approve appointment
router.put('/:id/approve', approveAppointment);

// PUT reject appointment
router.put('/:id/reject', rejectAppointment);

// PUT complete appointment
router.put('/:id/complete', completeAppointment);

// Comment out these routes as the controller functions don't exist
// // GET appointment materials
// router.get('/:id/materials', getAppointmentMaterials);

// // PUT update appointment materials
// router.put('/:id/materials', updateAppointmentMaterials);

module.exports = router;
