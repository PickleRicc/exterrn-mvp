const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  startTimeTracking,
  stopTimeTracking,
  getTimeAnalytics
} = require('../controllers/timeEntriesController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all time entries (with filters)
router.get('/', getAllTimeEntries);

// GET time entry by ID
router.get('/:id', getTimeEntryById);

// POST new time entry
router.post('/', createTimeEntry);

// PUT update time entry
router.put('/:id', updateTimeEntry);

// DELETE time entry
router.delete('/:id', deleteTimeEntry);

// POST start time tracking
router.post('/start', startTimeTracking);

// PUT stop time tracking
router.put('/:id/stop', stopTimeTracking);

// GET analytics
router.get('/analytics', getTimeAnalytics);

module.exports = router;
