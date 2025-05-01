// lib/api/financesAPI.js
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

// Attach JWT from localStorage to every request
function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getFinanceStats(period = 'month') {
  const res = await axios.get(`${API_BASE}/finances`, {
    params: { period },
    headers: authHeaders(),
  });
  return res.data;
}

export async function setFinanceGoal(goal_amount, goal_period) {
  const res = await axios.post(
    `${API_BASE}/finances`,
    { goal_amount, goal_period },
    { headers: authHeaders() }
  );
  return res.data;
}
