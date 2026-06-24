const express = require('express');
const router = express.Router();
const sseController = require('../controllers/sseController');

router.get('/events', sseController.connectEvents);

module.exports = router;
