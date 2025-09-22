// src/services/qrCodeService.cjs
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

/**
 * QR Code Service - CommonJS version
 * Handles all QR code generation and storage operations
 */

/**
 * Generate QR code for DTID and save to specified location
 * @param {string} dtidBytes32 - The DTID in 0x format
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - QR generation result
 */
async function generateDTIDQRCode(dtidBytes32, options = {}) {
  try {
    const {
      fileName,
      directory = process.cwd(), // Default to project root
      format = 'dtid',
      additionalData = {}
    } = options;

    // Validate DTID format
    if (!/^0x[0-9a-fA-F]{64}$/.test(dtidBytes32)) {
      throw new Error('Invalid DTID: expected 0x-prefixed 32-byte hex string');
    }

    // Generate filename if not provided
    const timestamp = Date.now();
    const defaultFileName = `dtid-${dtidBytes32.slice(2, 10)}-${timestamp}.png`;
    const qrFileName = fileName || defaultFileName;

    // Prepare QR data based on format
    let qrData;
    if (format === 'json') {
      qrData = JSON.stringify({
        dtid: dtidBytes32,
        verificationUrl: `${process.env.QR_VERIFICATION_BASE_URL || 'http://localhost:3002'}/api/kyc/verify/${dtidBytes32}`,
        timestamp: new Date().toISOString(),
        type: 'tourist-dtid',
        ...additionalData
      });
    } else {
      qrData = dtidBytes32; // Simple DTID format
    }

    // Ensure directory exists
    await ensureDirectoryExists(directory);

    // Generate file path
    const filePath = path.resolve(directory, qrFileName);

    // Generate QR code with custom styling
    await QRCode.toFile(filePath, qrData, {
      color: {
        dark: '#1a365d',  // Dark blue
        light: '#ffffff'  // White
      },
      width: 300,
      margin: 3,
      errorCorrectionLevel: 'M'
    });

    console.log('[QR-SERVICE] QR code generated successfully:', filePath);

    return {
      success: true,
      filePath,
      fileName: qrFileName,
      directory,
      qrData: format === 'json' ? JSON.parse(qrData) : qrData,
      size: await getFileSize(filePath)
    };

  } catch (error) {
    console.error('[QR-SERVICE] QR code generation failed:', error);
    throw error;
  }
}

/**
 * Generate QR code for tourist verification with comprehensive data
 * @param {string} dtidBytes32 - The DTID
 * @param {Object} touristData - Tourist information
 * @returns {Promise<Object>} - QR generation result
 */
async function generateTouristQRCode(dtidBytes32, touristData = {}) {
  const { id, full_name, trip_start, trip_end } = touristData;
  
  // Create public/qr-codes directory structure
  const qrDirectory = path.resolve(process.cwd(), 'public', 'qr-codes');
  
  const options = {
    fileName: id ? `dtid-${id}.png` : undefined,
    directory: qrDirectory,
    format: 'json',
    additionalData: {
      tourist_id: id,
      name: full_name,
      trip_period: `${trip_start} to ${trip_end}`,
      generated_at: new Date().toISOString()
    }
  };

  return await generateDTIDQRCode(dtidBytes32, options);
}

/**
 * Get QR code file information
 * @param {string} filePath - Path to QR code file
 * @returns {Promise<Object>} - File information
 */
async function getQRCodeInfo(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    
    return {
      exists: true,
      fileName,
      filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      filePath,
      error: error.message
    };
  }
}

/**
 * List all QR codes in a directory
 * @param {string} directory - Directory to scan
 * @returns {Promise<Array>} - List of QR code files
 */
async function listQRCodes(directory = process.cwd()) {
  try {
    const files = await fs.readdir(directory);
    const qrFiles = files.filter(file => 
      file.startsWith('dtid-') && file.endsWith('.png')
    );
    
    const qrCodeList = await Promise.all(
      qrFiles.map(async (file) => {
        const filePath = path.join(directory, file);
        return await getQRCodeInfo(filePath);
      })
    );
    
    return qrCodeList;
  } catch (error) {
    console.error('[QR-SERVICE] Failed to list QR codes:', error);
    return [];
  }
}

// Utility functions
async function ensureDirectoryExists(directory) {
  try {
    await fs.access(directory);
  } catch (error) {
    await fs.mkdir(directory, { recursive: true });
    console.log('[QR-SERVICE] Created directory:', directory);
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

module.exports = {
  generateDTIDQRCode,
  generateTouristQRCode,
  getQRCodeInfo,
  listQRCodes
};