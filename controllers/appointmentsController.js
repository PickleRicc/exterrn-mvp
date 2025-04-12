const pool = require('../db');
const emailService = require('../services/emailService');

// Get all appointments with customer data
const getAllAppointments = async (req, res) => {
  try {
    const { date, approval_status, service_type } = req.query;
    
    let queryText = `
      SELECT a.*, c.name as customer_name, c.phone as customer_phone, 
             cr.name as craftsman_name, cr.specialty
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN craftsmen cr ON a.craftsman_id = cr.id
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    let whereClauseAdded = false;
    
    if (date) {
      queryParams.push(date);
      queryText += ` WHERE DATE(scheduled_at) = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    if (approval_status) {
      queryParams.push(approval_status);
      queryText += whereClauseAdded ? ` AND approval_status = $${paramIndex++}` : ` WHERE approval_status = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    if (service_type) {
      queryParams.push(service_type);
      queryText += whereClauseAdded ? ` AND a.service_type = $${paramIndex++}` : ` WHERE a.service_type = $${paramIndex++}`;
    }
    
    // If user is a craftsman, only show their appointments
    if (req.user && req.user.role === 'craftsman' && req.user.craftsmanId) {
      queryParams.push(req.user.craftsmanId);
      queryText += whereClauseAdded ? ` AND a.craftsman_id = $${paramIndex++}` : ` WHERE a.craftsman_id = $${paramIndex++}`;
    }
    
    queryText += ` ORDER BY a.scheduled_at DESC`;
    
    const result = await pool.query(queryText, queryParams);
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
      SELECT a.*, c.name as customer_name, c.phone as customer_phone,
             cr.name as craftsman_name, cr.specialty,
             cs.name as space_name, cs.type as space_type, cs.area_sqm as space_area
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN craftsmen cr ON a.craftsman_id = cr.id
      LEFT JOIN customer_spaces cs ON a.customer_space_id = cs.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Get materials for this appointment if any
    const materialsResult = await pool.query(`
      SELECT m.*, am.quantity
      FROM appointment_materials am
      JOIN materials m ON am.material_id = m.id
      WHERE am.appointment_id = $1
    `, [id]);
    
    const appointment = result.rows[0];
    appointment.materials = materialsResult.rows;
    
    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new appointment
const createAppointment = async (req, res) => {
  try {
    const { 
      customer_id, 
      scheduled_at, 
      notes, 
      craftsman_id, 
      duration, 
      location, 
      status, 
      approval_status,
      service_type,
      area_size_sqm,
      material_notes,
      customer_space_id,
      materials
    } = req.body;
    
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
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // Set default approval_status to 'pending' for appointments created via API
    const appointmentApprovalStatus = approval_status || 'pending';
    
    // Insert the appointment
    const result = await pool.query(`
      INSERT INTO appointments (
        customer_id, 
        scheduled_at, 
        notes, 
        craftsman_id, 
        duration, 
        location, 
        status, 
        approval_status,
        service_type,
        area_size_sqm,
        material_notes,
        customer_space_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      customer_id, 
      scheduled_at, 
      notes || '', 
      craftsman_id, 
      duration || 60, 
      location || '', 
      status || 'scheduled',
      appointmentApprovalStatus,
      service_type || null,
      area_size_sqm || null,
      material_notes || null,
      customer_space_id || null
    ]);
    
    const appointmentId = result.rows[0].id;
    
    // If materials are provided, add them to the appointment
    if (materials && Array.isArray(materials) && materials.length > 0) {
      for (const material of materials) {
        await pool.query(`
          INSERT INTO appointment_materials (appointment_id, material_id, quantity)
          VALUES ($1, $2, $3)
        `, [appointmentId, material.id, material.quantity]);
      }
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
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
    // Rollback transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_id, 
      scheduled_at, 
      notes, 
      craftsman_id, 
      duration, 
      location, 
      status,
      service_type,
      area_size_sqm,
      material_notes,
      customer_space_id,
      materials
    } = req.body;
    
    // Check if appointment exists
    const checkResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // Build dynamic update query
    let query = 'UPDATE appointments SET ';
    const queryParams = [];
    const updateFields = [];
    let paramIndex = 1;
    
    if (customer_id !== undefined) {
      updateFields.push(`customer_id = $${paramIndex}`);
      queryParams.push(customer_id);
      paramIndex++;
    }
    
    if (scheduled_at !== undefined) {
      updateFields.push(`scheduled_at = $${paramIndex}`);
      queryParams.push(scheduled_at);
      paramIndex++;
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      queryParams.push(notes);
      paramIndex++;
    }
    
    if (craftsman_id !== undefined) {
      updateFields.push(`craftsman_id = $${paramIndex}`);
      queryParams.push(craftsman_id);
      paramIndex++;
    }
    
    if (duration !== undefined) {
      updateFields.push(`duration = $${paramIndex}`);
      queryParams.push(duration);
      paramIndex++;
    }
    
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex}`);
      queryParams.push(location);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (service_type !== undefined) {
      updateFields.push(`service_type = $${paramIndex}`);
      queryParams.push(service_type);
      paramIndex++;
    }
    
    if (area_size_sqm !== undefined) {
      updateFields.push(`area_size_sqm = $${paramIndex}`);
      queryParams.push(area_size_sqm);
      paramIndex++;
    }
    
    if (material_notes !== undefined) {
      updateFields.push(`material_notes = $${paramIndex}`);
      queryParams.push(material_notes);
      paramIndex++;
    }
    
    if (customer_space_id !== undefined) {
      updateFields.push(`customer_space_id = $${paramIndex}`);
      queryParams.push(customer_space_id);
      paramIndex++;
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    query += updateFields.join(', ');
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    queryParams.push(id);
    
    const result = await pool.query(query, queryParams);
    
    // Update materials if provided
    if (materials && Array.isArray(materials)) {
      // First, remove existing materials
      await pool.query('DELETE FROM appointment_materials WHERE appointment_id = $1', [id]);
      
      // Then add the new ones
      for (const material of materials) {
        await pool.query(`
          INSERT INTO appointment_materials (appointment_id, material_id, quantity)
          VALUES ($1, $2, $3)
        `, [id, material.id, material.quantity]);
      }
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    res.json(result.rows[0]);
  } catch (error) {
    // Rollback transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // First delete any related materials
    await pool.query('DELETE FROM appointment_materials WHERE appointment_id = $1', [id]);
    
    // Then delete the appointment
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 RETURNING *',
      [id]
    );
    
    // Commit transaction
    await pool.query('COMMIT');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully', appointment: result.rows[0] });
  } catch (error) {
    // Rollback transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Approve appointment
const approveAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, check if the appointment exists and get its details
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
    
    // Check if the appointment is already approved
    if (appointment.approval_status === 'approved') {
      return res.status(400).json({ error: 'Appointment is already approved' });
    }
    
    // Update the approval status
    const result = await pool.query(`
      UPDATE appointments
      SET approval_status = 'approved', 
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    // Send approval email to customer
    try {
      await emailService.sendAppointmentApprovalEmail(appointment);
    } catch (emailError) {
      console.error('Error sending customer approval email:', emailError);
      // We don't want to fail the API call if email sending fails
    }
    
    res.json({
      message: 'Appointment approved successfully',
      appointment: result.rows[0]
    });
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

// Get appointment materials
const getAppointmentMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT m.*, am.quantity
      FROM appointment_materials am
      JOIN materials m ON am.material_id = m.id
      WHERE am.appointment_id = $1
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointment materials:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update appointment materials
const updateAppointmentMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const { materials } = req.body;
    
    if (!materials || !Array.isArray(materials)) {
      return res.status(400).json({ error: 'Materials array is required' });
    }
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // First, remove existing materials
    await pool.query('DELETE FROM appointment_materials WHERE appointment_id = $1', [id]);
    
    // Then add the new ones
    for (const material of materials) {
      await pool.query(`
        INSERT INTO appointment_materials (appointment_id, material_id, quantity)
        VALUES ($1, $2, $3)
      `, [id, material.id, material.quantity]);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    // Get the updated materials
    const result = await pool.query(`
      SELECT m.*, am.quantity
      FROM appointment_materials am
      JOIN materials m ON am.material_id = m.id
      WHERE am.appointment_id = $1
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    // Rollback transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error updating appointment materials:', error);
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
  getAppointmentMaterials,
  updateAppointmentMaterials
};
