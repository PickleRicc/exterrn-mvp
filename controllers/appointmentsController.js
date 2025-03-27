const pool = require('../db');

// Get all appointments with customer data
const getAllAppointments = async (req, res) => {
  try {
    const { date } = req.query;
    
    let queryText = `
      SELECT a.*, c.name as customer_name, c.phone as customer_phone, c.service_type
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
    `;
    
    const queryParams = [];
    
    if (date) {
      queryParams.push(date);
      queryText += ` WHERE DATE(scheduled_at) = $1`;
    }
    
    queryText += ` ORDER BY a.scheduled_at DESC`;
    
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT a.*, c.name as customer_name, c.phone as customer_phone, c.service_type
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new appointment
const createAppointment = async (req, res) => {
  try {
    const { customer_id, scheduled_at, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO appointments (customer_id, scheduled_at, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [customer_id, scheduled_at, notes]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, notes } = req.body;
    
    const result = await pool.query(`
      UPDATE appointments
      SET scheduled_at = $1, notes = $2
      WHERE id = $3
      RETURNING *
    `, [scheduled_at, notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully', appointment: result.rows[0] });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
