const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register new user
const register = async (req, res) => {
  try {
    const { username, email, password, role, phone, specialty, name } = req.body;
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // Check if user already exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (userCheck.rows.length > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'User already exists with that email or username' 
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Set default role if not provided
    const userRole = role || 'customer';
    
    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, role, created_at`,
      [username, email, hashedPassword, userRole]
    );
    
    const userId = result.rows[0].id;
    
    // If craftsman role, create craftsman entry
    if (userRole === 'craftsman') {
      if (!phone) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Phone number is required for craftsmen' });
      }
      
      // Use the provided name or fallback to username if not provided
      const craftsmanName = name || username;
      
      await pool.query(
        `INSERT INTO craftsmen (name, phone, specialty, user_id) 
         VALUES ($1, $2, $3, $4)`,
        [craftsmanName, phone, specialty || '', userId]
      );
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0]
    });
  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if JWT_SECRET is available
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Get craftsman info if user is a craftsman
    let craftsmanInfo = null;
    if (user.role === 'craftsman') {
      const craftsmanResult = await pool.query(
        'SELECT id, name, phone, specialty FROM craftsmen WHERE user_id = $1',
        [user.id]
      );
      
      if (craftsmanResult.rows.length > 0) {
        craftsmanInfo = craftsmanResult.rows[0];
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role || 'customer',
        craftsmanId: craftsmanInfo?.id
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'customer',
        craftsman: craftsmanInfo
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login
};
