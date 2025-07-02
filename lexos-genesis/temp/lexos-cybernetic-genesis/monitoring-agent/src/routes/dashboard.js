const express = require('express');
const path = require('path');

const router = express.Router();

// Serve dashboard HTML
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Redirect /dashboard to /dashboard/
router.get('', (req, res) => {
  res.redirect('/dashboard/');
});

module.exports = router;