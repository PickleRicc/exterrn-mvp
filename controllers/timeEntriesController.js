const db = require('../db');
const timeCalc = require('../utils/timeCalculations');
const timeValidation = require('../utils/timeValidation');

// Get all time entries with optional filtering
const getAllTimeEntries = async (req, res) => {
  try {
    const craftsmanId = req.user.id; // From auth middleware
    
    // Build query with filters
    let query = `
      SELECT te.*, 
        a.title as appointment_title,
        c.name as customer_name
      FROM time_entries te
      LEFT JOIN appointments a ON te.appointment_id = a.id
      LEFT JOIN customers c ON te.customer_id = c.id
      WHERE te.craftsman_id = $1
    `;
    
    const queryParams = [craftsmanId];
    let paramCounter = 2;
    
    // Add date range filter
    if (req.query.startDate && req.query.endDate) {
      query += ` AND te.start_time >= $${paramCounter} AND te.start_time <= $${paramCounter + 1}`;
      queryParams.push(req.query.startDate);
      queryParams.push(req.query.endDate);
      paramCounter += 2;
    }
    
    // Add customer filter
    if (req.query.customerId) {
      query += ` AND te.customer_id = $${paramCounter}`;
      queryParams.push(req.query.customerId);
      paramCounter++;
    }
    
    // Add appointment filter
    if (req.query.appointmentId) {
      query += ` AND te.appointment_id = $${paramCounter}`;
      queryParams.push(req.query.appointmentId);
      paramCounter++;
    }

    // Add billable filter
    if (req.query.isBillable !== undefined) {
      const isBillable = req.query.isBillable === 'true';
      query += ` AND te.is_billable = $${paramCounter}`;
      queryParams.push(isBillable);
      paramCounter++;
    }
    
    // Add order by
    query += ' ORDER BY te.start_time DESC';
    
    const result = await db.query(query, queryParams);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting time entries:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Zeiteinträge.' });
  }
};

// Get a single time entry by ID with related breaks
const getTimeEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const craftsmanId = req.user.id;
    
    // Get time entry
    const timeEntryResult = await db.query(
      `SELECT te.*, 
        a.title as appointment_title,
        c.name as customer_name
      FROM time_entries te
      LEFT JOIN appointments a ON te.appointment_id = a.id
      LEFT JOIN customers c ON te.customer_id = c.id
      WHERE te.id = $1 AND te.craftsman_id = $2`,
      [id, craftsmanId]
    );
    
    if (timeEntryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zeiteintrag nicht gefunden.' });
    }
    
    const timeEntry = timeEntryResult.rows[0];
    
    // Get related breaks
    const breaksResult = await db.query(
      'SELECT * FROM breaks WHERE time_entry_id = $1 ORDER BY start_time',
      [id]
    );
    
    timeEntry.breaks = breaksResult.rows;
    
    return res.status(200).json(timeEntry);
  } catch (error) {
    console.error('Error getting time entry:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen des Zeiteintrags.' });
  }
};

