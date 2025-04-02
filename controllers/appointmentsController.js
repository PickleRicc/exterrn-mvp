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
    const { customer_id, scheduled_at, notes, craftsman_id, duration, location, status } = req.body;
    
    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    
    if (!scheduled_at) {
      return res.status(400).json({ error: 'scheduled_at is required' });
    }
    
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO appointments (customer_id, scheduled_at, notes, craftsman_id, duration, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [customer_id, scheduled_at, notes || '', craftsman_id, duration || 60, location || '', status || 'scheduled']);
    
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
    const { scheduled_at, notes, craftsman_id, customer_id, duration, location, status } = req.body;
    
    // Build the update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (scheduled_at) {
      updates.push(`scheduled_at = $${paramIndex++}`);
      values.push(scheduled_at);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    
    if (craftsman_id) {
      updates.push(`craftsman_id = $${paramIndex++}`);
      values.push(craftsman_id);
    }
    
    if (customer_id) {
      updates.push(`customer_id = $${paramIndex++}`);
      values.push(customer_id);
    }
    
    if (duration) {
      updates.push(`duration = $${paramIndex++}`);
      values.push(duration);
    }
    
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add the ID parameter
    values.push(id);
    
    const result = await pool.query(`
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
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
