// lib/api/financesAPI.js
import api from '../../app/lib/api';

/**
 * Get financial statistics for the craftsman
 * @param {string} period - 'month', 'year', or 'all'
 * @returns {Promise<Object>} - Financial stats including goal, revenue, and outstanding amounts
 */
export async function getFinanceStats(period = 'month') {
  try {
    const res = await api.get('/finances', {
      params: { period }
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching finance stats:', error);
    throw error;
  }
}

/**
 * Set or update a financial goal for the craftsman
 * @param {number} goal_amount - The target amount for the goal
 * @param {string} goal_period - 'month', 'year', or 'all'
 * @returns {Promise<Object>} - Response data
 */
export async function setFinanceGoal(goal_amount, goal_period) {
  try {
    const res = await api.post(
      '/finances',
      { goal_amount, goal_period }
    );
    return res.data;
  } catch (error) {
    console.error('Error setting finance goal:', error);
    throw error;
  }
}
