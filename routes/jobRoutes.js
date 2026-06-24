const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

router.get('/jobs', jobController.getJobs);
router.post('/jobs', jobController.createJob);
router.get('/jobs/:id', jobController.getJobDetail);
router.delete('/jobs/:id', jobController.deleteJob);

// Step operations
router.post('/jobs/:id/steps', jobController.addStep);
router.delete('/jobs/:id/steps/:stepId', jobController.deleteStep);
router.patch('/jobs/:id/steps/:stepId', jobController.updateStepStatus);
router.post('/jobs/:id/steps/:stepId/logs', jobController.addStepLog);

module.exports = router;
