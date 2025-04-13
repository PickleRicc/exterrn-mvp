const pool = require('../db');

// Get all invoices with filtering options
const getAllInvoices = async (req, res) => {
  try {
    const { craftsman_id, customer_id, status } = req.query;
    
    let queryText = `
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    let whereClauseAdded = false;
    
    if (craftsman_id) {
      queryParams.push(craftsman_id);
      queryText += ` WHERE i.craftsman_id = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    if (customer_id) {
      queryParams.push(customer_id);
      queryText += whereClauseAdded ? ` AND i.customer_id = $${paramIndex++}` : ` WHERE i.customer_id = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    if (status) {
      queryParams.push(status);
      queryText += whereClauseAdded ? ` AND i.status = $${paramIndex++}` : ` WHERE i.status = $${paramIndex++}`;
    }
    
    queryText += ` ORDER BY i.created_at DESC`;
    
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new invoice
const createInvoice = async (req, res) => {
  try {
    const { 
      appointment_id, 
      craftsman_id, 
      customer_id, 
      invoice_number, 
      amount, 
      tax_amount, 
      status, 
      payment_link, 
      due_date, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!appointment_id) {
      return res.status(400).json({ error: 'appointment_id is required' });
    }
    
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }
    
    // Generate invoice number if not provided
    const generatedInvoiceNumber = invoice_number || `INV-${Date.now()}`;
    
    // Calculate tax amount if not provided
    const calculatedTaxAmount = tax_amount || 0;
    
    // Calculate total amount (amount + tax_amount)
    const totalAmount = parseFloat(amount) + parseFloat(calculatedTaxAmount);
    
    const result = await pool.query(`
      INSERT INTO invoices (
        appointment_id, 
        craftsman_id, 
        customer_id, 
        invoice_number, 
        amount, 
        tax_amount,
        total_amount,
        status, 
        payment_link, 
        due_date, 
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      appointment_id, 
      craftsman_id, 
      customer_id, 
      generatedInvoiceNumber, 
      amount, 
      calculatedTaxAmount,
      totalAmount,
      status || 'pending', 
      payment_link || null, 
      due_date || null, 
      notes || null
    ]);
    
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
      amount, 
      tax_amount, 
      status, 
      payment_link, 
      due_date, 
      notes 
    } = req.body;
    
    // Check if invoice exists
    const checkResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Build dynamic update query
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Track if we need to update total_amount
    let newAmount = undefined;
    let newTaxAmount = undefined;
    
    if (amount !== undefined) {
      updateFields.push(`amount = $${paramIndex++}`);
      queryParams.push(amount);
      newAmount = parseFloat(amount);
    }
    
    if (tax_amount !== undefined) {
      updateFields.push(`tax_amount = $${paramIndex++}`);
      queryParams.push(tax_amount);
      newTaxAmount = parseFloat(tax_amount);
    }
    
    // Calculate new total_amount if either amount or tax_amount changed
    if (newAmount !== undefined || newTaxAmount !== undefined) {
      const currentInvoice = checkResult.rows[0];
      const updatedAmount = newAmount !== undefined ? newAmount : parseFloat(currentInvoice.amount);
      const updatedTaxAmount = newTaxAmount !== undefined ? newTaxAmount : parseFloat(currentInvoice.tax_amount || 0);
      const newTotalAmount = updatedAmount + updatedTaxAmount;
      
      updateFields.push(`total_amount = $${paramIndex++}`);
      queryParams.push(newTotalAmount);
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }
    
    if (payment_link !== undefined) {
      updateFields.push(`payment_link = $${paramIndex++}`);
      queryParams.push(payment_link);
    }
    
    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex++}`);
      queryParams.push(due_date);
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      queryParams.push(notes);
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // If no fields to update, return the current invoice
    if (updateFields.length === 1) {
      return res.json(checkResult.rows[0]);
    }
    
    // Add the id parameter
    queryParams.push(id);
    
    // Execute the update query
    const result = await pool.query(`
      UPDATE invoices
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, queryParams);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if invoice exists
    const checkResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Delete the invoice
    await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
};