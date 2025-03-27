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
