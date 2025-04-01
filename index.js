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
app.use(cors());
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
