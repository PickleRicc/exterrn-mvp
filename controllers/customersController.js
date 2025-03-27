const pool = require('../db');

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const { name, phone, service_type } = req.query;
    
    let query = 'SELECT * FROM customers';
    const queryParams = [];
    const conditions = [];
    
    if (name) {
      queryParams.push(`%${name}%`);
      conditions.push(`name ILIKE $${queryParams.length}`);
    }
    
    if (phone) {
      queryParams.push(`%${phone}%`);
      conditions.push(`phone ILIKE $${queryParams.length}`);
    }
    
    if (service_type) {
      queryParams.push(`%${service_type}%`);
      conditions.push(`service_type ILIKE $${queryParams.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM customers WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const { name, phone, service_type } = req.body;
    
    const result = await pool.query(`
      INSERT INTO customers (name, phone, service_type)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, phone, service_type]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, service_type } = req.body;
    
    const result = await pool.query(`
      UPDATE customers
      SET name = $1, phone = $2, service_type = $3
      WHERE id = $4
      RETURNING *
    `, [name, phone, service_type, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Begin a transaction
    await pool.query('BEGIN');
    
    // First delete all appointments for this customer
    await pool.query('DELETE FROM appointments WHERE customer_id = $1', [id]);
    
    // Then delete the customer
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Commit the transaction
    await pool.query('COMMIT');
    
    res.json({ message: 'Customer and all related appointments deleted successfully', customer: result.rows[0] });
  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get customer appointments
const getCustomerAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if customer exists
    const customerCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const result = await pool.query(`
      SELECT * FROM appointments
      WHERE customer_id = $1
      ORDER BY scheduled_at DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer appointments:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAppointments
};
