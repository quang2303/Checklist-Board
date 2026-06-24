const express = require('express');
const router = express.Router();

const sseRoutes = require('./sseRoutes');
const templateRoutes = require('./templateRoutes');
const jobRoutes = require('./jobRoutes');

// Mount sub-routers under the /api prefix
router.use('/api', sseRoutes);
router.use('/api', templateRoutes);
router.use('/api', jobRoutes);

module.exports = router;
