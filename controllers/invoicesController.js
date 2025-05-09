const pool = require('../db');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const fs = require('fs-extra');
const path = require('path');
const { updateFinancesFromInvoice } = require('./financesController');

// Get all invoices with optional filters
const getAllInvoices = async (req, res) => {
  try {
    // Get craftsman_id from either query params or from the authenticated user
    let craftsman_id = req.query.craftsman_id;
    
    // If no craftsman_id in query, use the one from the authenticated user
    if (!craftsman_id && req.user && req.user.craftsmanId) {
      craftsman_id = req.user.craftsmanId;
      console.log('Using craftsman_id from authenticated user:', craftsman_id);
    }
    
    console.log('GET /invoices request received');
    console.log('Request query params:', req.query);
    console.log('Craftsman ID to use:', craftsman_id);
    
    // Require craftsman_id for security
    if (!craftsman_id) {
      console.log('ERROR: No craftsman_id provided, rejecting request');
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    let query = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.craftsman_id = $1
    `;
    
    const queryParams = [craftsman_id];
    let paramIndex = 2;
    
    // Add any additional filters here if needed
    
    query += ` ORDER BY i.created_at DESC`;
    
    console.log('Executing query:', query);
    console.log('Query params:', queryParams);
    
    const result = await pool.query(query, queryParams);
    console.log(`Query returned ${result.rows.length} invoices`);
    
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
    
    // Ensure craftsman_id is provided for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkQuery = 'SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2';
    const checkResult = await pool.query(checkQuery, [id, craftsman_id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to update it' });
    }
    
    const oldInvoice = checkResult.rows[0];
    const oldStatus = oldInvoice.status;

    // Build the update query dynamically based on provided fields
    let updateFields = [];
    let values = [];
    let paramIndex = 1;

    if (customer_id) {
      updateFields.push(`customer_id = $${paramIndex++}`);
      values.push(customer_id);
    }

    if (amount !== undefined) {
      updateFields.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }

    if (tax_amount !== undefined) {
      updateFields.push(`tax_amount = $${paramIndex++}`);
      values.push(tax_amount);
    }

    if (total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramIndex++}`);
      values.push(total_amount);
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex++}`);
      values.push(due_date);
    }

    if (service_date !== undefined) {
      updateFields.push(`service_date = $${paramIndex++}`);
      values.push(service_date);
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      values.push(location);
    }

    if (vat_exempt !== undefined) {
      updateFields.push(`vat_exempt = $${paramIndex++}`);
      values.push(vat_exempt);
    }

    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (appointment_id !== undefined) {
      updateFields.push(`appointment_id = $${paramIndex++}`);
      values.push(appointment_id);
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // If there are no fields to update, return an error
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Build and execute the update query
    const updateQuery = `
      UPDATE invoices
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND craftsman_id = $${paramIndex++}
      RETURNING *
    `;

    values.push(id);
    values.push(craftsman_id);

    const result = await pool.query(updateQuery, values);

    // If status changed to 'paid', update finances
    if (status === 'paid' && oldStatus !== 'paid') {
      console.log(`Invoice ${id} marked as paid. Updating finances.`);
      await updateFinancesFromInvoice(id, craftsman_id);
    }

    // If appointment_id changed, update the old and new appointments
    if (appointment_id !== undefined && appointment_id !== oldInvoice.appointment_id) {
      // If there was a previous appointment, update its has_invoice status to false
      if (oldInvoice.appointment_id) {
        try {
          await pool.query(
            'UPDATE appointments SET has_invoice = false WHERE id = $1 AND craftsman_id = $2',
            [oldInvoice.appointment_id, craftsman_id]
          );
        } catch (err) {
          console.error('Error updating old appointment has_invoice status:', err);
          // Continue with the response even if this fails
        }
      }

      // If there is a new appointment, update its has_invoice status to true
      if (appointment_id) {
        try {
          await pool.query(
            'UPDATE appointments SET has_invoice = true WHERE id = $1 AND craftsman_id = $2',
            [appointment_id, craftsman_id]
          );
        } catch (err) {
          console.error('Error updating new appointment has_invoice status:', err);
          // Continue with the response even if this fails
        }
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating invoice ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Check and update invoice statuses based on due dates
const updateInvoiceStatuses = async () => {
  try {
    console.log('Checking for overdue invoices...');
    
    // Find all pending invoices with due dates in the past
    const query = `
      UPDATE invoices 
      SET 
        status = 'overdue',
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        status = 'pending' 
        AND due_date < CURRENT_TIMESTAMP
      RETURNING id, invoice_number, due_date
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      console.log(`Updated ${result.rows.length} invoices to overdue status`);
      console.log('Updated invoices:', result.rows);
    } else {
      console.log('No invoices needed to be updated to overdue status');
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error updating invoice statuses:', error);
    return [];
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    // Check both query parameters and body for craftsman_id
    let craftsman_id = req.query.craftsman_id;
    
    // Log full request details for debugging
    console.log('⚠️ DELETE INVOICE REQUEST:');
    console.log('  URL:', req.originalUrl);
    console.log('  Method:', req.method);
    console.log('  Params:', req.params);
    console.log('  Query:', req.query);
    console.log('  Body:', req.body);
    console.log('  Headers:', req.headers);
    console.log(`  Target: Invoice ${id} for craftsman ${craftsman_id}`);
    
    // Double-check id parameter
    if (!id || isNaN(parseInt(id))) {
      console.error('Invalid invoice ID:', id);
      return res.status(400).json({ error: `Invalid invoice ID: ${id}` });
    }
    
    // Ensure craftsman_id is available from either query params or request body
    if (!craftsman_id && req.body && req.body.craftsman_id) {
      craftsman_id = req.body.craftsman_id;
      console.log('Using craftsman_id from request body:', craftsman_id);
    }
    
    // Validate required fields
    if (!craftsman_id) {
      console.error('Missing craftsman_id in both query and body');
      return res.status(400).json({ error: 'craftsman_id is required (include in query params)' });
    }
    
    // Check if invoice exists and get appointment_id if it exists
    const checkQuery = `
      SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2
    `;
    console.log('Executing check query:', checkQuery, 'with params:', [id, craftsman_id]);
    const checkResult = await pool.query(checkQuery, [id, craftsman_id]);
    console.log('Check result rows:', checkResult.rows.length);
    
    if (checkResult.rows.length === 0) {
      console.error(`🚨 Invoice not found: id=${id}, craftsman_id=${craftsman_id}`);
      
      // Debug: check if invoice exists without craftsman constraint
      const debugQuery = 'SELECT id, craftsman_id FROM invoices WHERE id = $1';
      const debugResult = await pool.query(debugQuery, [id]);
      if (debugResult.rows.length > 0) {
        console.log(`⚠️ Invoice exists but with different craftsman_id: ${debugResult.rows[0].craftsman_id}`);
      } else {
        console.log(`❌ Invoice with id=${id} does not exist at all`);
      }
      
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to delete it' });
    }
    
    // Log the invoice we're about to delete
    console.log('📄 Invoice to delete:', checkResult.rows[0]);
    
    // Get the appointment_id if it exists
    const appointment_id = checkResult.rows[0].appointment_id;
    console.log(`Invoice has appointment_id: ${appointment_id}`);
    
    // Delete the invoice
    const deleteQuery = 'DELETE FROM invoices WHERE id = $1 AND craftsman_id = $2 RETURNING id';
    console.log('Executing delete query:', deleteQuery, 'with params:', [id, craftsman_id]);
    const deleteResult = await pool.query(deleteQuery, [id, craftsman_id]);
    console.log('Delete result:', deleteResult.rowCount, 'rows affected', deleteResult.rows);
    
    // Verify deletion
    if (deleteResult.rowCount === 0) {
      console.error('🚨 DELETE OPERATION FAILED - No rows affected');
      return res.status(500).json({ error: 'Failed to delete invoice - database did not confirm deletion' });
    }
    
    // Double check deletion by trying to fetch the invoice again
    const verifyQuery = 'SELECT id FROM invoices WHERE id = $1';
    const verifyResult = await pool.query(verifyQuery, [id]);
    if (verifyResult.rows.length > 0) {
      console.error('🚨 VERIFICATION FAILED - Invoice still exists after deletion');
      return res.status(500).json({ 
        error: 'Database anomaly: Invoice still exists after deletion', 
        invoice_id: id 
      });
    } else {
      console.log('✅ DELETION VERIFIED - Invoice no longer exists in database');
    }
    
    // If there was an appointment linked, update its has_invoice status
    if (appointment_id) {
      try {
        const updateQuery = `UPDATE appointments SET has_invoice = false WHERE id = $1 AND craftsman_id = $2`;
        console.log('Executing update query:', updateQuery, 'with params:', [appointment_id, craftsman_id]);
        const updateResult = await pool.query(updateQuery, [appointment_id, craftsman_id]);
        console.log('Update result:', updateResult.rowCount, 'rows affected');
        console.log(`Updated appointment ${appointment_id} to mark it as no longer having an invoice`);
      } catch (updateErr) {
        console.error('Error updating appointment has_invoice status:', updateErr);
        // Continue with the response even if this fails
      }
    }
    
    console.log('✅ DELETE OPERATION SUCCESSFUL');
    return res.status(200).json({ 
      message: 'Invoice deleted successfully',
      deleted_invoice_id: id,
      craftsman_id: craftsman_id
    });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    return res.status(500).json({ 
      error: 'Server error while deleting invoice', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatuses,
  deleteInvoice
};
