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
      `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM invoices WHERE craftsman_id = $1 AND status = $2 ${dateCondition}`,
      params
    );
    const totalRevenue = revenueResult.rows[0].total_revenue;

    // Calculate outstanding (unpaid) invoices
    const outstandingResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_open 
       FROM invoices 
       WHERE craftsman_id = $1 AND status IN ('pending', 'overdue') ${dateCondition}`,
      [craftsmanId]
    );
    const totalOpen = outstandingResult.rows[0].total_open;

    // Get monthly revenue breakdown for the current year (for chart)
    let monthlyRevenueData = [];
    if (period === 'year') {
      const monthlyResult = await pool.query(
        `SELECT 
          date_trunc('month', created_at) AS month,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM invoices 
        WHERE 
          craftsman_id = $1 
          AND status = 'paid'
          AND date_trunc('year', created_at) = date_trunc('year', CURRENT_DATE)
        GROUP BY date_trunc('month', created_at)
        ORDER BY month`,
        [craftsmanId]
      );
      monthlyRevenueData = monthlyResult.rows;
    }

    res.json({ goal, totalRevenue, totalOpen, monthlyRevenueData });
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

// Update finances when an invoice is marked as paid
const updateFinancesFromInvoice = async (invoiceId, craftsmanId) => {
  try {
    console.log(`Updating finances for invoice ${invoiceId} and craftsman ${craftsmanId}`);
    
    // Get the invoice details
    const invoiceResult = await pool.query(
      'SELECT total_amount, created_at FROM invoices WHERE id = $1 AND craftsman_id = $2',
      [invoiceId, craftsmanId]
    );
    
    if (invoiceResult.rows.length === 0) {
      console.error(`Invoice ${invoiceId} not found for craftsman ${craftsmanId}`);
      return false;
    }
    
    const invoice = invoiceResult.rows[0];
    console.log(`Invoice found with total amount: ${invoice.total_amount}`);
    
    // No need to update any specific record in the finances table
    // The getFinanceStats function will calculate revenue from invoices on demand
    
    return true;
  } catch (err) {
    console.error('Error in updateFinancesFromInvoice:', err);
    return false;
  }
};

module.exports = {
  getFinanceStats,
  setFinanceGoal,
  updateFinancesFromInvoice,
};
