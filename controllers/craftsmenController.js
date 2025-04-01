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
    
    // Validate that the user is authorized to update this craftsman
    // This assumes the auth middleware has added the user info to the request
    const craftsmanCheck = await pool.query(
      'SELECT user_id FROM craftsmen WHERE id = $1',
      [id]
    );
    
    if (craftsmanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    // Only allow updates if the user is the owner or an admin
    if (req.user.role !== 'admin' && req.user.userId !== craftsmanCheck.rows[0].user_id) {
      return res.status(403).json({ error: 'Not authorized to update this craftsman' });
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
    
    // First check if craftsman exists
    const craftsmanCheck = await pool.query('SELECT id FROM craftsmen WHERE id = $1', [id]);
    
    if (craftsmanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Craftsman not found' });
    }
    
    const result = await pool.query(`
      SELECT a.*, c.name as customer_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.craftsman_id = $1
      ORDER BY a.scheduled_at DESC
    `, [id]);
    
    res.json(result.rows);
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
  checkCraftsmanAvailability
};
