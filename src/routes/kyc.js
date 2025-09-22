const express = require('express');
const { verifyKYC, getTouristProfile } = require('../src/src/services/controllers/kycController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// KYC verification (no auth required for initial registration)
router.post('/verify', verifyKYC);
