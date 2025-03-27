const pool = require('../db');

const createAppointment = async (req, res) => {
  try {
    const customer = await pool.query(
      `INSERT INTO customers (name, phone, service_type) 
       VALUES ($1, $2, $3) RETURNING *`,
      ['Max Mustermann', '015112345678', 'Painting']
    );

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
};

module.exports = {
  createAppointment
};