// Create a new time entry
const createTimeEntry = async (req, res) => {
  try {
    const craftsmanId = req.user.id;
    const {
      appointment_id,
      customer_id,
      description,
      start_time,
      end_time,
      duration_minutes,
      is_billable,
      hourly_rate,
      notes
    } = req.body;
    
    // Comprehensive validation of the time entry
    const timeEntryData = {
      start_time,
      end_time,
      duration_minutes,
      hourly_rate
    };
    
    const validationResult = timeValidation.validateTimeEntry(timeEntryData);
    if (validationResult) {
      return res.status(400).json({ error: validationResult.error, warning: validationResult.warning });
    }
    
    // Check for overlapping time entries if end time is provided
    if (end_time) {
      // Get existing time entries for this craftsman on the same day
      const startDate = new Date(start_time);
      const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).toISOString();
      const dayEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1).toISOString();
      
      const existingEntries = await db.query(
        'SELECT * FROM time_entries WHERE craftsman_id = $1 AND start_time >= $2 AND start_time < $3',
        [craftsmanId, dayStart, dayEnd]
      );
      
      if (existingEntries.rows.length > 0) {
        const overlapResult = timeValidation.validateTimeEntryOverlaps(
          { start_time, end_time },
          existingEntries.rows
        );
        
        if (overlapResult && overlapResult.error) {
          return res.status(400).json(overlapResult);
        }
      }
    }
    
    // If end_time is provided, calculate duration if not provided
    let calculatedDuration = duration_minutes;
    if (end_time && !duration_minutes) {
      calculatedDuration = timeCalc.calculateDurationInMinutes(start_time, end_time);
    }
    
    const result = await db.query(
      `INSERT INTO time_entries (
        craftsman_id,
        appointment_id,
        customer_id,
        description,
        start_time,
        end_time,
        duration_minutes,
        is_billable,
        hourly_rate,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        craftsmanId,
        appointment_id || null,
        customer_id || null,
        description || null,
        start_time,
        end_time || null,
        calculatedDuration || null,
        is_billable !== undefined ? is_billable : true,
        hourly_rate || null,
        notes || null
      ]
    );
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating time entry:', error);
    return res.status(500).json({ error: 'Fehler beim Erstellen des Zeiteintrags.' });
  }
};

// Update an existing time entry
const updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const craftsmanId = req.user.id;
    const {
      appointment_id,
      customer_id,
      description,
      start_time,
      end_time,
      duration_minutes,
      is_billable,
      hourly_rate,
      notes
    } = req.body;
    
    // Check if time entry exists and belongs to this craftsman
    const checkResult = await db.query(
      'SELECT * FROM time_entries WHERE id = $1 AND craftsman_id = $2',
      [id, craftsmanId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zeiteintrag nicht gefunden oder gehört nicht zu diesem Handwerker.' });
    }
    
    const existingEntry = checkResult.rows[0];
    
    // Comprehensive validation of the time entry, using existing entry for context
    const timeEntryData = {
      id: id, // Include ID for overlap checking to exclude self
      start_time: start_time || existingEntry.start_time,
      end_time: end_time || existingEntry.end_time,
      duration_minutes: duration_minutes !== undefined ? duration_minutes : existingEntry.duration_minutes,
      hourly_rate: hourly_rate !== undefined ? hourly_rate : existingEntry.hourly_rate
    };
    
    const validationResult = timeValidation.validateTimeEntry(timeEntryData, existingEntry);
    if (validationResult) {
      return res.status(400).json({ error: validationResult.error, warning: validationResult.warning });
    }
    
    // Check for overlapping time entries if changing times
    if (start_time || end_time) {
      // Get existing time entries for this craftsman on the same day
      const startTimeToUse = start_time || existingEntry.start_time;
      const startDate = new Date(startTimeToUse);
      const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).toISOString();
      const dayEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1).toISOString();
      
      const existingEntries = await db.query(
        'SELECT * FROM time_entries WHERE craftsman_id = $1 AND start_time >= $2 AND start_time < $3',
        [craftsmanId, dayStart, dayEnd]
      );
      
      if (existingEntries.rows.length > 0) {
        const overlapResult = timeValidation.validateTimeEntryOverlaps(
          timeEntryData,
          existingEntries.rows
        );
        
        if (overlapResult && overlapResult.error) {
          return res.status(400).json(overlapResult);
        }
      }
    }
    
    // If end_time is provided, calculate duration if not provided
    let calculatedDuration = duration_minutes;
    if (end_time && !duration_minutes) {
      const startTimeToUse = start_time || existingEntry.start_time;
      calculatedDuration = timeCalc.calculateDurationInMinutes(startTimeToUse, end_time);
    }
    
    const result = await db.query(
      `UPDATE time_entries SET
        appointment_id = COALESCE($1, appointment_id),
        customer_id = COALESCE($2, customer_id),
        description = COALESCE($3, description),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        duration_minutes = COALESCE($6, duration_minutes),
        is_billable = COALESCE($7, is_billable),
        hourly_rate = COALESCE($8, hourly_rate),
        notes = COALESCE($9, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND craftsman_id = $11
      RETURNING *`,
      [
        appointment_id !== undefined ? appointment_id : null,
        customer_id !== undefined ? customer_id : null,
        description,
        start_time,
        end_time,
        calculatedDuration !== undefined ? calculatedDuration : null,
        is_billable !== undefined ? is_billable : null,
        hourly_rate,
        notes,
        id,
        craftsmanId
      ]
    );
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating time entry:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren des Zeiteintrags.' });
  }
};

// Delete a time entry
const deleteTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const craftsmanId = req.user.id;
    
    // Check if time entry exists and belongs to this craftsman
    const checkResult = await db.query(
      'SELECT * FROM time_entries WHERE id = $1 AND craftsman_id = $2',
      [id, craftsmanId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zeiteintrag nicht gefunden oder gehört nicht zu diesem Handwerker.' });
    }
    
    // Delete related breaks first (cascade should handle this but just to be safe)
    await db.query('DELETE FROM breaks WHERE time_entry_id = $1', [id]);
    
    // Delete the time entry
    await db.query(
      'DELETE FROM time_entries WHERE id = $1 AND craftsman_id = $2',
      [id, craftsmanId]
    );
    
    return res.status(200).json({ message: 'Zeiteintrag erfolgreich gelöscht.' });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen des Zeiteintrags.' });
  }
};

// Get time entry summary/statistics
const getTimeEntryStats = async (req, res) => {
  try {
    const craftsmanId = req.user.id;
    const { startDate, endDate, customerId } = req.query;
    
    // Default to current month if no dates provided
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    const queryStartDate = startDate || firstDayOfMonth.toISOString();
    const queryEndDate = endDate || lastDayOfMonth.toISOString();
    
    let queryParams = [craftsmanId, queryStartDate, queryEndDate];
    let customerFilter = '';
    
    if (customerId) {
      customerFilter = ' AND customer_id = $4';
      queryParams.push(customerId);
    }
    
    // Get total hours, billable hours, and earned amount
    const statsResult = await db.query(
      `SELECT 
        SUM(duration_minutes) AS total_minutes,
        SUM(CASE WHEN is_billable THEN duration_minutes ELSE 0 END) AS billable_minutes,
        SUM(CASE WHEN is_billable THEN duration_minutes * hourly_rate / 60 ELSE 0 END) AS earned_amount
      FROM time_entries
      WHERE craftsman_id = $1 
        AND start_time >= $2 
        AND start_time <= $3
        ${customerFilter}`,
      queryParams
    );
    
    // Count entries by customer
    const customerBreakdownResult = await db.query(
      `SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        COUNT(te.id) AS entry_count,
        SUM(te.duration_minutes) AS total_minutes
      FROM time_entries te
      JOIN customers c ON te.customer_id = c.id
      WHERE te.craftsman_id = $1 
        AND te.start_time >= $2 
        AND te.start_time <= $3
        ${customerFilter}
      GROUP BY c.id, c.name
      ORDER BY total_minutes DESC`,
      queryParams
    );
    
    // Get entries by day for chart data
    const dailyBreakdownResult = await db.query(
      `SELECT 
        DATE(start_time) AS entry_date,
        SUM(duration_minutes) AS total_minutes
      FROM time_entries
      WHERE craftsman_id = $1 
        AND start_time >= $2 
        AND start_time <= $3
        ${customerFilter}
      GROUP BY DATE(start_time)
      ORDER BY entry_date`,
      queryParams
    );
    
    return res.status(200).json({
      summary: statsResult.rows[0],
      customerBreakdown: customerBreakdownResult.rows,
      dailyBreakdown: dailyBreakdownResult.rows
    });
  } catch (error) {
    console.error('Error getting time entry stats:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Zeitstatistiken.' });
  }
};

module.exports = {
  getAllTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntryStats
};
