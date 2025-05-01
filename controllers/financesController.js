// controllers/financesController.js
const pool = require('../db');

// Get current goal and revenue for the logged-in craftsman and period
const getFinanceStats = async (req, res) => {
  try {
    const craftsmanId = req.user.craftsmanId || req.user.craftsman_id;
    const period = req.query.period || 'month'; // 'month', 'year', 'all'

    // Get goal from finances table
    const goalResult = await pool.query(
      'SELECT goal_amount, goal_period FROM finances WHERE craftsman_id = $1 AND goal_period = $2',
      [craftsmanId, period]
    );
    const goal = goalResult.rows[0] || null;

    // Calculate total revenue from invoices (for this craftsman and period)
    let dateCondition = '';
    let params = [craftsmanId, 'paid'];
    if (period === 'month') {
      dateCondition = "AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)";
    } else if (period === 'year') {
      dateCondition = "AND date_trunc('year', created_at) = date_trunc('year', CURRENT_DATE)";
    } // else 'all' = no date filter

    // Only sum up paid invoices
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM invoices WHERE craftsman_id = $1 AND status = $2 ${dateCondition}`,
      params
    );
    const totalRevenue = revenueResult.rows[0].total_revenue;

    res.json({ goal, totalRevenue });
  } catch (err) {
    console.error('Error in getFinanceStats:', err);
    res.status(500).json({ error: 'Failed to fetch finance stats' });
  }
};

// Set or update the goal for the logged-in craftsman and period
const setFinanceGoal = async (req, res) => {
  try {
    // FIX: Support both camelCase and snake_case for craftsmanId
    const craftsmanId = req.user.craftsmanId || req.user.craftsman_id;
    const { goal_amount, goal_period } = req.body;
    if (!goal_amount || !goal_period) {
      return res.status(400).json({ error: 'Goal amount and period required' });
    }
    // Upsert the goal
    await pool.query(
      `INSERT INTO finances (craftsman_id, goal_amount, goal_period, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (craftsman_id, goal_period)
       DO UPDATE SET goal_amount = $2, updated_at = NOW()`,
      [craftsmanId, goal_amount, goal_period]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error in setFinanceGoal:', err);
    res.status(500).json({ error: 'Failed to set finance goal' });
  }
};

module.exports = {
  getFinanceStats,
  setFinanceGoal,
};
