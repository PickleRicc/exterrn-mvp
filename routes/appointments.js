const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  approveAppointment,
  rejectAppointment
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

module.exports = router;
