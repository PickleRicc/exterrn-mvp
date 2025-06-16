/**
 * Time entry validation utility functions
 */
const timeCalc = require('./timeCalculations');

/**
 * Validates a time entry request (for create or update)
 * @param {Object} timeEntry - The time entry data to validate
 * @param {Object} [existingEntry] - The existing time entry (for updates)
 * @returns {Object|null} Error object if validation fails, null if valid
 */
const validateTimeEntry = (timeEntry, existingEntry = null) => {
  // Required field validation
  if (!timeEntry.start_time && !existingEntry) {
    return { error: 'Startzeit ist erforderlich.' };
  }
  
  // Date format validation
  if (timeEntry.start_time && isNaN(new Date(timeEntry.start_time).getTime())) {
    return { error: 'Ungültiges Startzeit-Format.' };
  }
  
  if (timeEntry.end_time && isNaN(new Date(timeEntry.end_time).getTime())) {
    return { error: 'Ungültiges Endzeit-Format.' };
  }
  
  // Time order validation (start must be before end)
  if (timeEntry.start_time && timeEntry.end_time) {
    const start = new Date(timeEntry.start_time);
    const end = new Date(timeEntry.end_time);
    
    if (start >= end) {
      return { error: 'Startzeit muss vor der Endzeit liegen.' };
    }
  } else if (timeEntry.start_time && existingEntry?.end_time) {
    // For updates: new start with existing end
    const start = new Date(timeEntry.start_time);
    const end = new Date(existingEntry.end_time);
    
    if (start >= end) {
      return { error: 'Startzeit muss vor der Endzeit liegen.' };
    }
  } else if (timeEntry.end_time && existingEntry?.start_time) {
    // For updates: existing start with new end
    const start = new Date(existingEntry.start_time);
    const end = new Date(timeEntry.end_time);
    
    if (start >= end) {
      return { error: 'Startzeit muss vor der Endzeit liegen.' };
    }
  }
  
  // Duration validation
  if (timeEntry.duration_minutes !== undefined) {
    if (isNaN(parseFloat(timeEntry.duration_minutes)) || parseFloat(timeEntry.duration_minutes) < 0) {
      return { error: 'Dauer muss eine positive Zahl sein.' };
    }
  } else if (timeEntry.start_time && timeEntry.end_time) {
    // Calculate and validate duration if not provided
    const duration = timeCalc.calculateDurationInMinutes(timeEntry.start_time, timeEntry.end_time);
    
    if (duration === null || duration <= 0) {
      return { error: 'Ungültige Zeitdauer berechnet. Bitte überprüfen Sie Start- und Endzeit.' };
    }
  }
  
  // Hourly rate validation
  if (timeEntry.hourly_rate !== undefined && timeEntry.hourly_rate !== null) {
    if (isNaN(parseFloat(timeEntry.hourly_rate)) || parseFloat(timeEntry.hourly_rate) < 0) {
      return { error: 'Stundensatz muss eine positive Zahl sein.' };
    }
  }
  
  // Future date validation (optional business rule)
  const now = new Date();
  if (timeEntry.end_time && new Date(timeEntry.end_time) > now) {
    return { warning: 'Endzeit liegt in der Zukunft. Ist das beabsichtigt?' };
  }
  
  // Max duration validation (optional business rule - 24 hours)
  if (timeEntry.start_time && timeEntry.end_time) {
    const duration = timeCalc.calculateDurationInMinutes(timeEntry.start_time, timeEntry.end_time);
    if (duration > 24 * 60) {
      return { warning: 'Zeitraum ist länger als 24 Stunden. Ist das beabsichtigt?' };
    }
  }
  
  // All validations passed
  return null;
};

/**
 * Validates a break entry request
 * @param {Object} breakEntry - The break data to validate
 * @param {Object} [existingBreak] - The existing break entry (for updates)
 * @returns {Object|null} Error object if validation fails, null if valid
 */
