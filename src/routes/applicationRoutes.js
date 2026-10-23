const express = require('express');
const {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  updateStatus,
  deleteApplication,
  getStats,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const noteRoutes = require('./noteRoutes');

const router = express.Router();

router.use(protect);
router.use('/:applicationId/notes', noteRoutes);

router.route('/').get(getApplications).post(createApplication);
router.get('/stats', getStats);
router.route('/:id').get(getApplication).put(updateApplication).delete(deleteApplication);
router.patch('/:id/status', updateStatus);

module.exports = router;