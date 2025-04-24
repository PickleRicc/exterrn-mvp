const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const path = require('path');

// Simple test route that doesn't require the controller
router.get('/test', (req, res) => {
  res.json({ message: 'Invoice routes are working' });
});

// Route to serve PDF files
router.get('/pdf-files/:filename', auth, (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'pdf-output', filename);
  res.sendFile(filePath);
});

// Export the router
module.exports = router;
