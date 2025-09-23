const express = require('express');
const { 
  checkAnomalies, 
  resolveAnomaly, 
  getAllAnomalies 
} = require('../controllers/anomalyController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Check anomalies for a tourist (requires authentication)
router.get('/:dtid', authenticateToken, checkAnomalies);

// Resolve anomaly (requires admin access)
router.put('/:anomalyId/resolve', authenticateToken, requireAdmin, resolveAnomaly);

// Get all anomalies (requires admin access)
router.get('/', authenticateToken, requireAdmin, getAllAnomalies);

module.exports = router;