const validateBreak = (breakEntry, existingBreak = null) => {
  // Required field validation
  if (!breakEntry.start_time && !existingBreak) {
    return { error: 'Startzeit der Pause ist erforderlich.' };
  }
  
  // Date format validation
  if (breakEntry.start_time && isNaN(new Date(breakEntry.start_time).getTime())) {
    return { error: 'Ungültiges Startzeit-Format für die Pause.' };
  }
  
  if (breakEntry.end_time && isNaN(new Date(breakEntry.end_time).getTime())) {
    return { error: 'Ungültiges Endzeit-Format für die Pause.' };
  }
  
  // Time order validation (start must be before end)
  if (breakEntry.start_time && breakEntry.end_time) {
    const start = new Date(breakEntry.start_time);
    const end = new Date(breakEntry.end_time);
    
    if (start >= end) {
      return { error: 'Pausenstart muss vor dem Pausenende liegen.' };
    }
  } else if (breakEntry.start_time && existingBreak?.end_time) {
    // For updates: new start with existing end
    const start = new Date(breakEntry.start_time);
    const end = new Date(existingBreak.end_time);
    
    if (start >= end) {
      return { error: 'Pausenstart muss vor dem Pausenende liegen.' };
    }
  } else if (breakEntry.end_time && existingBreak?.start_time) {
    // For updates: existing start with new end
    const start = new Date(existingBreak.start_time);
    const end = new Date(breakEntry.end_time);
    
    if (start >= end) {
      return { error: 'Pausenstart muss vor dem Pausenende liegen.' };
    }
  }
  
  // Duration validation
  if (breakEntry.duration_minutes !== undefined) {
    if (isNaN(parseFloat(breakEntry.duration_minutes)) || parseFloat(breakEntry.duration_minutes) < 0) {
      return { error: 'Pausendauer muss eine positive Zahl sein.' };
    }
  } else if (breakEntry.start_time && breakEntry.end_time) {
    // Calculate and validate duration if not provided
    const duration = timeCalc.calculateDurationInMinutes(breakEntry.start_time, breakEntry.end_time);
    
    if (duration === null || duration <= 0) {
      return { error: 'Ungültige Pausendauer berechnet. Bitte überprüfen Sie Start- und Endzeit.' };
    }
  }
  
  // Max break duration validation (optional business rule - 8 hours)
  if (breakEntry.start_time && breakEntry.end_time) {
    const duration = timeCalc.calculateDurationInMinutes(breakEntry.start_time, breakEntry.end_time);
    if (duration > 8 * 60) {
      return { warning: 'Pause ist länger als 8 Stunden. Ist das beabsichtigt?' };
    }
  }
  
  // All validations passed
  return null;
};

/**
 * Validates that a break falls within a time entry's timeframe
 * @param {Object} breakEntry - The break data to validate
 * @param {Object} timeEntry - The parent time entry
 * @returns {Object|null} Error object if validation fails, null if valid
 */
const validateBreakWithinTimeEntry = (breakEntry, timeEntry) => {
  // If time entry doesn't have start and end, we can't validate the break range
  if (!timeEntry.start_time || !timeEntry.end_time) {
    return null;
  }
  
  const timeEntryStart = new Date(timeEntry.start_time);
  const timeEntryEnd = new Date(timeEntry.end_time);
  
  // Check break start time within time entry
  if (breakEntry.start_time) {
    const breakStart = new Date(breakEntry.start_time);
    
    if (breakStart < timeEntryStart || breakStart > timeEntryEnd) {
      return { error: 'Pausenbeginn muss innerhalb des Zeiteintrags liegen.' };
    }
  }
  
  // Check break end time within time entry
  if (breakEntry.end_time) {
    const breakEnd = new Date(breakEntry.end_time);
    
    if (breakEnd < timeEntryStart || breakEnd > timeEntryEnd) {
      return { error: 'Pausenende muss innerhalb des Zeiteintrags liegen.' };
    }
  }
  
  // All validations passed
  return null;
};

module.exports = {
  validateTimeEntry,
  validateBreak,
  validateBreakWithinTimeEntry
};
