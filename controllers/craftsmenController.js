const pool = require('../db');

// Get all craftsmen
const getAllCraftsmen = async (req, res) => {
  try {
    const { name, specialty } = req.query;
    
    let query = `
      SELECT c.*, u.email, u.username
      FROM craftsmen c
      LEFT JOIN users u ON c.user_id = u.id
    `;
    
    const queryParams = [];
    const conditions = [];
    
    if (name) {
      queryParams.push(`%${name}%`);
      conditions.push(`c.name ILIKE $${queryParams.length}`);
    }
    
    if (specialty) {
      queryParams.push(`%${specialty}%`);
      conditions.push(`c.specialty ILIKE $${queryParams.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY c.name ASC';
    
    const result = await pool.query(query, queryParams);
    
    // Format the response to exclude sensitive information
    const craftsmen = result.rows.map(craftsman => ({
      id: craftsman.id,
      name: craftsman.name,
      phone: craftsman.phone,
      specialty: craftsman.specialty,
      availability_hours: craftsman.availability_hours,
      email: craftsman.email,
      username: craftsman.username,
      user_id: craftsman.user_id
    }));
    
    res.json(craftsmen);
  } catch (error) {
    console.error('Error fetching craftsmen:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get craftsman by ID
const getCraftsmanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.*, u.email, u.username
      FROM craftsmen c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    const craftsman = result.rows[0];
    
    // Format the response to exclude sensitive information
    const formattedCraftsman = {
      id: craftsman.id,
      name: craftsman.name,
      phone: craftsman.phone,
      specialty: craftsman.specialty,
      availability_hours: craftsman.availability_hours,
      email: craftsman.email,
      username: craftsman.username,
      user_id: craftsman.user_id
    };
    
    res.json(formattedCraftsman);
  } catch (error) {
    console.error('Error fetching craftsman:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update craftsman
const updateCraftsman = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, specialty, availability_hours } = req.body;
    
    console.log('Request to update craftsman ID:', id);
    console.log('User in request:', JSON.stringify(req.user));
    console.log('Update data:', JSON.stringify({ name, phone, specialty, availability_hours }));
    
    // Validate that the user is authorized to update this craftsman
    const craftsmanCheck = await pool.query(
      'SELECT id, user_id FROM craftsmen WHERE id = $1',
      [id]
    );
    
    if (craftsmanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    const craftsman = craftsmanCheck.rows[0];
    console.log('Craftsman found:', JSON.stringify(craftsman));
    
    // Get all possible IDs for comparison
    const requestedCraftsmanId = parseInt(id);
    const userCraftsmanId = req.user.craftsmanId ? parseInt(req.user.craftsmanId) : null;
    const userId = req.user.id ? parseInt(req.user.id) : (req.user.userId ? parseInt(req.user.userId) : null);
    const craftsmanUserId = parseInt(craftsman.user_id);
    
    console.log('ID Comparison:');
    console.log('- Requested craftsman ID:', requestedCraftsmanId);
    console.log('- User craftsman ID from token:', userCraftsmanId);
    console.log('- User ID from token:', userId);
    console.log('- Craftsman user_id from DB:', craftsmanUserId);
    
    // Allow updates if any of the conditions are met
    let authorized = false;
    let authReason = '';
    
    if (req.user.role === 'admin') {
      authorized = true;
      authReason = 'User is admin';
    } else if (userCraftsmanId === requestedCraftsmanId) {
      authorized = true;
      authReason = 'User craftsman ID matches requested craftsman ID';
    } else if (userId === craftsmanUserId) {
      authorized = true;
      authReason = 'User ID matches craftsman user_id';
    }
    
    console.log('Authorization result:', authorized ? 'Authorized' : 'Not authorized');
    console.log('Authorization reason:', authReason || 'No matching condition');
    
    if (!authorized) {
      return res.status(403).json({ 
        error: 'Not authorized to update this craftsman',
        details: {
          requestedCraftsmanId,
          userCraftsmanId,
          userId,
          craftsmanUserId
        }
      });
    }
    
    const updateFields = [];
    const queryParams = [];
    let paramCounter = 1;
    
    if (name) {
      updateFields.push(`name = $${paramCounter++}`);
      queryParams.push(name);
    }
    
    if (phone) {
      updateFields.push(`phone = $${paramCounter++}`);
      queryParams.push(phone);
    }
    
    if (specialty) {
      updateFields.push(`specialty = $${paramCounter++}`);
      queryParams.push(specialty);
    }
    
    if (availability_hours) {
      updateFields.push(`availability_hours = $${paramCounter++}`);
      queryParams.push(availability_hours);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    queryParams.push(id);
    
    const result = await pool.query(`
      UPDATE craftsmen
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `, queryParams);
    
    console.log('Craftsman updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating craftsman:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get craftsman appointments
const getCraftsmanAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Request to get appointments for craftsman ID:', id);
    console.log('User in request:', req.user);
    
    // First check if craftsman exists
    const craftsmanCheck = await pool.query('SELECT id, user_id FROM craftsmen WHERE id = $1', [id]);
    
    if (craftsmanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    // Check if the user is authorized to view this craftsman's appointments
    if (req.user) {
      const craftsman = craftsmanCheck.rows[0];
      
      console.log('Comparing user ID:', req.user.id, 'with craftsman user_id:', craftsman.user_id);
      console.log('Comparing craftsman ID:', req.user.craftsmanId, 'with requested craftsman ID:', id);
      console.log('User role:', req.user.role);
      
      // Allow access if:
      // 1. User is an admin, OR
      // 2. User's craftsman ID matches the requested craftsman ID, OR
      // 3. User ID matches the craftsman's user_id
      const requestedIdAsInt = parseInt(id);
      const userCraftsmanIdAsInt = req.user.craftsmanId ? parseInt(req.user.craftsmanId) : null;
      const userIdAsInt = parseInt(req.user.id);
      const craftsmanUserIdAsInt = parseInt(craftsman.user_id);
      
      console.log('Converted IDs for comparison:');
      console.log('- Requested craftsman ID (int):', requestedIdAsInt);
      console.log('- User craftsman ID (int):', userCraftsmanIdAsInt);
      console.log('- User ID (int):', userIdAsInt);
      console.log('- Craftsman user_id (int):', craftsmanUserIdAsInt);
      
      if (req.user.role === 'admin' || 
          userCraftsmanIdAsInt === requestedIdAsInt || 
          userIdAsInt === craftsmanUserIdAsInt) {
        console.log('Authorization successful');
      } else {
        console.log('Authorization failed: User ID:', userIdAsInt, 'Craftsman user_id:', craftsmanUserIdAsInt);
        console.log('Authorization failed: User craftsman ID:', userCraftsmanIdAsInt, 'Requested craftsman ID:', requestedIdAsInt);
        return res.status(403).json({ error: 'Not authorized to view these appointments' });
      }
    } else {
      // If there's no user in the request, it means the auth middleware didn't run or the token is invalid
      console.log('No user found in request - auth middleware may not be working');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const result = await pool.query(`
      SELECT a.*, c.name as customer_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.craftsman_id = $1
      ORDER BY a.scheduled_at DESC
    `, [id]);
    
    console.log('Found', result.rows.length, 'appointments for craftsman', id);
    
    // Always return an array, even if empty
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching craftsman appointments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check craftsman availability
const checkCraftsmanAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    const { id } = req.params;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD format)' });
    }
    
    // First check if craftsman exists
    const craftsmanCheck = await pool.query(
      'SELECT id, name, availability_hours FROM craftsmen WHERE id = $1', 
      [id]
    );
    
    if (craftsmanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    const craftsman = craftsmanCheck.rows[0];
    
    // Get day of week from date
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Check if craftsman works on this day
    if (craftsman.availability_hours && 
        (!craftsman.availability_hours[dayOfWeek] || 
         craftsman.availability_hours[dayOfWeek].length === 0)) {
      return res.json({
        available: false,
        reason: `${craftsman.name} does not work on ${dayOfWeek}s`,
        appointments: []
      });
    }
    
    // If time is provided, check if it's within working hours
    if (time && craftsman.availability_hours && craftsman.availability_hours[dayOfWeek]) {
      const timeInMinutes = convertTimeToMinutes(time);
      let withinWorkingHours = false;
      
      for (const range of craftsman.availability_hours[dayOfWeek]) {
        const [start, end] = range.split('-').map(convertTimeToMinutes);
        if (timeInMinutes >= start && timeInMinutes <= end) {
          withinWorkingHours = true;
          break;
        }
      }
      
      if (!withinWorkingHours) {
        return res.json({
          available: false,
          reason: `${craftsman.name} does not work at ${time} on ${dayOfWeek}s`,
          workingHours: craftsman.availability_hours[dayOfWeek],
          appointments: []
        });
      }
    }
    
    // Query for appointments on the specified date
    let queryText = `
      SELECT a.*, c.name as customer_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.craftsman_id = $1 AND DATE(a.scheduled_at) = $2
    `;
    
    const queryParams = [id, date];
    
    // If time is provided, filter for appointments around that time (±2 hours)
    if (time) {
      // Convert time to timestamp
      const timestamp = `${date}T${time}:00`;
      queryText += `
        AND a.scheduled_at BETWEEN 
        ($3::timestamp - interval '2 hours') AND 
        ($3::timestamp + interval '2 hours')
      `;
      queryParams.push(timestamp);
    }
    
    queryText += ` ORDER BY a.scheduled_at`;
    
    const result = await pool.query(queryText, queryParams);
    
    // Determine availability
    const appointments = result.rows;
    const isAvailable = appointments.length === 0;
    
    res.json({
      available: isAvailable,
      craftsman: {
        id: craftsman.id,
        name: craftsman.name,
        workingHours: craftsman.availability_hours ? craftsman.availability_hours[dayOfWeek] : null
      },
      appointments: appointments
    });
  } catch (error) {
    console.error('Error checking craftsman availability:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check craftsman availability with alternatives
const checkCraftsmanAvailabilityWithAlternatives = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedDateTime, daysToCheck = 7, slotsToReturn = 3 } = req.query;
    
    // Validate input
    if (!requestedDateTime) {
      return res.status(400).json({ error: 'requestedDateTime parameter is required (ISO format)' });
    }
    
    // First check if craftsman exists
    const craftsmanCheck = await pool.query(
      'SELECT id, name, specialty, availability_hours FROM craftsmen WHERE id = $1', 
      [id]
    );
    
    if (craftsmanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    const craftsman = craftsmanCheck.rows[0];
    
    // Parse the requested date and time
    const requestedDate = new Date(requestedDateTime);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Please use ISO format (e.g., 2025-04-15T09:00:00)' });
    }
    
    // Check if the requested time is available
    const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const requestedHour = requestedDate.getHours();
    const requestedMinutes = requestedDate.getMinutes();
    
    // Format date for SQL query (YYYY-MM-DD)
    const formattedDate = requestedDate.toISOString().split('T')[0];
    
    // Map day of week to day name
    const dayName = getDayName(dayOfWeek).toLowerCase();
    
    // Check if craftsman works on this day
    const availabilityHours = craftsman.availability_hours || {};
    const dayAvailability = availabilityHours[dayName] || null;
    
    let isAvailable = false;
    let reason = '';
    
    if (!dayAvailability) {
      reason = 'Craftsman does not work on this day';
    } else {
      // Parse time range (assuming format like ["9:00-17:00"])
      const timeRange = parseTimeRange(dayAvailability[0]);
      
      if (!timeRange) {
        reason = 'Invalid time range format';
      } else {
        const { startHour, startMinute, endHour, endMinute } = timeRange;
        
        const requestedTimeInMinutes = requestedHour * 60 + requestedMinutes;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;
        
        if (requestedTimeInMinutes < startTimeInMinutes || requestedTimeInMinutes > endTimeInMinutes) {
          reason = 'Requested time is outside working hours';
        } else {
          // Check for conflicting appointments
          const conflictingAppointments = await pool.query(`
            SELECT id, scheduled_at, duration
            FROM appointments
            WHERE craftsman_id = $1
              AND DATE(scheduled_at) = $2
              AND (
                (scheduled_at <= $3 AND scheduled_at + (duration || ' minutes')::interval > $3)
                OR
                (scheduled_at > $3 AND scheduled_at < $3 + interval '1 hour')
              )
          `, [id, formattedDate, requestedDateTime]);
          
          if (conflictingAppointments.rows.length > 0) {
            reason = 'Craftsman has conflicting appointments';
          } else {
            isAvailable = true;
          }
        }
      }
    }
    
    // If not available, find alternative slots
    let availableSlots = [];
    let messageToSend = '';
    
    if (isAvailable) {
      messageToSend = `The craftsman ${craftsman.name} is available at the requested time on ${formatDateForHumans(requestedDate)}.`;
    } else {
      // Find alternative slots
      availableSlots = await findAvailableSlots(
        id, 
        craftsman.availability_hours, 
        requestedDate, 
        parseInt(daysToCheck), 
        parseInt(slotsToReturn)
      );
      
      // Generate message
      messageToSend = generateMessageWithAlternatives(
        craftsman.name,
        requestedDate,
        reason,
        availableSlots
      );
    }
    
    // Format response
    const response = {
      isAvailable,
      requestedDateTime,
      craftsman: {
        id: craftsman.id,
        name: craftsman.name,
        specialty: craftsman.specialty
      },
      availableSlots: availableSlots.map(slot => slot.toISOString()),
      messageToSend
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error checking craftsman availability with alternatives:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to find available slots
const findAvailableSlots = async (craftsmanId, availabilityHours, requestedDate, daysToCheck, slotsToReturn) => {
  const availableSlots = [];
  const startDate = new Date(requestedDate);
  
  // Check for slots for the next X days
  for (let dayOffset = 0; dayOffset < daysToCheck && availableSlots.length < slotsToReturn; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    
    const dayOfWeek = currentDate.getDay();
    const dayName = getDayName(dayOfWeek).toLowerCase();
    const dayAvailability = availabilityHours[dayName];
    
    // Skip days when craftsman doesn't work
    if (!dayAvailability) continue;
    
    // Parse time range (assuming format like ["9:00-17:00"])
    const timeRange = parseTimeRange(dayAvailability[0]);
    if (!timeRange) continue;
    
    const { startHour, startMinute, endHour, endMinute } = timeRange;
    
    // Format date for SQL query (YYYY-MM-DD)
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    // Get all appointments for this day
    const appointments = await pool.query(`
      SELECT scheduled_at, duration
      FROM appointments
      WHERE craftsman_id = $1
        AND DATE(scheduled_at) = $2
      ORDER BY scheduled_at
    `, [craftsmanId, formattedDate]);
    
    // Check each hour slot during working hours
    for (let hour = startHour; hour < endHour && availableSlots.length < slotsToReturn; hour++) {
      // For the first hour, respect minutes
      let minute = (hour === startHour) ? startMinute : 0;
      
      // For the last hour, respect end minutes
      const endMinuteForHour = (hour === endHour - 1) ? endMinute : 60;
      
      // Check each hour slot at 0 and 30 minute marks
      for (let minuteMark of [0, 30]) {
        if (minute > minuteMark) continue;
        if (hour === endHour - 1 && minuteMark >= endMinute) continue;
        
        const slotTime = new Date(currentDate);
        slotTime.setHours(hour, minuteMark, 0, 0);
        
        // Skip slots in the past
        if (slotTime < new Date()) continue;
        
        // Skip the exact requested time if we're on the first day
        if (dayOffset === 0 && 
            slotTime.getHours() === requestedDate.getHours() && 
            slotTime.getMinutes() === requestedDate.getMinutes()) {
          continue;
        }
        
        // Check if this slot conflicts with any appointment
        let hasConflict = false;
        for (const appointment of appointments.rows) {
          const appointmentStart = new Date(appointment.scheduled_at);
          const appointmentEnd = new Date(appointmentStart);
          appointmentEnd.setMinutes(appointmentEnd.getMinutes() + appointment.duration);
          
          const slotEnd = new Date(slotTime);
          slotEnd.setHours(slotEnd.getHours() + 1); // Assuming 1-hour slots
          
          if ((slotTime >= appointmentStart && slotTime < appointmentEnd) || 
              (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
              (slotTime <= appointmentStart && slotEnd >= appointmentEnd)) {
            hasConflict = true;
            break;
          }
        }
        
        if (!hasConflict) {
          availableSlots.push(slotTime);
          if (availableSlots.length >= slotsToReturn) break;
        }
      }
    }
  }
  
  return availableSlots;
};

// Helper function to get day name from day of week
const getDayName = (dayOfWeek) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayOfWeek];
};

// Helper function to parse time range string (e.g., "9:00-17:00")
const parseTimeRange = (timeRangeStr) => {
  if (!timeRangeStr) return null;
  
  const parts = timeRangeStr.split('-');
  if (parts.length !== 2) return null;
  
  const startParts = parts[0].split(':');
  const endParts = parts[1].split(':');
  
  if (startParts.length !== 2 || endParts.length !== 2) return null;
  
  return {
    startHour: parseInt(startParts[0]),
    startMinute: parseInt(startParts[1]),
    endHour: parseInt(endParts[0]),
    endMinute: parseInt(endParts[1])
  };
};

// Helper function to format date for human-readable messages
const formatDateForHumans = (date) => {
  const options = { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
};

// Helper function to generate message with alternatives
const generateMessageWithAlternatives = (craftsmanName, requestedDate, reason, availableSlots) => {
  if (availableSlots.length === 0) {
    return `${craftsmanName} is not available at the requested time (${formatDateForHumans(requestedDate)}). Unfortunately, no alternative slots were found in the next few days.`;
  }
  
  let message = `${craftsmanName} is not available at the requested time (${formatDateForHumans(requestedDate)}).`;
  
  if (availableSlots.length === 1) {
    message += ` However, they are available on ${formatDateForHumans(availableSlots[0])}.`;
  } else {
    message += ' However, they are available on: ';
    
    availableSlots.forEach((slot, index) => {
      if (index === availableSlots.length - 1) {
        message += `and ${formatDateForHumans(slot)}.`;
      } else {
        message += `${formatDateForHumans(slot)}, `;
      }
    });
  }
  
  return message;
};

// Helper function to convert time string (HH:MM) to minutes
const convertTimeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

module.exports = {
  getAllCraftsmen,
  getCraftsmanById,
  updateCraftsman,
  getCraftsmanAppointments,
  checkCraftsmanAvailability,
  checkCraftsmanAvailabilityWithAlternatives
};
