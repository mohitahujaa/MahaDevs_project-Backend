const express = require('express');
const { verifyKYC } = require('../controllers/kycController.cjs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// KYC verification (no auth required for initial registration)
router.post('/verify', verifyKYC);

// Get tourist profile by DTID (requires authentication) - TODO: Implement getTouristProfile
// router.get('/:dtid', authenticateToken, getTouristProfile);

module.exports = router;
