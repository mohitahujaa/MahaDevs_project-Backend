const express = require('express');
const { verifyKYC } = require('../controllers/kycController.cjs');

const router = express.Router();

// KYC verification (no auth required for initial registration)
router.post('/verify', verifyKYC);

module.exports = router;


