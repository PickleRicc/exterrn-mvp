const express = require('express');
const router = express.Router();
const timeEntriesController = require('../controllers/timeEntriesController');
const breaksController = require('../controllers/breaksController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Time entries routes
router.get('/', timeEntriesController.getAllTimeEntries);
router.get('/stats', timeEntriesController.getTimeEntryStats);
router.get('/:id', timeEntriesController.getTimeEntryById);
router.post('/', timeEntriesController.createTimeEntry);
router.put('/:id', timeEntriesController.updateTimeEntry);
router.delete('/:id', timeEntriesController.deleteTimeEntry);

// Breaks routes (nested under time entries)
router.get('/:timeEntryId/breaks', breaksController.getBreaks);
router.post('/:timeEntryId/breaks', breaksController.addBreak);
router.put('/:timeEntryId/breaks/:breakId', breaksController.updateBreak);
router.delete('/:timeEntryId/breaks/:breakId', breaksController.deleteBreak);

module.exports = router;
