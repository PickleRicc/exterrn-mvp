// routes/finances.js
const express = require('express');
const router = express.Router();
const { getFinanceStats, setFinanceGoal } = require('../controllers/financesController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /finances - get current goal and revenue for logged-in craftsman
router.get('/', getFinanceStats);

// POST /finances - set or update goal for logged-in craftsman
router.post('/', setFinanceGoal);

module.exports = router;
