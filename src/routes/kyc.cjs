const express = require('express');
const { verifyKYC } = require('../controllers/kycController.cjs');
const { getTouristByDTID, testDatabaseConnection } = require('../services/databaseService.cjs');

const router = express.Router();

// KYC verification (no auth required for initial registration)
router.post('/verify', verifyKYC);

// Get tourist profile by DTID
router.get('/:dtid', async (req, res) => {
  try {
    const { dtid } = req.params;
    
    if (!dtid || !dtid.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid DTID format. Expected 0x-prefixed hex string'
      });
    }

    const tourist = await getTouristByDTID(dtid);
    
    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist not found for the given DTID'
      });
    }

    res.json({
      success: true,
      message: 'Tourist profile retrieved successfully',
      data: tourist
    });
  } catch (error) {
    console.error('Error getting tourist profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tourist profile',
      error: error.message
    });
  }
});

// Test database connection endpoint
router.get('/test/database', async (req, res) => {
  try {
    const isConnected = await testDatabaseConnection();
    
    res.json({
      success: isConnected,
      message: isConnected ? 'Database connection successful' : 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      error: error.message
    });
  }
});

module.exports = router;


