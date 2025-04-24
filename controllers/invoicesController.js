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
      due_date,
      service_date,
      location,
      vat_exempt,
      type,
      appointment_id
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
        craftsman_id, customer_id, amount, tax_amount, total_amount, notes, due_date,
        service_date, location, vat_exempt, type, appointment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      craftsman_id,
      customer_id,
      amount,
      tax_amount || 0,
      total_amount,
      notes || '',
      due_date || null,
      service_date || null,
      location || '',
      vat_exempt || false,
      type || 'invoice',
      appointment_id || null
    ];
    
    const result = await pool.query(query, values);
    
    // If an appointment was linked, update its status to indicate it has an invoice
    if (appointment_id) {
      try {
        await pool.query(
          `UPDATE appointments SET has_invoice = true WHERE id = $1 AND craftsman_id = $2`,
          [appointment_id, craftsman_id]
        );
        console.log(`Updated appointment ${appointment_id} to mark it as having an invoice`);
      } catch (appointmentError) {
        console.error('Error updating appointment has_invoice status:', appointmentError);
        // Don't fail the invoice creation if this update fails
      }
    }
    
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
      status,
      service_date,
      location,
      vat_exempt,
      type,
      appointment_id
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
    
    // Get the current appointment_id if it exists
    const currentAppointmentId = checkResult.rows[0].appointment_id;
    
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
    
    if (service_date !== undefined) {
      updateFields.push(`service_date = $${paramIndex}`);
      values.push(service_date || null);
      paramIndex++;
    }
    
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex}`);
      values.push(location || '');
      paramIndex++;
    }
    
    if (vat_exempt !== undefined) {
      updateFields.push(`vat_exempt = $${paramIndex}`);
      values.push(vat_exempt);
      paramIndex++;
    }
    
    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }
    
    if (appointment_id !== undefined) {
      updateFields.push(`appointment_id = $${paramIndex}`);
      values.push(appointment_id || null);
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
    
    // Handle appointment relationship updates
    if (appointment_id !== undefined && appointment_id !== currentAppointmentId) {
      // If a new appointment was linked, update its status
      if (appointment_id) {
        try {
          await pool.query(
            `UPDATE appointments SET has_invoice = true WHERE id = $1 AND craftsman_id = $2`,
            [appointment_id, craftsman_id]
          );
          console.log(`Updated appointment ${appointment_id} to mark it as having an invoice`);
        } catch (appointmentError) {
          console.error('Error updating new appointment has_invoice status:', appointmentError);
        }
      }
      
      // If an old appointment was unlinked, update its status
      if (currentAppointmentId) {
        try {
          await pool.query(
            `UPDATE appointments SET has_invoice = false WHERE id = $1 AND craftsman_id = $2`,
            [currentAppointmentId, craftsman_id]
          );
          console.log(`Updated appointment ${currentAppointmentId} to mark it as no longer having an invoice`);
        } catch (appointmentError) {
          console.error('Error updating old appointment has_invoice status:', appointmentError);
        }
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating invoice ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    console.log(`Attempting to delete invoice ${id} for craftsman ${craftsman_id}`);
    
    // Validate required fields
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and get appointment_id if it exists
    const checkQuery = `
      SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2
    `;
    console.log('Executing check query:', checkQuery, 'with params:', [id, craftsman_id]);
    const checkResult = await pool.query(checkQuery, [id, craftsman_id]);
    console.log('Check result rows:', checkResult.rows.length);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to delete it' });
    }
    
    // Get the appointment_id if it exists
    const { appointment_id } = checkResult.rows[0];
    console.log(`Found invoice ${id} with appointment_id ${appointment_id || 'none'}`);
    
    // Delete the invoice
    const deleteQuery = 'DELETE FROM invoices WHERE id = $1 AND craftsman_id = $2';
    console.log('Executing delete query:', deleteQuery, 'with params:', [id, craftsman_id]);
    const deleteResult = await pool.query(deleteQuery, [id, craftsman_id]);
    console.log('Delete result:', deleteResult.rowCount, 'rows affected');
    
    // If there was an appointment linked, update its has_invoice status
    if (appointment_id) {
      try {
        const updateQuery = `UPDATE appointments SET has_invoice = false WHERE id = $1 AND craftsman_id = $2`;
        console.log('Executing update query:', updateQuery, 'with params:', [appointment_id, craftsman_id]);
        const updateResult = await pool.query(updateQuery, [appointment_id, craftsman_id]);
        console.log('Update result:', updateResult.rowCount, 'rows affected');
        console.log(`Updated appointment ${appointment_id} to mark it as no longer having an invoice`);
      } catch (appointmentError) {
        console.error('Error updating appointment has_invoice status:', appointmentError);
        // Don't fail the invoice deletion if this update fails
      }
    }
    
    res.json({ 
      message: 'Invoice deleted successfully',
      success: true,
      deleted_id: id
    });
  } catch (error) {
    console.error(`Error deleting invoice ${req.params.id}:`, error);
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
