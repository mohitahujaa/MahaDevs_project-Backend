const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const { generateToken } = require('../config/auth.cjs');
const supabase = require('../config/database.cjs');

const router = express.Router();

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory storage for OTPs (for demo purposes - use database in production)
const otpStorage = new Map();

// Register user with mobile number
router.post('/register', async (req, res) => {
  try {
    const { mobile_number } = req.body;

    // Validate input
    if (!mobile_number) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    // Validate mobile number format
    const mobileRegex = /^\+91[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format. Please use +91XXXXXXXXXX format'
      });
    }

    // Store mobile number in variable
    const userMobileNumber = mobile_number;

    // Search for the mobile number in tourists table to get DTID and user details
    let userDTID = null;
    let userName = null;
    let qrCodeData = null;
    
    try {
      const { data: tourist, error: searchError } = await supabase
        .from('tourists')
        .select('dtid, full_name, contact_number')
        .eq('contact_number', userMobileNumber)
        .single();

      if (searchError) {
        if (searchError.code !== 'PGRST116') { // PGRST116 means no rows found
          return res.status(500).json({
            success: false,
            message: 'Database error while searching for tourist'
          });
        }
      } else {
        userDTID = tourist.dtid;
        userName = tourist.full_name;
        
        // If tourist found, fetch QR code from qr_codes table
        if (userDTID) {
          try {
            const { data: qrCode, error: qrError } = await supabase
              .from('qr_codes')
              .select('dtid, file_url')
              .eq('dtid', userDTID)
              .single();
              
            if (!qrError && qrCode) {
              qrCodeData = qrCode;
            }
          } catch (qrDbError) {
            // Handle QR code fetch errors silently
          }
        }
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed'
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store OTP in memory with expiry (include user data if found)
    otpStorage.set(userMobileNumber, {
      otp: otp,
      expiry: otpExpiry,
      attempts: 0,
      dtid: userDTID,
      full_name: userName,
      qr_code: qrCodeData
    });

    console.log(`Generated OTP for ${userMobileNumber}: ${otp}`);

    // Send OTP via Twilio SMS
    try {
      await sendOTPSMS(userMobileNumber, otp);
      console.log(`OTP sent successfully to ${userMobileNumber}`);

      res.status(200).json({
        success: true,
        message: 'OTP sent to your mobile number successfully!',
        mobile_number: userMobileNumber,
        dtid: userDTID,
        full_name: userName,
        has_dtid: userDTID ? true : false,
        qr_code: qrCodeData,
        timestamp: new Date().toISOString()
      });

    } catch (smsError) {
      console.error('SMS sending error:', smsError);
      
      // Still return success but log SMS failure
      console.log(`OTP for ${userMobileNumber} (SMS failed, check console): ${otp}`);
      
      res.status(200).json({
        success: true,
        message: 'OTP generated successfully! (Check server console for OTP - SMS service may be unavailable)',
        mobile_number: userMobileNumber,
        dtid: userDTID,
        full_name: userName,
        has_dtid: userDTID ? true : false,
        qr_code: qrCodeData,
        otp_for_testing: otp, // Include OTP in response for testing if SMS fails
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;

    // Validate input
    if (!mobile_number || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required'
      });
    }

    // Check if OTP exists for this mobile number
    const storedOtpData = otpStorage.get(mobile_number);
    
    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this mobile number. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiry) {
      otpStorage.delete(mobile_number); // Clean up expired OTP
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check if OTP matches
    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts += 1;
      
      // Allow up to 3 attempts
      if (storedOtpData.attempts >= 3) {
        otpStorage.delete(mobile_number); // Clean up after max attempts
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - storedOtpData.attempts} attempts remaining.`
      });
    }

    // OTP is valid - get user data and clean up
    const userDTID = storedOtpData.dtid;
    const userName = storedOtpData.full_name;
    const qrCodeData = storedOtpData.qr_code;
    otpStorage.delete(mobile_number);
    console.log(`OTP verified successfully for ${mobile_number}, User: ${userName || 'Not found'}, DTID: ${userDTID || 'Not found'}`);

    // Generate JWT token
    const token = jwt.sign(
      { 
        mobile_number: mobile_number,
        dtid: userDTID,
        full_name: userName,
        is_verified: true,
        verified_at: new Date().toISOString()
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully!',
      token: token,
      user: {
        mobile_number: mobile_number,
        dtid: userDTID,
        full_name: userName,
        has_dtid: userDTID ? true : false,
        qr_code: qrCodeData,
        is_verified: true,
        verified_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { mobile_number } = req.body;

    if (!mobile_number) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    // Validate mobile number format
    const mobileRegex = /^\+91[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store new OTP
    otpStorage.set(mobile_number, {
      otp: otp,
      expiry: otpExpiry,
      attempts: 0
    });

    console.log(`New OTP generated for ${mobile_number}: ${otp}`);

    // Send OTP via SMS
    try {
      await sendOTPSMS(mobile_number, otp);
      console.log(`New OTP sent successfully to ${mobile_number}`);

      res.status(200).json({
        success: true,
        message: 'New OTP sent to your mobile number!'
      });

    } catch (smsError) {
      console.error('SMS sending error:', smsError);
      console.log(`New OTP for ${mobile_number} (SMS failed): ${otp}`);
      
      res.status(200).json({
        success: true,
        message: 'New OTP generated! (Check server console - SMS service may be unavailable)',
        otp_for_testing: otp
      });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;

    // Validate input
    if (!mobile_number || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required'
      });
    }

    // Find user with mobile number and valid OTP
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('otp_code', otp)
      .single();

    if (userError || !user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or mobile number'
      });
    }

    // Check if OTP is expired
    const now = new Date();
    const otpExpiry = new Date(user.otp_expiry);

    if (now > otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Mark user as verified and clear OTP
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        registration_status: 'verified',
        otp_code: null,
        otp_expiry: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('User verification error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify user'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.id, 
        mobile_number: user.mobile_number,
        is_verified: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        mobile_number: user.mobile_number,
        is_verified: true,
        registration_status: 'verified'
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { mobile_number } = req.body;

    if (!mobile_number) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('mobile_number', mobile_number)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error: updateError } = await supabase
      .from('users')
      .update({
        otp_code: otp,
        otp_expiry: otpExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('OTP update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate new OTP'
      });
    }

    // Send OTP via SMS
    try {
      await sendOTPSMS(mobile_number, otp);
      console.log(`New OTP sent to ${mobile_number}: ${otp}`);
    } catch (smsError) {
      console.error('SMS sending error:', smsError);
      console.log(`New OTP for ${mobile_number} (SMS failed): ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your mobile number'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

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

// Helper function to send SMS via Twilio
async function sendOTPSMS(mobileNumber, otp) {
  try {
    const message = await twilioClient.messages.create({
      body: `Your Tourist Safety OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber
    });
    
    console.log(`SMS sent successfully. SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    throw error;
  }
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = router;


