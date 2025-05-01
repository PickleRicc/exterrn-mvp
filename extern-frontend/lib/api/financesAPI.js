// lib/api/financesAPI.js
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

// Attach JWT from localStorage to every request
function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Get financial statistics for the craftsman
 * @param {string} period - 'month', 'year', or 'all'
 * @returns {Promise<Object>} - Financial stats including goal, revenue, and outstanding amounts
 */
export async function getFinanceStats(period = 'month') {
  try {
    const res = await axios.get(`${API_BASE}/finances`, {
      params: { period },
      headers: authHeaders(),
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
    const res = await axios.post(
      `${API_BASE}/finances`,
      { goal_amount, goal_period },
      { headers: authHeaders() }
    );
    return res.data;
  } catch (error) {
    console.error('Error setting finance goal:', error);
    throw error;
  }
}
