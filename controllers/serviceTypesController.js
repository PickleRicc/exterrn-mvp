const pool = require('../db');

// Get all service types with optional filtering
const getAllServiceTypes = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT * FROM service_types
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add filters if provided
    if (category) {
      query += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }
    
    query += ` ORDER BY category, name`;
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting service types:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single service type by ID
const getServiceTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM service_types WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service type not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting service type:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new service type (admin only)
const createServiceType = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create service types' });
    }
    
    const { 
      name, 
      description, 
      default_duration, 
      category 
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Default values
    const defaultCategory = category || 'Tiling';
    
    const result = await pool.query(
      `INSERT INTO service_types 
       (name, description, default_duration, category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        name, 
        description, 
        default_duration || 60, 
        defaultCategory
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating service type:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update a service type (admin only)
const updateServiceType = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update service types' });
    }
    
    const { id } = req.params;
    const { 
      name, 
      description, 
      default_duration, 
      category 
    } = req.body;
    
    // Check if service type exists
    const checkResult = await pool.query(
      'SELECT * FROM service_types WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service type not found' });
    }
    
    // Build dynamic update query
    let query = 'UPDATE service_types SET ';
    const queryParams = [];
    const updateFields = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(name);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      queryParams.push(description);
      paramIndex++;
    }
    
    if (default_duration !== undefined) {
      updateFields.push(`default_duration = $${paramIndex}`);
      queryParams.push(default_duration);
      paramIndex++;
    }
    
    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      queryParams.push(category);
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
    console.error('Error updating service type:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a service type (admin only)
const deleteServiceType = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete service types' });
    }
    
    const { id } = req.params;
    
    // Check if service type is used in any appointments
    const checkResult = await pool.query(
      'SELECT * FROM appointments WHERE service_type = (SELECT name FROM service_types WHERE id = $1) LIMIT 1',
      [id]
    );
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete service type that is used in appointments' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM service_types WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service type not found' });
    }
    
    res.json({ message: 'Service type deleted successfully', serviceType: result.rows[0] });
  } catch (error) {
    console.error('Error deleting service type:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get service types by category
const getServiceTypesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM service_types 
       WHERE category = $1
       ORDER BY name`,
      [category]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting service types by category:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  getServiceTypesByCategory
};
