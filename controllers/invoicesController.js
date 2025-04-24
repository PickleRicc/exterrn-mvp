const pool = require('../db');

// Get all invoices with optional filters
const getAllInvoices = async (req, res) => {
  try {
    const { craftsman_id } = req.query;
    
    let query = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (craftsman_id) {
      query += ` AND i.craftsman_id = $${paramIndex}`;
      queryParams.push(craftsman_id);
      paramIndex++;
    }
    
    query += ` ORDER BY i.created_at DESC`;
    
    const result = await pool.query(query, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Get invoice with customer details
    const invoiceQuery = `
      SELECT i.*, c.name as customer_name, c.address as customer_address, 
             c.phone as customer_phone, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1 AND i.craftsman_id = $2
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [id, craftsman_id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to access it' });
    }
    
    res.json(invoiceResult.rows[0]);
  } catch (error) {
    console.error(`Error getting invoice ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Create new invoice
const createInvoice = async (req, res) => {
  try {
    const {
      craftsman_id,
      customer_id,
      amount,
      tax_amount,
      total_amount,
      notes,
      due_date
    } = req.body;
    
    // Validate required fields
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    
    if (!amount || !total_amount) {
      return res.status(400).json({ error: 'amount and total_amount are required' });
    }
    
    // Create invoice
    const query = `
      INSERT INTO invoices (
        craftsman_id, customer_id, amount, tax_amount, total_amount, notes, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      craftsman_id,
      customer_id,
      amount,
      tax_amount || 0,
      total_amount,
      notes || '',
      due_date || null
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update invoice
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      craftsman_id,
      customer_id,
      amount,
      tax_amount,
      total_amount,
      notes,
      due_date,
      status
    } = req.body;
    
    // Validate required fields
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to craftsman
    const checkQuery = `
      SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, craftsman_id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to update it' });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [id, craftsman_id]; // $1 = id, $2 = craftsman_id
    let paramIndex = 3;
    
    if (customer_id) {
      updateFields.push(`customer_id = $${paramIndex}`);
      values.push(customer_id);
      paramIndex++;
    }
    
    if (amount !== undefined) {
      updateFields.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }
    
    if (tax_amount !== undefined) {
      updateFields.push(`tax_amount = $${paramIndex}`);
      values.push(tax_amount);
      paramIndex++;
    }
    
    if (total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramIndex}`);
      values.push(total_amount);
      paramIndex++;
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }
    
    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex}`);
      values.push(due_date || null);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // If no fields to update, return the existing invoice
    if (updateFields.length === 1) {
      return res.json(checkResult.rows[0]);
    }
    
    // Execute update query
    const updateQuery = `
      UPDATE invoices
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND craftsman_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating invoice ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice
};
