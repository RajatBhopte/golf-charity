const express = require('express');
const router = express.Router();

// Temporary stub routes
router.get('/', (req, res) => {
  res.json({ message: 'Draws route active' });
});

module.exports = router;
