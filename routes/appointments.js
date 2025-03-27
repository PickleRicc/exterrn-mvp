const express = require('express');
const router = express.Router();
const { createAppointment } = require('../controllers/appointmentsController');

router.post('/seed-appointment', createAppointment);

module.exports = router;
