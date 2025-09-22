const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/auth');
const supabase = require('../config/database');

const router = express.Router();

// Admin login endpoint (for dashboard access)
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Simple admin authentication (in production, use proper user management)
    const adminCredentials = {
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10) // "admin123"
    };

    if (username !== adminCredentials.username) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, adminCredentials.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'invalid password'
      });
    }

    const token = generateToken({
      username: username,
      role: 'admin'
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token: token,
        role: 'admin',
        username: username
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Tourist token refresh
router.post('/refresh', async (req, res) => {
  try {
    const { dtid } = req.body;

    if (!dtid) {
      return res.status(400).json({
        success: false,
        message: 'DTID is required'
      });
    }

    // Verify tourist exists
    const { data: tourist, error } = await supabase
      .from('tourists')
      .select('dtid, full_name')
      .eq('dtid', dtid)
      .single();

    if (error || !tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist not found'
      });
    }

    const token = generateToken({
      dtid: dtid,
      name: tourist.full_name,
      role: 'tourist'
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: token,
        dtid: dtid
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
});

module.exports = router;