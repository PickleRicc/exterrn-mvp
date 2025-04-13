const db = require('../db');
const { generateInvoicePDF } = require('../services/invoiceGenerator');
const { sendInvoiceEmail } = require('../services/emailService');

/**
 * Get all invoices with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllInvoices = async (req, res) => {
  try {
    const { craftsman_id, customer_id, status } = req.query;
    
    // Build query based on filters
    let query = `
      SELECT i.*, c.name as customer_name, cr.name as craftsman_name, 
      a.title as appointment_title, a.start_time as appointment_date
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      LEFT JOIN appointments a ON i.appointment_id = a.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add filters if provided
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
    
    // Add sorting
    query += ` ORDER BY i.created_at DESC`;
    
    const result = await db.query(query, queryParams);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

/**
 * Get a single invoice by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get invoice data
    const invoiceQuery = `
      SELECT i.*, c.name as customer_name, c.address as customer_address, c.email as customer_email,
      cr.name as craftsman_name, cr.phone as craftsman_phone, cr.email as craftsman_email,
      a.title as appointment_title, a.start_time as appointment_date
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      LEFT JOIN appointments a ON i.appointment_id = a.id
      WHERE i.id = $1
    `;
    
    const invoice = await db.query(invoiceQuery, [id]);
    
    if (invoice.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get invoice items
    const itemsQuery = `
      SELECT ii.*, m.name as material_name
      FROM invoice_items ii
      LEFT JOIN materials m ON ii.material_id = m.id
      WHERE ii.invoice_id = $1
    `;
    
    const items = await db.query(itemsQuery, [id]);
    
    // Return combined data
    return res.status(200).json({
      ...invoice.rows[0],
      items: items.rows
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

/**
 * Create a new invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createInvoice = async (req, res) => {
  const { appointment_id, items, notes, due_date } = req.body;
  const transaction = await db.transaction();
  
  try {
    // Get appointment details
    const appointment = await db.query(
      'SELECT * FROM appointments WHERE id = $1',
      [appointment_id]
    );
    
    if (!appointment.rows[0]) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Generate invoice number (YEAR-MONTH-CRAFTSMAN_ID-SEQUENCE)
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const craftsman_id = appointment.rows[0].craftsman_id;
    
    // Get sequence number
    const invoiceCount = await db.query(
      'SELECT COUNT(*) FROM invoices WHERE craftsman_id = $1 AND EXTRACT(YEAR FROM created_at) = $2',
      [craftsman_id, year]
    );
    
    const sequence = String(Number(invoiceCount.rows[0].count) + 1).padStart(4, '0');
    const invoice_number = `INV-${year}${month}-${craftsman_id}-${sequence}`;
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax_rate = 0.19; // 19% VAT for Germany
    const tax_amount = subtotal * tax_rate;
    const total_amount = subtotal + tax_amount;
    
    // Create invoice
    const invoice = await db.query(
      `INSERT INTO invoices 
       (appointment_id, craftsman_id, customer_id, invoice_number, amount, tax_amount, total_amount, status, notes, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        appointment_id, 
        craftsman_id,
        appointment.rows[0].customer_id,
        invoice_number,
        subtotal,
        tax_amount,
        total_amount,
        'pending',
        notes,
        due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now if not specified
      ]
    );
    
    // Add invoice items
    for (const item of items) {
      await db.query(
        `INSERT INTO invoice_items
         (invoice_id, description, quantity, unit_price, amount, material_id, service_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          invoice.rows[0].id,
          item.description,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
          item.material_id || null,
          item.service_type || null
        ]
      );
    }
    
    // Update appointment status
    await db.query(
      'UPDATE appointments SET status = $1 WHERE id = $2',
      ['completed', appointment_id]
    );
    
    // Commit transaction
    await transaction.commit();
    
    // Generate and send invoice
    try {
      const pdfResult = await generateInvoicePDF(invoice.rows[0].id);
      await sendInvoiceEmail(invoice.rows[0].id, pdfResult.filepath);
    } catch (emailError) {
      console.error('Error generating or sending invoice:', emailError);
      // Don't fail the request if email sending fails
    }
    
    return res.status(201).json({ 
      message: 'Invoice created successfully',
      invoice: invoice.rows[0]
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating invoice:', error);
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
};

/**
 * Update an existing invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { status, notes, due_date, payment_link } = req.body;
  
  try {
    // Check if invoice exists
    const existingInvoice = await db.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Build update query
    let query = 'UPDATE invoices SET ';
    const queryParams = [];
    let paramIndex = 1;
    
    // Add fields to update
    if (status) {
      query += `status = $${paramIndex}, `;
      queryParams.push(status);
      paramIndex++;
    }
    
    if (notes) {
      query += `notes = $${paramIndex}, `;
      queryParams.push(notes);
      paramIndex++;
    }
    
    if (due_date) {
      query += `due_date = $${paramIndex}, `;
      queryParams.push(due_date);
      paramIndex++;
    }
    
    if (payment_link) {
      query += `payment_link = $${paramIndex}, `;
      queryParams.push(payment_link);
      paramIndex++;
    }
    
    // Add updated_at timestamp
    query += `updated_at = NOW() `;
    
    // Add WHERE clause
    query += `WHERE id = $${paramIndex} RETURNING *`;
    queryParams.push(id);
    
    // Execute update
    const result = await db.query(query, queryParams);
    
    return res.status(200).json({
      message: 'Invoice updated successfully',
      invoice: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({ error: 'Failed to update invoice' });
  }
};

/**
 * Delete an invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  const transaction = await db.transaction();
  
  try {
    // Check if invoice exists
    const existingInvoice = await db.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Delete invoice items first
    await db.query(
      'DELETE FROM invoice_items WHERE invoice_id = $1',
      [id]
    );
    
    // Delete invoice
    await db.query(
      'DELETE FROM invoices WHERE id = $1',
      [id]
    );
    
    // Commit transaction
    await transaction.commit();
    
    return res.status(200).json({
      message: 'Invoice deleted successfully'
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting invoice:', error);
    return res.status(500).json({ error: 'Failed to delete invoice' });
  }
};

/**
 * Generate PDF for an invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateInvoicePDFEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if invoice exists
    const existingInvoice = await db.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Generate PDF
    const pdfResult = await generateInvoicePDF(id);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${pdfResult.filename}`);
    
    // Send file
    res.sendFile(pdfResult.filepath);
    
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
};

/**
 * Send invoice by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendInvoiceEmailEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if invoice exists
    const existingInvoice = await db.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Generate PDF
    const pdfResult = await generateInvoicePDF(id);
    
    // Send email
    await sendInvoiceEmail(id, pdfResult.filepath);
    
    return res.status(200).json({
      message: 'Invoice email sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return res.status(500).json({ error: 'Failed to send invoice email' });
  }
};

/**
 * Complete appointment and create invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const completeAppointmentAndCreateInvoice = async (req, res) => {
  const { id } = req.params;
  const { items, notes, due_date } = req.body;
  
  try {
    // Check if appointment exists and is not already completed
    const appointment = await db.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );
    
    if (appointment.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    if (appointment.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Appointment is already completed' });
    }
    
    // Create invoice
    req.body.appointment_id = id;
    return createInvoice(req, res);
    
  } catch (error) {
    console.error('Error completing appointment and creating invoice:', error);
    return res.status(500).json({ error: 'Failed to complete appointment and create invoice' });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  generateInvoicePDFEndpoint,
  sendInvoiceEmailEndpoint,
  completeAppointmentAndCreateInvoice
};
