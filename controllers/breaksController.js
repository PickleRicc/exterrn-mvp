const db = require('../db');
const timeCalc = require('../utils/timeCalculations');
const timeValidation = require('../utils/timeValidation');

// Add a break to a time entry
const addBreak = async (req, res) => {
  try {
    const { timeEntryId } = req.params;
    const { start_time, end_time, duration_minutes, reason } = req.body;
    const craftsmanId = req.user.id;
    
    // Check if time entry exists and belongs to this craftsman
    const timeEntryCheck = await db.query(
      'SELECT * FROM time_entries WHERE id = $1 AND craftsman_id = $2',
      [timeEntryId, craftsmanId]
    );
    
    if (timeEntryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Zeiteintrag nicht gefunden oder gehört nicht zu diesem Handwerker.' });
    }
    
    const timeEntry = timeEntryCheck.rows[0];
    
    // Comprehensive validation of the break
    const breakData = {
      start_time,
      end_time,
      duration_minutes,
      reason
    };
    
    // Validate break timing and fields
    const validationResult = timeValidation.validateBreak(breakData);
    if (validationResult) {
      return res.status(400).json({ error: validationResult.error, warning: validationResult.warning });
    }
    
    // Validate that break is within time entry's timeframe if both have defined timeframes
    if (timeEntry.start_time && timeEntry.end_time) {
      const withinTimeEntryResult = timeValidation.validateBreakWithinTimeEntry(breakData, timeEntry);
      if (withinTimeEntryResult) {
        return res.status(400).json({ error: withinTimeEntryResult.error });
      }
    }
    
    // If end_time is provided, calculate duration if not provided
    let calculatedDuration = duration_minutes;
    if (end_time && !duration_minutes) {
      calculatedDuration = timeCalc.calculateDurationInMinutes(start_time, end_time);
    }
    
    const result = await db.query(
      `INSERT INTO breaks (
        time_entry_id,
        start_time,
        end_time,
        duration_minutes,
        reason
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        timeEntryId,
        start_time,
        end_time || null,
        calculatedDuration || null,
        reason || null
      ]
    );
    
    // Update the time entry's duration if the break has ended
    if (end_time && calculatedDuration) {
      // Get current duration from time entry
      const timeEntry = timeEntryCheck.rows[0];
      if (timeEntry.duration_minutes) {
        // Subtract the break duration from the time entry duration
        const newDuration = Math.max(0, timeEntry.duration_minutes - calculatedDuration);
        await db.query(
          'UPDATE time_entries SET duration_minutes = $1 WHERE id = $2',
          [newDuration, timeEntryId]
        );
      }
    }
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding break:', error);
    return res.status(500).json({ error: 'Fehler beim Hinzufügen der Pause.' });
  }
};

// Update an existing break
const updateBreak = async (req, res) => {
  try {
    const { timeEntryId, breakId } = req.params;
    const { start_time, end_time, duration_minutes, reason } = req.body;
    const craftsmanId = req.user.id;
    
    // Check if time entry exists and belongs to this craftsman
    const timeEntryCheck = await db.query(
      'SELECT * FROM time_entries WHERE id = $1 AND craftsman_id = $2',
      [timeEntryId, craftsmanId]
    );
    
    if (timeEntryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Zeiteintrag nicht gefunden oder gehört nicht zu diesem Handwerker.' });
    }
    
    // Check if break exists and belongs to this time entry
    const breakCheck = await db.query(
      'SELECT * FROM breaks WHERE id = $1 AND time_entry_id = $2',
      [breakId, timeEntryId]
    );
    
    if (breakCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pause nicht gefunden oder gehört nicht zu diesem Zeiteintrag.' });
    }
    
    // Get original break data to calculate the time difference
    const originalBreak = breakCheck.rows[0];
    const originalDuration = originalBreak.duration_minutes || 0;
    
    // Comprehensive validation of the break update
    const breakData = {
      id: breakId,
      start_time: start_time || originalBreak.start_time,
      end_time: end_time || originalBreak.end_time,
      duration_minutes: duration_minutes !== undefined ? duration_minutes : originalBreak.duration_minutes,
      reason: reason || originalBreak.reason
    };
    
    // Validate break timing and fields
    const validationResult = timeValidation.validateBreak(breakData, originalBreak);
    if (validationResult) {
      return res.status(400).json({ error: validationResult.error, warning: validationResult.warning });
    }
    
    // Validate that break is within time entry's timeframe
    // Get the time entry details
    const timeEntryDetails = await db.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [timeEntryId]
    );
    
    if (timeEntryDetails.rows.length > 0 && timeEntryDetails.rows[0].start_time && timeEntryDetails.rows[0].end_time) {
      const timeEntry = timeEntryDetails.rows[0];
      const withinTimeEntryResult = timeValidation.validateBreakWithinTimeEntry(breakData, timeEntry);
      
      if (withinTimeEntryResult) {
        return res.status(400).json({ error: withinTimeEntryResult.error });
      }
    }
    
    // If end_time is provided, calculate duration if not provided
    let calculatedDuration = duration_minutes;
    if (end_time && !duration_minutes) {
      const startTimeToUse = start_time || originalBreak.start_time;
      calculatedDuration = timeCalc.calculateDurationInMinutes(startTimeToUse, end_time);
      
      if (calculatedDuration === null) {
        calculatedDuration = originalDuration; // Fall back to original duration if calculation fails
      }
    }
    
    const result = await db.query(
      `UPDATE breaks SET
        start_time = COALESCE($1, start_time),
        end_time = COALESCE($2, end_time),
        duration_minutes = COALESCE($3, duration_minutes),
        reason = COALESCE($4, reason)
      WHERE id = $5 AND time_entry_id = $6
      RETURNING *`,
      [
        start_time,
        end_time,
        calculatedDuration !== undefined ? calculatedDuration : null,
        reason,
        breakId,
        timeEntryId
      ]
    );
    
    // Update the time entry's duration if the break duration has changed
    if (calculatedDuration !== undefined && calculatedDuration !== originalDuration) {
      const timeEntry = timeEntryCheck.rows[0];
      if (timeEntry.duration_minutes) {
        // Adjust the time entry duration by the difference in break duration
        const durationDifference = originalDuration - calculatedDuration;
        const newDuration = Math.max(0, timeEntry.duration_minutes + durationDifference);
        await db.query(
          'UPDATE time_entries SET duration_minutes = $1 WHERE id = $2',
          [newDuration, timeEntryId]
        );
      }
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating break:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren der Pause.' });
  }
};

// Delete a break
const deleteBreak = async (req, res) => {
  try {
    const { timeEntryId, breakId } = req.params;
    const craftsmanId = req.user.id;
    
    // Check if time entry exists and belongs to this craftsman
    const timeEntryCheck = await db.query(
      'SELECT * FROM time_entries WHERE id = $1 AND craftsman_id = $2',
      [timeEntryId, craftsmanId]
    );
    
    if (timeEntryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Zeiteintrag nicht gefunden oder gehört nicht zu diesem Handwerker.' });
    }
    
    // Check if break exists and belongs to this time entry
    const breakCheck = await db.query(
      'SELECT * FROM breaks WHERE id = $1 AND time_entry_id = $2',
      [breakId, timeEntryId]
    );
    
    if (breakCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pause nicht gefunden oder gehört nicht zu diesem Zeiteintrag.' });
    }
    
    // Get break duration to adjust the time entry duration
    const deletedBreak = breakCheck.rows[0];
    const breakDuration = deletedBreak.duration_minutes || 0;
    
    // Delete the break
    await db.query(
      'DELETE FROM breaks WHERE id = $1 AND time_entry_id = $2',
      [breakId, timeEntryId]
    );
    
    // Update the time entry's duration if the break had a duration
    if (breakDuration > 0) {
      const timeEntry = timeEntryCheck.rows[0];
      if (timeEntry.duration_minutes) {
        // Add the break duration back to the time entry duration
        const newDuration = timeEntry.duration_minutes + breakDuration;
        await db.query(
          'UPDATE time_entries SET duration_minutes = $1 WHERE id = $2',
          [newDuration, timeEntryId]
        );
      }
    }
    
    return res.status(200).json({ message: 'Pause erfolgreich gelöscht.' });
  } catch (error) {
    console.error('Error deleting break:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen der Pause.' });
  }
};

// Get all breaks for a time entry
const getBreaks = async (req, res) => {
  try {
    const { timeEntryId } = req.params;
    const craftsmanId = req.user.id;
    
    // Check if time entry exists and belongs to this craftsman
    const timeEntryCheck = await db.query(
      'SELECT * FROM time_entries WHERE id = $1 AND craftsman_id = $2',
      [timeEntryId, craftsmanId]
    );
    
    if (timeEntryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Zeiteintrag nicht gefunden oder gehört nicht zu diesem Handwerker.' });
    }
    
    // Get all breaks for this time entry
    const result = await db.query(
      'SELECT * FROM breaks WHERE time_entry_id = $1 ORDER BY start_time',
      [timeEntryId]
    );
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting breaks:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Pausen.' });
  }
};

module.exports = {
  addBreak,
  updateBreak,
  deleteBreak,
  getBreaks
};
