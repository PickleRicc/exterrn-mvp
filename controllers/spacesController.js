const pool = require('../db');

// Get all customer spaces with optional filtering
const getAllSpaces = async (req, res) => {
  try {
    const { customer_id, type } = req.query;
    
    let query = `
      SELECT cs.*, c.name as customer_name, c.email as customer_email
      FROM customer_spaces cs
      JOIN customers c ON cs.customer_id = c.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add filters if provided
    if (customer_id) {
      query += ` AND cs.customer_id = $${paramIndex}`;
      queryParams.push(customer_id);
      paramIndex++;
    }
    
    if (type) {
      query += ` AND cs.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }
    
    // Check if user is a craftsman and filter by craftsman_id
    if (req.user && req.user.role === 'craftsman' && req.user.craftsmanId) {
      query += ` AND c.craftsman_id = $${paramIndex}`;
      queryParams.push(req.user.craftsmanId);
      paramIndex++;
    }
    
    query += ` ORDER BY c.name, cs.name`;
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting customer spaces:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single customer space by ID
const getSpaceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT cs.*, c.name as customer_name, c.email as customer_email
       FROM customer_spaces cs
       JOIN customers c ON cs.customer_id = c.id
       WHERE cs.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer space not found' });
    }
    
    // Check if user is a craftsman and has access to this customer
    if (req.user && req.user.role === 'craftsman' && req.user.craftsmanId) {
      const customerCheck = await pool.query(
        'SELECT * FROM customers WHERE id = $1 AND craftsman_id = $2',
        [result.rows[0].customer_id, req.user.craftsmanId]
      );
      
      if (customerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this customer space' });
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting customer space:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new customer space
const createSpace = async (req, res) => {
  try {
    const { 
      customer_id, 
      name, 
      type, 
      area_sqm, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!customer_id || !name || !type) {
      return res.status(400).json({ error: 'Customer ID, name, and type are required' });
    }
    
    // Check if user is a craftsman and has access to this customer
    if (req.user && req.user.role === 'craftsman' && req.user.craftsmanId) {
      const customerCheck = await pool.query(
        'SELECT * FROM customers WHERE id = $1 AND craftsman_id = $2',
        [customer_id, req.user.craftsmanId]
      );
      
      if (customerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this customer' });
      }
    }
    
    const result = await pool.query(
      `INSERT INTO customer_spaces 
       (customer_id, name, type, area_sqm, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [customer_id, name, type, area_sqm, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer space:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update a customer space
const updateSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      area_sqm, 
      notes 
    } = req.body;
    
    // Check if space exists and get customer_id
    const checkResult = await pool.query(
      'SELECT * FROM customer_spaces WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer space not found' });
    }
    
    const customer_id = checkResult.rows[0].customer_id;
    
    // Check if user is a craftsman and has access to this customer
    if (req.user && req.user.role === 'craftsman' && req.user.craftsmanId) {
      const customerCheck = await pool.query(
        'SELECT * FROM customers WHERE id = $1 AND craftsman_id = $2',
        [customer_id, req.user.craftsmanId]
      );
      
      if (customerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this customer' });
      }
    }
    
    // Build dynamic update query
    let query = 'UPDATE customer_spaces SET ';
    const queryParams = [];
    const updateFields = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(name);
      paramIndex++;
    }
    
    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (area_sqm !== undefined) {
      updateFields.push(`area_sqm = $${paramIndex}`);
      queryParams.push(area_sqm);
      paramIndex++;
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      queryParams.push(notes);
      paramIndex++;
    }
    
    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    query += updateFields.join(', ');
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    queryParams.push(id);
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer space:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a customer space
const deleteSpace = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if space exists and get customer_id
    const checkResult = await pool.query(
      'SELECT * FROM customer_spaces WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer space not found' });
    }
    
    const customer_id = checkResult.rows[0].customer_id;
    
    // Check if user is a craftsman and has access to this customer
    if (req.user && req.user.role === 'craftsman' && req.user.craftsmanId) {
      const customerCheck = await pool.query(
        'SELECT * FROM customers WHERE id = $1 AND craftsman_id = $2',
        [customer_id, req.user.craftsmanId]
      );
      
      if (customerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this customer' });
      }
    }
    
    const result = await pool.query(
      'DELETE FROM customer_spaces WHERE id = $1 RETURNING *',
      [id]
    );
    
    res.json({ message: 'Customer space deleted successfully', space: result.rows[0] });
  } catch (error) {
    console.error('Error deleting customer space:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get spaces by customer ID
const getSpacesByCustomerId = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is a craftsman and has access to this customer
    if (req.user && req.user.role === 'craftsman' && req.user.craftsmanId) {
      const customerCheck = await pool.query(
        'SELECT * FROM customers WHERE id = $1 AND craftsman_id = $2',
        [id, req.user.craftsmanId]
      );
      
      if (customerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this customer' });
      }
    }
    
    const result = await pool.query(
      `SELECT * FROM customer_spaces 
       WHERE customer_id = $1
       ORDER BY name`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting customer spaces:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  deleteSpace,
  getSpacesByCustomerId
};
