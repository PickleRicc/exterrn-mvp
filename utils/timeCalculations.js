/**
 * Time tracking utility functions for calculations and validations
 */

/**
 * Calculate the duration between two dates in minutes
 * @param {Date|string} startTime - The start time
 * @param {Date|string} endTime - The end time
 * @returns {number} Duration in minutes (rounded to nearest minute)
 */
const calculateDurationInMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return null;
  }
  
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }
  
  // Calculate milliseconds and convert to minutes
  const durationMs = end.getTime() - start.getTime();
  return Math.round(durationMs / (1000 * 60));
};

/**
 * Calculate billable amount based on duration and hourly rate
 * @param {number} durationMinutes - Duration in minutes
 * @param {number} hourlyRate - Hourly rate in EUR
 * @returns {number} Billable amount (rounded to 2 decimal places)
 */
const calculateBillableAmount = (durationMinutes, hourlyRate) => {
  if (typeof durationMinutes !== 'number' || typeof hourlyRate !== 'number') {
    return 0;
  }
  
  const hours = durationMinutes / 60;
  const amount = hours * hourlyRate;
  return parseFloat(amount.toFixed(2));
};

/**
 * Validate a time entry for overlaps with existing entries
 * @param {Object} newEntry - The time entry to validate
 * @param {Array} existingEntries - Array of existing time entries
 * @returns {boolean|Object} False if valid, or an error object if invalid
 */
const validateTimeEntryOverlaps = (newEntry, existingEntries) => {
  if (!newEntry.start_time) {
    return { error: 'Startzeit ist erforderlich.' };
  }
  
  if (!newEntry.end_time) {
    return false; // No end time means no overlap possible
  }
  
  const newStart = new Date(newEntry.start_time);
  const newEnd = new Date(newEntry.end_time);
  
  // Check for valid date range
  if (newStart >= newEnd) {
    return { error: 'Startzeit muss vor der Endzeit liegen.' };
  }
  
  // Skip self in existing entries if updating
  const entriesToCheck = existingEntries.filter(entry => 
    !newEntry.id || entry.id !== newEntry.id
  );
  
  // Check for overlaps
  for (const entry of entriesToCheck) {
    // Skip entries without end time
    if (!entry.end_time) continue;
    
    const entryStart = new Date(entry.start_time);
    const entryEnd = new Date(entry.end_time);
    
    // Check for overlap
    if (
      (newStart >= entryStart && newStart < entryEnd) || // New start is within existing entry
      (newEnd > entryStart && newEnd <= entryEnd) || // New end is within existing entry
      (newStart <= entryStart && newEnd >= entryEnd) // New entry completely contains existing entry
    ) {
      return {
        error: 'Zeiteintrag überschneidet sich mit einem vorhandenen Eintrag.',
        conflictEntry: entry
      };
    }
  }
  
  return false; // No overlaps found
};

/**
 * Calculate total duration minus breaks
 * @param {Object} timeEntry - Time entry object with start_time, end_time
 * @param {Array} breaks - Array of break objects with duration_minutes
 * @returns {number} Net duration in minutes
 */
const calculateNetDuration = (timeEntry, breaks = []) => {
  if (!timeEntry.start_time || !timeEntry.end_time) {
    return timeEntry.duration_minutes || 0;
  }
  
  // Calculate gross duration
  const grossDuration = calculateDurationInMinutes(timeEntry.start_time, timeEntry.end_time);
  
  // Sum up break durations
  const breakDurations = breaks
    .map(breakItem => breakItem.duration_minutes || 0)
    .reduce((sum, duration) => sum + duration, 0);
  
  // Return net duration (ensure it's not negative)
  return Math.max(0, grossDuration - breakDurations);
};

/**
 * Format duration in minutes to hours and minutes display
 * @param {number} durationMinutes - Duration in minutes
 * @returns {string} Formatted duration string (e.g. "2h 30m")
 */
const formatDuration = (durationMinutes) => {
  if (!durationMinutes && durationMinutes !== 0) {
    return '-';
  }
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

module.exports = {
  calculateDurationInMinutes,
  calculateBillableAmount,
  validateTimeEntryOverlaps,
  calculateNetDuration,
  formatDuration
};
