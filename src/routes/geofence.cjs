const express = require('express');
const { checkGeofence, getRestrictedZones } = require('../controllers/geofenceController');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();

// Check geofence (requires authentication)
router.post('/check', authenticateToken, checkGeofence);

// Get restricted zones (requires authentication)
router.get('/zones', authenticateToken, getRestrictedZones);

module.exports = router;

