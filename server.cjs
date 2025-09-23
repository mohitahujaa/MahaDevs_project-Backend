require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');


const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Serve static files (for QR codes)
app.use('/qr-codes', express.static(path.join(__dirname, 'public/qr-codes')));

// Routes
app.use('/api/auth', require('./src/routes/auth.cjs'));
app.use('/api/kyc', require('./src/routes/kyc.cjs'));
app.use('/api/geofence', require('./src/routes/geofence.cjs'));

// API documentation endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Tourist Safety Monitoring & Incident Response System API',
    version: '1.0.0',
    endpoints: {
      authentication: {
        'POST /api/auth/admin/login': 'Admin login',
        'POST /api/auth/refresh': 'Tourist token refresh'
      },
      kyc: {
        'POST /api/kyc/verify': 'KYC verification and DTID generation',
        'GET /api/kyc/:dtid': 'Get tourist profile'
      }
    },
    authentication: {
        header: 'Authorization: Bearer <token>',
        admin_credentials: {
          username: 'admin',
          password: 'admin123'
        }
      }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  });

  const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Smart Tourist Safety Monitoring API Server is running on port ${PORT}`);
  console.log(` API Documentation: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/health`);
  console.log(` Admin Login: POST http://localhost:${PORT}/auth/admin/login`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;


