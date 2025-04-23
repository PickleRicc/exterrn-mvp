const { pool } = require('../config/db');
const { generateInvoicePdf } = require('../services/invoiceGenerator');
const fs = require('fs');
const path = require('path');

// Get all invoices with optional filters
const getAllInvoices = async (req, res) => {
  try {
    const { 
      craftsman_id, 
      customer_id, 
      status, 
      type, 
      from_date, 
      to_date, 
      search 
    } = req.query;
    
    let query = `
      SELECT i.*, c.name as customer_name, c.email as customer_email
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
    
    if (customer_id) {
      query += ` AND i.customer_id = $${paramIndex}`;
      queryParams.push(customer_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    if (type) {
      query += ` AND i.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }
    
    if (from_date) {
      query += ` AND i.created_at >= $${paramIndex}`;
      queryParams.push(from_date);
      paramIndex++;
    }
    
    if (to_date) {
      query += ` AND i.created_at <= $${paramIndex}`;
      queryParams.push(to_date);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (
        i.invoice_number ILIKE $${paramIndex} OR
        c.name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
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
    
    // Get invoice with customer and items
    const invoiceQuery = `
      SELECT i.*, c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1 AND i.craftsman_id = $2
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [id, craftsman_id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to access it' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Get invoice items
    const itemsQuery = `
      SELECT * FROM invoice_items
      WHERE invoice_id = $1
    `;
    
    const itemsResult = await pool.query(itemsQuery, [id]);
    
    // Combine invoice with items
    invoice.items = itemsResult.rows;
    
    res.json(invoice);
  } catch (error) {
    console.error(`Error getting invoice ${req.params.id}:`, error);
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
      amount,
      tax_amount,
      total_amount,
      status,
      due_date,
      notes,
      type,
      service_date,
      location,
      vat_exempt,
      items
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
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert invoice
      const invoiceQuery = `
        INSERT INTO invoices (
          appointment_id, craftsman_id, customer_id, amount, tax_amount, total_amount,
          status, due_date, notes, type, service_date, location, vat_exempt
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const invoiceValues = [
        appointment_id || null,
        craftsman_id,
        customer_id,
        amount,
        tax_amount || 0,
        total_amount,
        status || 'pending',
        due_date || null,
        notes || null,
        type || 'invoice',
        service_date || null,
        location || null,
        vat_exempt || false
      ];
      
      const invoiceResult = await client.query(invoiceQuery, invoiceValues);
      const invoice = invoiceResult.rows[0];
      
      // Insert invoice items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          const itemQuery = `
            INSERT INTO invoice_items (
              invoice_id, description, quantity, unit_price, tax_rate, amount
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          
          const itemValues = [
            invoice.id,
            item.description,
            item.quantity,
            item.unit_price,
            item.tax_rate || 19,
            item.amount || (item.quantity * item.unit_price)
          ];
          
          await client.query(itemQuery, itemValues);
        }
      }
      
      await client.query('COMMIT');
      
      // Get the complete invoice with items
      const completeInvoiceQuery = `
        SELECT i.*, c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = $1
      `;
      
      const completeInvoiceResult = await pool.query(completeInvoiceQuery, [invoice.id]);
      const completeInvoice = completeInvoiceResult.rows[0];
      
      // Get invoice items
      const itemsQuery = `
        SELECT * FROM invoice_items
        WHERE invoice_id = $1
      `;
      
      const itemsResult = await pool.query(itemsQuery, [invoice.id]);
      
      // Combine invoice with items
      completeInvoice.items = itemsResult.rows;
      
      res.status(201).json(completeInvoice);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
      appointment_id,
      craftsman_id,
      customer_id,
      amount,
      tax_amount,
      total_amount,
      status,
      due_date,
      notes,
      type,
      service_date,
      location,
      vat_exempt,
      items
    } = req.body;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkQuery = `
      SELECT * FROM invoices
      WHERE id = $1 AND craftsman_id = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [id, craftsman_id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to update it' });
    }
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update invoice
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (appointment_id !== undefined) {
        updateFields.push(`appointment_id = $${paramIndex}`);
        updateValues.push(appointment_id);
        paramIndex++;
      }
      
      if (customer_id !== undefined) {
        updateFields.push(`customer_id = $${paramIndex}`);
        updateValues.push(customer_id);
        paramIndex++;
      }
      
      if (amount !== undefined) {
        updateFields.push(`amount = $${paramIndex}`);
        updateValues.push(amount);
        paramIndex++;
      }
      
      if (tax_amount !== undefined) {
        updateFields.push(`tax_amount = $${paramIndex}`);
        updateValues.push(tax_amount);
        paramIndex++;
      }
      
      if (total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramIndex}`);
        updateValues.push(total_amount);
        paramIndex++;
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(status);
        paramIndex++;
      }
      
      if (due_date !== undefined) {
        updateFields.push(`due_date = $${paramIndex}`);
        updateValues.push(due_date);
        paramIndex++;
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(notes);
        paramIndex++;
      }
      
      if (type !== undefined) {
        updateFields.push(`type = $${paramIndex}`);
        updateValues.push(type);
        paramIndex++;
      }
      
      if (service_date !== undefined) {
        updateFields.push(`service_date = $${paramIndex}`);
        updateValues.push(service_date);
        paramIndex++;
      }
      
      if (location !== undefined) {
        updateFields.push(`location = $${paramIndex}`);
        updateValues.push(location);
        paramIndex++;
      }
      
      if (vat_exempt !== undefined) {
        updateFields.push(`vat_exempt = $${paramIndex}`);
        updateValues.push(vat_exempt);
        paramIndex++;
      }
      
      updateFields.push(`updated_at = NOW()`);
      
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE invoices
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex} AND craftsman_id = $${paramIndex + 1}
          RETURNING *
        `;
        
        updateValues.push(id, craftsman_id);
        
        await client.query(updateQuery, updateValues);
      }
      
      // Update invoice items if provided
      if (items && items.length > 0) {
        // Delete existing items
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        
        // Insert new items
        for (const item of items) {
          const itemQuery = `
            INSERT INTO invoice_items (
              invoice_id, description, quantity, unit_price, tax_rate, amount
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          const itemValues = [
            id,
            item.description,
            item.quantity,
            item.unit_price,
            item.tax_rate || 19,
            item.amount || (item.quantity * item.unit_price)
          ];
          
          await client.query(itemQuery, itemValues);
        }
      }
      
      await client.query('COMMIT');
      
      // Get the updated invoice with items
      const updatedInvoiceQuery = `
        SELECT i.*, c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = $1
      `;
      
      const updatedInvoiceResult = await pool.query(updatedInvoiceQuery, [id]);
      const updatedInvoice = updatedInvoiceResult.rows[0];
      
      // Get invoice items
      const itemsQuery = `
        SELECT * FROM invoice_items
        WHERE invoice_id = $1
      `;
      
      const itemsResult = await pool.query(itemsQuery, [id]);
      
      // Combine invoice with items
      updatedInvoice.items = itemsResult.rows;
      
      res.json(updatedInvoice);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkQuery = `
      SELECT * FROM invoices
      WHERE id = $1 AND craftsman_id = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [id, craftsman_id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to delete it' });
    }
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete invoice items first
      await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      
      // Delete invoice
      await client.query('DELETE FROM invoices WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error deleting invoice ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Get invoice items
const getInvoiceItems = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkQuery = `
      SELECT * FROM invoices
      WHERE id = $1 AND craftsman_id = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [invoice_id, craftsman_id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to access it' });
    }
    
    // Get invoice items
    const itemsQuery = `
      SELECT * FROM invoice_items
      WHERE invoice_id = $1
    `;
    
    const itemsResult = await pool.query(itemsQuery, [invoice_id]);
    
    res.json(itemsResult.rows);
  } catch (error) {
    console.error(`Error getting invoice items for invoice ${req.params.invoice_id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Convert quote to invoice
const convertQuoteToInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.body;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if quote exists and belongs to the craftsman
    const checkQuery = `
      SELECT * FROM invoices
      WHERE id = $1 AND craftsman_id = $2 AND type = 'quote'
    `;
    
    const checkResult = await pool.query(checkQuery, [id, craftsman_id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or you do not have permission to convert it' });
    }
    
    // Update quote to invoice
    const updateQuery = `
      UPDATE invoices
      SET type = 'invoice', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, [id]);
    const invoice = updateResult.rows[0];
    
    // Get invoice items
    const itemsQuery = `
      SELECT * FROM invoice_items
      WHERE invoice_id = $1
    `;
    
    const itemsResult = await pool.query(itemsQuery, [id]);
    
    // Combine invoice with items
    invoice.items = itemsResult.rows;
    
    res.json(invoice);
  } catch (error) {
    console.error(`Error converting quote to invoice ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Generate PDF for download
const generatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    
    if (!craftsman_id) {
      return res.status(400).json({ error: 'Craftsman ID is required' });
    }
    
    // Check if invoice exists and belongs to craftsman
    const checkResult = await pool.query(
      `SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2`,
      [id, craftsman_id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or does not belong to craftsman' });
    }
    
    const invoice = checkResult.rows[0];
    console.log(`Found invoice for PDF generation: ${invoice.id}, type: ${invoice.type}, number: ${invoice.invoice_number}`);
    
    // Set headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.type}_${invoice.invoice_number.replace(/\//g, '-')}.pdf"`);
    
    // Generate the PDF directly to the response stream
    const doc = await generateInvoicePdf({
      invoiceId: id,
      stream: true
    });
    
    // Pipe the document directly to the response
    doc.pipe(res);
    
    // Clean up function for when the response is finished
    res.on('finish', () => {
      console.log(`Finished streaming PDF for invoice ${id}`);
    });
    
    res.on('error', (err) => {
      console.error(`Error streaming PDF for invoice ${id}:`, err);
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
};

// Preview PDF
const previewPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    
    if (!craftsman_id) {
      return res.status(400).json({ error: 'Craftsman ID is required' });
    }
    
    // Check if invoice exists and belongs to craftsman
    const checkResult = await pool.query(
      `SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2`,
      [id, craftsman_id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or does not belong to craftsman' });
    }
    
    const invoice = checkResult.rows[0];
    console.log(`Found invoice for preview: ${invoice.id}, type: ${invoice.type}, number: ${invoice.invoice_number}`);
    
    // Set headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.type}_${invoice.invoice_number.replace(/\//g, '-')}.pdf"`);
    
    // Generate the PDF directly to the response stream
    const doc = await generateInvoicePdf({
      invoiceId: id,
      stream: true
    });
    
    // Pipe the document directly to the response
    doc.pipe(res);
    
    // Clean up function for when the response is finished
    res.on('finish', () => {
      console.log(`Finished streaming PDF preview for invoice ${id}`);
    });
    
    res.on('error', (err) => {
      console.error(`Error streaming PDF preview for invoice ${id}:`, err);
    });
    
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceItems,
  convertQuoteToInvoice,
  generatePdf,
  previewPdf
};
