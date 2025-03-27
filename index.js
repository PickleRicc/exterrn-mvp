const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const pool = require('./db');

app.use(express.json());

app.get('/', (req, res) => res.send('Extern MVP API is live 🎯'));

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

app.post('/seed-appointment', async (req, res) => {
    try {
      // Insert customer
      const customer = await pool.query(
        `INSERT INTO customers (name, phone, service_type) 
         VALUES ($1, $2, $3) RETURNING *`,
        ['Max Mustermann', '015112345678', 'Painting']
      );
  
      // Insert appointment
      const appointment = await pool.query(
        `INSERT INTO appointments (customer_id, scheduled_at, notes) 
         VALUES ($1, $2, $3) RETURNING *`,
        [customer.rows[0].id, new Date(Date.now() + 86400000), 'First visit']
      );
  
      res.json({ customer: customer.rows[0], appointment: appointment.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });