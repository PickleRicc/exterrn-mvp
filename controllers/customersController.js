const pool = require('../db');

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const { name, phone, service_type, craftsman_id } = req.query;
    
    console.log('Request query params:', req.query);
    console.log('Craftsman ID from query:', craftsman_id);
    console.log('User from request:', req.user ? { id: req.user.id, role: req.user.role, craftsmanId: req.user.craftsmanId } : 'No user');
    
    let query = 'SELECT * FROM customers';
    const queryParams = [];
    const conditions = [];
    
    // Get the craftsman ID from the authenticated user if not provided
    const userId = req.user?.id;
    let craftsmanIdToUse = craftsman_id;
    
    // If craftsman_id is provided as a query parameter, use it
    if (craftsman_id) {
      // Convert string to number if it's a numeric string
      const craftsmanIdNumber = parseInt(craftsman_id, 10);
      if (!isNaN(craftsmanIdNumber)) {
        queryParams.push(craftsmanIdNumber);
      } else {
        queryParams.push(craftsman_id);
      }
      conditions.push(`craftsman_id = $${queryParams.length}`);
      console.log('Using craftsman_id from query params:', craftsman_id);
    }
    // If no craftsman_id is provided but we have a user ID, try to get their craftsman ID
    else if (userId) {
      // First check if this user is a craftsman
      const craftsmanResult = await pool.query(
        'SELECT id FROM craftsmen WHERE user_id = $1',
        [userId]
      );
      
      if (craftsmanResult.rows.length > 0) {
        craftsmanIdToUse = craftsmanResult.rows[0].id;
        queryParams.push(craftsmanIdToUse);
        conditions.push(`craftsman_id = $${queryParams.length}`);
        console.log('Using craftsman_id from user authentication:', craftsmanIdToUse);
      } else {
        console.log('User is not a craftsman, no craftsman_id filter applied');
      }
    } else {
      console.log('No craftsman_id provided and no authenticated user, no filter applied');
    }
    
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
    
    console.log('Final SQL query:', query);
    console.log('Query parameters:', queryParams);
    
    const result = await pool.query(query, queryParams);
    console.log('Query returned', result.rows.length, 'customers');
    
    // Always return an array, even if empty
    if (!result.rows) {
      console.log('Result rows is null or undefined, returning empty array');
      return res.json([]);
    }
    
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
    const { name, phone, email, address, service_type } = req.body;
    let { craftsman_id } = req.body;
    
    // If craftsman_id is not provided in the request body, try to get it from the authenticated user
    if (!craftsman_id && req.user) {
      const craftsmanResult = await pool.query(
        'SELECT id FROM craftsmen WHERE user_id = $1',
        [req.user.id]
      );
      
      if (craftsmanResult.rows.length > 0) {
        craftsman_id = craftsmanResult.rows[0].id;
      } else {
        return res.status(400).json({ error: 'Craftsman ID is required' });
      }
    }
    
    // Ensure craftsman_id is provided
    if (!craftsman_id) {
      return res.status(400).json({ error: 'Craftsman ID is required' });
    }
    
    // Check if the craftsman exists
    const craftsmanCheck = await pool.query('SELECT id FROM craftsmen WHERE id = $1', [craftsman_id]);
    if (craftsmanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    const result = await pool.query(`
      INSERT INTO customers (name, phone, email, address, service_type, craftsman_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, phone, email || null, address || null, service_type || null, craftsman_id]);
    
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
    const { name, phone, email, address, service_type } = req.body;
    
    // First check if the customer exists and belongs to the current craftsman
    let customerCheck;
    if (req.user) {
      const craftsmanResult = await pool.query(
        'SELECT id FROM craftsmen WHERE user_id = $1',
        [req.user.id]
      );
      
      if (craftsmanResult.rows.length > 0) {
        const craftsmanId = craftsmanResult.rows[0].id;
        customerCheck = await pool.query(
          'SELECT * FROM customers WHERE id = $1 AND craftsman_id = $2',
          [id, craftsmanId]
        );
      }
    } else {
      customerCheck = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    }
    
    if (!customerCheck || customerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found or you do not have permission to update this customer' });
    }
    
    // Keep the existing craftsman_id to maintain the association
    const existingCustomer = customerCheck.rows[0];
    
    const result = await pool.query(`
      UPDATE customers
      SET name = $1, phone = $2, email = $3, address = $4, service_type = $5
      WHERE id = $6
      RETURNING *
    `, [
      name || existingCustomer.name, 
      phone || existingCustomer.phone, 
      email !== undefined ? email : existingCustomer.email,
      address !== undefined ? address : existingCustomer.address,
      service_type !== undefined ? service_type : existingCustomer.service_type,
      id
    ]);
    
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
    
    // Check if the customer exists and belongs to the current craftsman
    let customerCheck;
    if (req.user) {
      const craftsmanResult = await pool.query(
        'SELECT id FROM craftsmen WHERE user_id = $1',
        [req.user.id]
      );
      
      if (craftsmanResult.rows.length > 0) {
        const craftsmanId = craftsmanResult.rows[0].id;
        customerCheck = await pool.query(
          'SELECT * FROM customers WHERE id = $1 AND craftsman_id = $2',
          [id, craftsmanId]
        );
      }
    } else {
      customerCheck = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    }
    
    if (!customerCheck || customerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found or you do not have permission to delete this customer' });
    }
    
    // Begin a transaction
    await pool.query('BEGIN');
    
    // First delete all appointments for this customer
    await pool.query('DELETE FROM appointments WHERE customer_id = $1', [id]);
    
    // Then delete the customer
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    
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
    
    console.log('Found', result.rows.length, 'appointments for customer', id);
    
    // Always return an array, even if empty
    res.json(result.rows || []);
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
