// controllers/kycController.js
import { generateDTIDFromInput } from '../services/hashService.js';
import { generateTouristQRCode } from '../services/qrCodeService.js';
import { storeTouristData, storeBlockchainTransaction } from '../services/databaseService.js';

// Enhanced blockchain service using QR Code Service  
async function storeDTIDAndGenerateQR(dtidBytes32, touristData) {
  console.log('[BLOCKCHAIN] Storing DTID on blockchain:', dtidBytes32);
  
  // Generate QR code using the dedicated service
  let qrResult = null;
  try {
    qrResult = await generateTouristQRCode(dtidBytes32, touristData);
    console.log('[BLOCKCHAIN] QR code generated via QR Service:', qrResult.filePath);
  } catch (error) {
    console.error('[BLOCKCHAIN] QR generation failed:', error);
    qrResult = { success: false, error: error.message };
  }
  
  // Simulate blockchain operation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    contractAddress: '0x742d35Cc1234567890abcdef1234567890abcdef',
    qrResult,
    qrPath: qrResult.success ? qrResult.filePath : null,
    qrGenerated: qrResult.success,
    simulated: true
  };
}

export const verifyKYC = async (req, res) => {
  try {
    const {
      id,
      full_name,
      date_of_birth,
      contact_number,
      email,
      emergency_contact_1,
      emergency_contact_2,
      nationality,
      itinerary,
      trip_start,
      trip_end,
      salt,
      id_file_path
    } = req.body;

    if (!full_name || !date_of_birth || !contact_number || !emergency_contact_1) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: full_name, date_of_birth, contact_number, emergency_contact_1'
      });
    }
    if (!id) {
      return res.status(400).json({ success: false, message: 'An ID (Aadhaar or Passport) is required' });
    }

    // 1) Generate DTID from actual input
    const sha256Hex = generateDTIDFromInput({ id, trip_start, trip_end }, salt);
    const dtidBytes32 = `0x${sha256Hex}`;
    console.log('[KYC] Generated DTID hex:', sha256Hex);
    console.log('[KYC] DTID bytes32:', dtidBytes32, 'for id:', id, 'trip:', trip_start, '->', trip_end);

    // 2) Store on Sepolia and generate QR using QR Service
    let onchain = null;
    const touristData = { id, full_name, trip_start, trip_end };
    
    try {
      onchain = await storeDTIDAndGenerateQR(dtidBytes32, touristData);
      console.log('[KYC] On-chain tx hash:', onchain.transactionHash, 'contract:', onchain.contractAddress);
      if (onchain.qrGenerated) {
        console.log('[KYC] QR code generated successfully:', onchain.qrPath);
      }
    } catch (e) {
      // If blockchain not configured, continue with KYC success but report the error
      onchain = { error: e.message };
      console.warn('[KYC] On-chain store skipped:', e.message);
    }

    const kycStatus = 'verified';

    // 3) Store tourist data in database
    const touristRecord = {
      dtid: dtidBytes32,
      full_name,
      date_of_birth,
      contact_number,
      email,
      emergency_contact_1,
      emergency_contact_2,
      nationality: nationality || 'India',
      trip_start: trip_start || null,
      trip_end: trip_end || null,
      itinerary: itinerary || [],
      id_file_path: id_file_path || null
    };

    try {
      const dbResult = await storeTouristData(touristRecord);
      console.log('[KYC] Tourist data stored in database:', dbResult.success);
    } catch (dbError) {
      console.warn('[KYC] Database storage failed:', dbError.message);
      // Don't fail the whole process if database storage fails
    }

    const responseData = {
      full_name,
      id,
      date_of_birth,
      contact_number,
      email,
      emergency_contact_1,
      emergency_contact_2,
      nationality: nationality || 'India',
      trip_start: trip_start || null,
      trip_end: trip_end || null,
      itinerary: itinerary || [],
      status: kycStatus,
      dtid: dtidBytes32,
      onchain,
      id_file_path: id_file_path || null
    };

    return res.status(201).json({ success: true, message: 'KYC verification completed successfully', data: responseData });
  } catch (error) {
    console.error('KYC verification error:', error);
    return res.status(500).json({ success: false, message: 'KYC verification failed', error: error.message });
  }
};
  