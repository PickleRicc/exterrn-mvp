// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const appointmentRoutes = require('./routes/appointments');
const customerRoutes = require('./routes/customers');
const authRoutes = require('./routes/auth');
const craftsmenRoutes = require('./routes/craftsmen');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://zimmr-428ddgywp-picklericcs-projects.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/appointments', appointmentRoutes);
app.use('/customers', customerRoutes);
app.use('/auth', authRoutes);
app.use('/craftsmen', craftsmenRoutes);

app.get('/', (req, res) => res.send('Extern MVP API is live '));

// Simple test endpoint to verify routes can be added
app.get('/test-craftsmen', (req, res) => {
  res.json({ message: 'Craftsmen test endpoint is working' });
});

// Test email endpoint
app.get('/test-email', async (req, res) => {
  try {
    const emailService = require('./services/emailService');
    const result = await emailService.testEmailConnection();
    res.json({ 
      success: result, 
      message: result ? 'Email service is configured correctly' : 'Email service configuration failed',
      emailConfig: {
        host: process.env.EMAIL_HOST || 'Using Ethereal test account',
        port: process.env.EMAIL_PORT || '587 (Ethereal)',
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER ? '✓ Set' : '✓ Using Ethereal test account',
        password: process.env.EMAIL_PASSWORD ? '✓ Set' : '✓ Using Ethereal test account',
        from: process.env.EMAIL_FROM || 'test@example.com'
      }
    });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send test email endpoint
app.get('/send-test-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email parameter is required' });
    }
    
    const emailService = require('./services/emailService');
    const result = await emailService.sendTestEmail(email);
    res.json(result);
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ connected: true, time: result.rows[0].now });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ connected: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
