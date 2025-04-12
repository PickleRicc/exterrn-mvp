const pool = require('../db');

// Get all materials with optional filtering
const getAllMaterials = async (req, res) => {
  try {
    const { category, craftsman_id, in_stock } = req.query;
    
    let query = `
      SELECT * FROM materials
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
    
    if (craftsman_id) {
      query += ` AND (craftsman_id = $${paramIndex} OR craftsman_id IS NULL)`;
      queryParams.push(craftsman_id);
      paramIndex++;
    }
    
    if (in_stock !== undefined) {
      const inStockValue = in_stock === 'true';
      query += ` AND in_stock = $${paramIndex}`;
      queryParams.push(inStockValue);
      paramIndex++;
    }
    
    query += ` ORDER BY category, name`;
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting materials:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single material by ID
const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM materials WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting material:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new material
const createMaterial = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price_per_unit, 
      unit_type, 
      category, 
      in_stock, 
      craftsman_id 
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Default values
    const defaultCategory = category || 'Tiling';
    const defaultUnitType = unit_type || 'sqm';
    
    const result = await pool.query(
      `INSERT INTO materials 
       (name, description, price_per_unit, unit_type, category, in_stock, craftsman_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name, 
        description, 
        price_per_unit, 
        defaultUnitType, 
        defaultCategory, 
        in_stock !== undefined ? in_stock : true, 
        craftsman_id
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update a material
const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price_per_unit, 
      unit_type, 
      category, 
      in_stock, 
      craftsman_id 
    } = req.body;
    
    // Check if material exists
    const checkResult = await pool.query(
      'SELECT * FROM materials WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    // Build dynamic update query
    let query = 'UPDATE materials SET ';
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
    
    if (price_per_unit !== undefined) {
      updateFields.push(`price_per_unit = $${paramIndex}`);
      queryParams.push(price_per_unit);
      paramIndex++;
    }
    
    if (unit_type !== undefined) {
      updateFields.push(`unit_type = $${paramIndex}`);
      queryParams.push(unit_type);
      paramIndex++;
    }
    
    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }
    
    if (in_stock !== undefined) {
      updateFields.push(`in_stock = $${paramIndex}`);
      queryParams.push(in_stock);
      paramIndex++;
    }
    
    if (craftsman_id !== undefined) {
      updateFields.push(`craftsman_id = $${paramIndex}`);
      queryParams.push(craftsman_id);
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
    console.error('Error updating material:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a material
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if material is used in any appointments
    const checkResult = await pool.query(
      'SELECT * FROM appointment_materials WHERE material_id = $1 LIMIT 1',
      [id]
    );
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete material that is used in appointments' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM materials WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({ message: 'Material deleted successfully', material: result.rows[0] });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get materials by craftsman ID
const getMaterialsByCraftsmanId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM materials 
       WHERE craftsman_id = $1 OR craftsman_id IS NULL
       ORDER BY category, name`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting craftsman materials:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialsByCraftsmanId
};
