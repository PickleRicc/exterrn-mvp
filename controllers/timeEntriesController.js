const pool = require('../db');

// Get all time entries with filters
const getAllTimeEntries = async (req, res) => {
  try {
    const { craftsman_id, start_date, end_date, appointment_id, status } = req.query;
    
    console.log('Request query params for time entries:', req.query);
    
    let queryText = `
      SELECT t.*, a.title as appointment_title, a.scheduled_at as appointment_date
      FROM time_entries t
      LEFT JOIN appointments a ON t.appointment_id = a.id
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    let whereClauseAdded = false;
    
    // Filter by craftsman_id (important for security)
    if (craftsman_id) {
      queryParams.push(craftsman_id);
      queryText += ` WHERE t.craftsman_id = $${paramIndex++}`;
      whereClauseAdded = true;
      console.log('Filtering time entries by craftsman_id:', craftsman_id);
    }
    
    // Filter by date range
    if (start_date) {
      queryParams.push(start_date);
      queryText += whereClauseAdded ? ` AND DATE(t.start_time) >= $${paramIndex++}` : ` WHERE DATE(t.start_time) >= $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    if (end_date) {
      queryParams.push(end_date);
      queryText += whereClauseAdded ? ` AND DATE(t.start_time) <= $${paramIndex++}` : ` WHERE DATE(t.start_time) <= $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    // Filter by appointment
    if (appointment_id) {
      queryParams.push(appointment_id);
      queryText += whereClauseAdded ? ` AND t.appointment_id = $${paramIndex++}` : ` WHERE t.appointment_id = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    // Filter by status
    if (status) {
      queryParams.push(status);
      queryText += whereClauseAdded ? ` AND t.status = $${paramIndex++}` : ` WHERE t.status = $${paramIndex++}`;
      whereClauseAdded = true;
    }
    
    // Order by most recent start time
    queryText += ` ORDER BY t.start_time DESC`;
    
    console.log('Final time entries query:', queryText);
    console.log('Query parameters:', queryParams);
    
    const result = await pool.query(queryText, queryParams);
    console.log('Query returned', result.rows.length, 'time entries');
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get time entry by ID
const getTimeEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, a.title as appointment_title, a.scheduled_at as appointment_date
      FROM time_entries t
      LEFT JOIN appointments a ON t.appointment_id = a.id
      WHERE t.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new time entry
const createTimeEntry = async (req, res) => {
  try {
    const { 
      craftsman_id, 
      appointment_id, 
      start_time, 
      end_time, 
      break_duration, 
      description, 
      billable,
      status
    } = req.body;
    
    // Validate required fields
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    if (!start_time) {
      return res.status(400).json({ error: 'start_time is required' });
    }
    
    // Create the time entry
    const result = await pool.query(`
      INSERT INTO time_entries (
        craftsman_id, 
        appointment_id, 
        start_time, 
        end_time, 
        break_duration, 
        description, 
        billable,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      craftsman_id,
      appointment_id || null,
      start_time,
      end_time || null,
      break_duration || 0,
      description || '',
      billable !== undefined ? billable : true,
      status || 'active'
    ]);
    
    res.status(201).json({
      message: 'Zeit erfolgreich erfasst',
      timeEntry: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update time entry
const updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      appointment_id, 
      start_time, 
      end_time, 
      break_duration, 
      description, 
      billable,
      status
    } = req.body;
    
    // First check if the time entry exists and belongs to the craftsman
    const checkResult = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zeit-Eintrag nicht gefunden' });
    }
    
    // Update the time entry
    const result = await pool.query(`
      UPDATE time_entries
      SET appointment_id = COALESCE($1, appointment_id),
          start_time = COALESCE($2, start_time),
          end_time = $3,
          break_duration = COALESCE($4, break_duration),
          description = COALESCE($5, description),
          billable = COALESCE($6, billable),
          status = COALESCE($7, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      appointment_id !== undefined ? appointment_id : null,
      start_time || null,
      end_time !== undefined ? end_time : null,  // Allow setting to null
      break_duration !== undefined ? break_duration : null,
      description || null,
      billable !== undefined ? billable : null,
      status || null,
      id
    ]);
    
    res.json({
      message: 'Zeit-Eintrag wurde aktualisiert',
      timeEntry: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete time entry
const deleteTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the time entry exists
    const checkResult = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zeit-Eintrag nicht gefunden' });
    }
    
    // Delete the time entry
    await pool.query('DELETE FROM time_entries WHERE id = $1', [id]);
    
    res.json({
      message: 'Zeit-Eintrag wurde gelöscht',
      id: id
    });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

// Start a new time tracking session
const startTimeTracking = async (req, res) => {
  try {
    const { craftsman_id, appointment_id, description } = req.body;
    
    // Validate required field
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if there's already an active time tracking session for this craftsman
    const activeSessionResult = await pool.query(
      'SELECT * FROM time_entries WHERE craftsman_id = $1 AND end_time IS NULL AND status = $2',
      [craftsman_id, 'active']
    );
    
    if (activeSessionResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Es gibt bereits eine aktive Zeitmessung. Bitte beende diese, bevor du eine neue startest.' 
      });
    }
    
    // Create the new time entry
    const result = await pool.query(`
      INSERT INTO time_entries (
        craftsman_id,
        appointment_id,
        start_time,
        description,
        status
      )
      VALUES ($1, $2, NOW(), $3, $4)
      RETURNING *
    `, [
      craftsman_id,
      appointment_id || null,
      description || '',
      'active'
    ]);
    
    res.status(201).json({
      message: 'Zeitmessung gestartet',
      timeEntry: result.rows[0]
    });
  } catch (error) {
    console.error('Error starting time tracking:', error);
    res.status(500).json({ error: error.message });
  }
};

// Stop an active time tracking session
const stopTimeTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { break_duration, description } = req.body;
    
    // First check if the time entry exists and is active
    const checkResult = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zeit-Eintrag nicht gefunden' });
    }
    
    const timeEntry = checkResult.rows[0];
    
    if (timeEntry.end_time) {
      return res.status(400).json({ error: 'Diese Zeitmessung wurde bereits beendet' });
    }
    
    // Update the time entry with end time and change status to completed
    const result = await pool.query(`
      UPDATE time_entries
      SET end_time = NOW(),
          break_duration = $1,
          description = CASE WHEN $2 IS NOT NULL AND $2 != '' THEN $2 ELSE description END,
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [
      break_duration || 0,
      description,
      id
    ]);
    
    res.json({
      message: 'Zeitmessung beendet',
      timeEntry: result.rows[0]
    });
  } catch (error) {
    console.error('Error stopping time tracking:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get time tracking analytics
const getTimeAnalytics = async (req, res) => {
  try {
    const { craftsman_id, start_date, end_date } = req.query;
    
    // Validate required parameters
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Default to current month if no date range is provided
    const today = new Date();
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startDateParam = start_date || defaultStartDate.toISOString().split('T')[0];
    const endDateParam = end_date || defaultEndDate.toISOString().split('T')[0];
    
    // Calculate total hours, billable hours, etc.
    const queryText = `
      SELECT
        COUNT(*) as total_entries,
        SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600) as total_hours,
        SUM(
          CASE 
            WHEN billable = TRUE THEN EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600
            ELSE 0
          END
        ) as billable_hours,
        SUM(break_duration) / 60.0 as total_break_hours
      FROM time_entries
      WHERE craftsman_id = $1
        AND DATE(start_time) >= $2
        AND DATE(start_time) <= $3
    `;
    
    const result = await pool.query(queryText, [craftsman_id, startDateParam, endDateParam]);
    
    // Additional query to get hours by day
    const hoursByDayQuery = `
      SELECT 
        DATE(start_time) as date,
        SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600) as hours
      FROM time_entries
      WHERE craftsman_id = $1
        AND DATE(start_time) >= $2
        AND DATE(start_time) <= $3
      GROUP BY DATE(start_time)
      ORDER BY DATE(start_time)
    `;
    
    const hoursByDayResult = await pool.query(hoursByDayQuery, [craftsman_id, startDateParam, endDateParam]);
    
    res.json({
      summary: result.rows[0],
      hoursByDay: hoursByDayResult.rows
    });
  } catch (error) {
    console.error('Error getting time analytics:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  startTimeTracking,
  stopTimeTracking,
  getTimeAnalytics
};
