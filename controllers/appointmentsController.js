const pool = require('../db');
const emailService = require('../services/emailService');

// Get all appointments with customer data
const getAllAppointments = async (req, res) => {
  try {
    const { date, approval_status, craftsman_id, has_invoice, status } = req.query;
    
    console.log('Request query params for appointments:', req.query);
    console.log('Craftsman ID from query:', craftsman_id);
    
    let queryText = `
      SELECT a.*, c.name as customer_name, c.phone as customer_phone, c.service_type
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    let whereClauseAdded = false;
    
    // Filter by craftsman_id if provided (important for security)
    if (craftsman_id) {
      queryParams.push(craftsman_id);
      queryText += ` WHERE a.craftsman_id = $${paramIndex++}`;
      whereClauseAdded = true;
      console.log('Filtering appointments by craftsman_id:', craftsman_id);
    }
    
    if (date) {
      queryParams.push(date);
      queryText += whereClauseAdded ? ` AND DATE(scheduled_at) = $${paramIndex++}` : ` WHERE DATE(scheduled_at) = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    if (approval_status) {
      queryParams.push(approval_status);
      queryText += whereClauseAdded ? ` AND approval_status = $${paramIndex++}` : ` WHERE approval_status = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    if (status) {
      queryParams.push(status);
      queryText += whereClauseAdded ? ` AND status = $${paramIndex++}` : ` WHERE status = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    // Filter by has_invoice if provided
    if (has_invoice !== undefined) {
      const hasInvoiceValue = has_invoice === 'true' || has_invoice === true;
      queryParams.push(hasInvoiceValue);
      queryText += whereClauseAdded ? ` AND has_invoice = $${paramIndex++}` : ` WHERE has_invoice = $${paramIndex++}`;
      whereClauseAdded = true;
      console.log('Filtering appointments by has_invoice:', hasInvoiceValue);
    }
    
    queryText += ` ORDER BY a.scheduled_at DESC`;
    
    console.log('Final appointments query:', queryText);
    console.log('Query parameters:', queryParams);
    
    const result = await pool.query(queryText, queryParams);
    console.log('Query returned', result.rows.length, 'appointments');
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT a.*, c.name as customer_name, c.phone as customer_phone, c.service_type
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new appointment
const createAppointment = async (req, res) => {
  try {
    const { customer_id, scheduled_at, notes, craftsman_id, duration, location, status, approval_status } = req.body;
    
    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    
    if (!scheduled_at) {
      return res.status(400).json({ error: 'scheduled_at is required' });
    }
    
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Set default approval_status to 'pending' for appointments created via API
    // This will apply to appointments created through Vapi
    const appointmentApprovalStatus = approval_status || 'pending';
    
    const result = await pool.query(`
      INSERT INTO appointments (
        customer_id, 
        scheduled_at, 
        notes, 
        craftsman_id, 
        duration, 
        location, 
        status, 
        approval_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      customer_id, 
      scheduled_at, 
      notes || '', 
      craftsman_id, 
      duration || 60, 
      location || '', 
      status || 'scheduled',
      appointmentApprovalStatus
    ]);
    
    // Get the full appointment details with customer and craftsman info for the email
    if (appointmentApprovalStatus === 'pending') {
      try {
        const appointmentDetails = await pool.query(`
          SELECT a.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
                 cr.name as craftsman_name, cr.phone as craftsman_phone,
                 u.email as craftsman_email
          FROM appointments a
          JOIN customers c ON a.customer_id = c.id
          JOIN craftsmen cr ON a.craftsman_id = cr.id
          JOIN users u ON cr.user_id = u.id
          WHERE a.id = $1
        `, [result.rows[0].id]);
        
        if (appointmentDetails.rows.length > 0) {
          // Send notification email to craftsman
          await emailService.sendNewAppointmentNotificationEmail(appointmentDetails.rows[0]);
        }
      } catch (emailError) {
        console.error('Error sending craftsman notification email:', emailError);
        // We don't want to fail the API call if email sending fails
      }
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, notes, craftsman_id, customer_id, duration, location, status, approval_status } = req.body;
    
    // Build the update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (scheduled_at) {
      updates.push(`scheduled_at = $${paramIndex++}`);
      values.push(scheduled_at);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    
    if (craftsman_id) {
      updates.push(`craftsman_id = $${paramIndex++}`);
      values.push(craftsman_id);
    }
    
    if (customer_id) {
      updates.push(`customer_id = $${paramIndex++}`);
      values.push(customer_id);
    }
    
    if (duration) {
      updates.push(`duration = $${paramIndex++}`);
      values.push(duration);
    }
    
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    
    if (approval_status) {
      updates.push(`approval_status = $${paramIndex++}`);
      values.push(approval_status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add the ID parameter
    values.push(id);
    
    const result = await pool.query(`
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const craftsman_id = req.query.craftsman_id || (req.user && req.user.craftsmanId);
    
    console.log(`Attempting to delete appointment ${id}`, {
      params: req.params,
      query: req.query,
      user: req.user
    });
    
    if (!craftsman_id) {
      console.error('Missing craftsman_id for delete appointment');
      return res.status(400).json({ error: 'Craftsman ID is required' });
    }
    
    // First check if appointment exists and belongs to this craftsman
    const checkResult = await pool.query(
      'SELECT * FROM appointments WHERE id = $1', 
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const appointment = checkResult.rows[0];
    
    // Verify craftsman has permission to delete this appointment
    if (appointment.craftsman_id !== parseInt(craftsman_id)) {
      console.error(`Unauthorized deletion attempt: Craftsman ${craftsman_id} does not own appointment ${id}`);
      return res.status(403).json({ error: 'You are not authorized to delete this appointment' });
    }
    
    // Optional: Check if appointment status allows deletion
    if (appointment.status === 'completed') {
      // If we need to check for invoices in the future, we can add that logic here
      console.warn(`Deleting a completed appointment: ${id}`);
    }
    
    // Delete the appointment
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 AND craftsman_id = $2 RETURNING *', 
      [id, craftsman_id]
    );
    
    console.log(`Successfully deleted appointment ${id}`);
    res.json({ 
      message: 'Appointment deleted successfully', 
      appointment: result.rows[0] 
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Approve appointment
const approveAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Attempting to approve appointment ${id}`);
    console.log('User from request:', req.user);
    
    // First, check if the appointment exists and get its details
    try {
      const checkResult = await pool.query(`
        SELECT a.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               cr.name as craftsman_name, cr.phone as craftsman_phone,
               u.email as craftsman_email
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN craftsmen cr ON a.craftsman_id = cr.id
        JOIN users u ON cr.user_id = u.id
        WHERE a.id = $1
      `, [id]);
      
      console.log(`Appointment check query returned ${checkResult.rows.length} rows`);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      
      const appointment = checkResult.rows[0];
      console.log('Found appointment:', appointment);
      
      // Check if the appointment is already approved
      if (appointment.approval_status === 'approved') {
        return res.status(400).json({ error: 'Appointment is already approved' });
      }
      
      // Update the approval status - simplified query to avoid potential issues
      try {
        const result = await pool.query(`
          UPDATE appointments
          SET approval_status = 'approved'
          WHERE id = $1
          RETURNING *
        `, [id]);
        
        console.log('Update result:', result.rows[0]);
        
        // Send approval email to customer
        try {
          await emailService.sendAppointmentApprovalEmail(appointment);
          console.log('Approval email sent successfully');
        } catch (emailError) {
          console.error('Error sending customer approval email:', emailError);
          // We don't want to fail the API call if email sending fails
        }
        
        res.json({
          message: 'Appointment approved successfully',
          appointment: result.rows[0]
        });
      } catch (updateError) {
        console.error('Error updating appointment status:', updateError);
        res.status(500).json({ error: `Error updating appointment: ${updateError.message}` });
      }
    } catch (checkError) {
      console.error('Error checking appointment:', checkError);
      res.status(500).json({ error: `Error checking appointment: ${checkError.message}` });
    }
  } catch (error) {
    console.error('Error approving appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Reject appointment
const rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // First, check if the appointment exists
    const checkResult = await pool.query(`
      SELECT a.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             cr.name as craftsman_name, cr.phone as craftsman_phone,
             u.email as craftsman_email
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN craftsmen cr ON a.craftsman_id = cr.id
      JOIN users u ON cr.user_id = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const appointment = checkResult.rows[0];
    
    // Check if the appointment is already rejected
    if (appointment.approval_status === 'rejected') {
      return res.status(400).json({ error: 'Appointment is already rejected' });
    }
    
    // Update the approval status
    const result = await pool.query(`
      UPDATE appointments
      SET approval_status = 'rejected', 
          status = 'cancelled',
          notes = CASE 
                    WHEN notes = '' OR notes IS NULL THEN $2
                    ELSE notes || ' | Rejection reason: ' || $2
                  END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, reason || 'No reason provided']);
    
    // Send rejection email to customer
    try {
      await emailService.sendAppointmentRejectionEmail(appointment, reason);
    } catch (emailError) {
      console.error('Error sending customer rejection email:', emailError);
      // We don't want to fail the API call if email sending fails
    }
    
    res.json({
      message: 'Appointment rejected successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error rejecting appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Complete appointment
const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    console.log('Completing appointment:', id, 'with data:', req.body);
    
    // First, check if the appointment exists
    const checkResult = await pool.query(`
      SELECT a.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             cr.name as craftsman_name, cr.phone as craftsman_phone,
             u.email as craftsman_email
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN craftsmen cr ON a.craftsman_id = cr.id
      JOIN users u ON cr.user_id = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const appointment = checkResult.rows[0];
    
    // Update the appointment status
    const result = await pool.query(`
      UPDATE appointments
      SET status = $2, 
          notes = CASE 
                    WHEN notes = '' OR notes IS NULL THEN $3
                    ELSE notes || ' | Completion notes: ' || $3
                  END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, status || 'completed', notes || 'Appointment completed']);
    
    // Send completion email to customer
    try {
      await emailService.sendAppointmentCompletionEmail(appointment);
    } catch (emailError) {
      console.error('Error sending customer completion email:', emailError);
      // We don't want to fail the API call if email sending fails
    }
    
    res.json({
      message: 'Appointment completed successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  approveAppointment,
  rejectAppointment,
  completeAppointment
};