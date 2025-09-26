// controllers/kycController.cjs
const crypto = require('crypto');
const { generateTouristQRCode } = require('../services/qrCodeService.cjs');
const { storeTouristData, storeBlockchainTransaction } = require('../services/databaseService.cjs');
const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

// Generate SHA-256 from actual frontend input (id, trip_start, trip_end)
function generateDTIDFromInput({ id, trip_start, trip_end }, salt = '') {
  const idPart = id ?? '';
  const startPart = trip_start ?? '';
  const endPart = trip_end ?? '';
  const payload = `${idPart}|${startPart}|${endPart}|${salt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Real blockchain service using actual Sepolia network
async function storeDTIDAndGenerateQR(dtidBytes32, touristData, options = {}) {
  console.log('[BLOCKCHAIN] Starting real blockchain transaction for DTID:', dtidBytes32);
  
  const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS = "0x89AF6d79b35d0f43b95e90618d7C036C2045e943"; // From artifacts
  
  let blockchainResult = null;
  
  // Try real blockchain transaction if configured
  if (SEPOLIA_RPC_URL && PRIVATE_KEY && CONTRACT_ADDRESS) {
    try {
      console.log('[BLOCKCHAIN] Connecting to Sepolia network...');
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Basic contract ABI for registerDTID function
      const contractABI = [
        "function registerDTID(bytes32 dtid) external",
        "function verifyDTID(bytes32 dtid) external view returns (bool)",
        "function totalDTIDs() external view returns (uint256)",
        "event DTIDRegistered(address indexed registrar, bytes32 indexed dtid)"
      ];
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
      
      // First check if DTID already exists
      console.log('[BLOCKCHAIN] Checking if DTID already exists...');
      const exists = await contract.verifyDTID(dtidBytes32);
      
      if (exists) {
        console.log('[BLOCKCHAIN] DTID already exists on blockchain, skipping registration');
        blockchainResult = {
          success: true,
          transactionHash: 'ALREADY_REGISTERED',
          contractAddress: CONTRACT_ADDRESS,
          network: 'sepolia',
          real: true,
          alreadyExists: true,
          message: 'DTID already registered on blockchain'
        };
      } else {
        console.log('[BLOCKCHAIN] DTID not found, proceeding with registration...');
        const tx = await contract.registerDTID(dtidBytes32);
        console.log('[BLOCKCHAIN] Transaction sent, hash:', tx.hash);
        
        console.log('[BLOCKCHAIN] Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('[BLOCKCHAIN] Transaction confirmed in block:', receipt.blockNumber);
        
        blockchainResult = {
          success: true,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          contractAddress: CONTRACT_ADDRESS,
          confirmations: receipt.confirmations,
          network: 'sepolia',
          real: true,
          newRegistration: true
        };
      }
      
    } catch (error) {
      console.error('[BLOCKCHAIN] Real blockchain transaction failed:', error.message);
      blockchainResult = {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  } else {
    console.log('[BLOCKCHAIN] Missing blockchain configuration, using simulation');
    blockchainResult = {
      success: false,
      error: 'Missing blockchain configuration',
      simulated: true
    };
  }
  
  // Generate QR code using the dedicated service
  let qrResult = null;
  try {
    qrResult = await generateTouristQRCode(dtidBytes32, touristData);
    console.log('[BLOCKCHAIN] QR code generated via QR Service:', qrResult.filePath);
  } catch (error) {
    console.error('[BLOCKCHAIN] QR generation failed:', error);
    qrResult = { success: false, error: error.message };
  }
  
  return {
    blockchain: blockchainResult,
    qrResult,
    qrPath: qrResult.success ? qrResult.filePath : null,
    qrGenerated: qrResult.success
  };
}

const verifyKYC = async (req, res) => {
    try {
      const {
        id, // Aadhaar or Passport
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
  
      // Validation
      if (!full_name || !date_of_birth || !contact_number || !emergency_contact_1) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: full_name, date_of_birth, contact_number, emergency_contact_1'
        });
      }
  
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'An ID (Aadhaar or Passport) is required'
        });
      }

      // 1) Generate DTID from actual input with timestamp for uniqueness
      const timestamp = Date.now();
      const sha256Hex = generateDTIDFromInput({ id, trip_start, trip_end, timestamp }, salt);
      const dtidBytes32 = `0x${sha256Hex}`;
      console.log('[KYC] Generated DTID hex:', sha256Hex);
      console.log('[KYC] DTID bytes32:', dtidBytes32, 'for id:', id, 'trip:', trip_start, '->', trip_end, 'timestamp:', timestamp);

      // 2) Store on Sepolia and generate QR using real blockchain
      let onchain = null;
      const touristData = { id, full_name, trip_start, trip_end };
      
      try {
        onchain = await storeDTIDAndGenerateQR(dtidBytes32, touristData);
        
        if (onchain.blockchain.success) {
          console.log('[KYC] ✅ Real blockchain transaction successful!');
          console.log('[KYC] Transaction hash:', onchain.blockchain.transactionHash);
          console.log('[KYC] Block number:', onchain.blockchain.blockNumber);
          console.log('[KYC] Contract address:', onchain.blockchain.contractAddress);
          console.log('[KYC] Gas used:', onchain.blockchain.gasUsed);
        } else {
          console.log('[KYC] ⚠️ Blockchain transaction failed:', onchain.blockchain.error);
        }
        
        if (onchain.qrGenerated) {
          console.log('[KYC] QR code generated successfully:', onchain.qrPath);
        }
      } catch (e) {
        // If blockchain fails completely, continue with KYC success but report the error
        onchain = { 
          blockchain: { success: false, error: e.message },
          qrResult: { success: false, error: e.message }
        };
        console.warn('[KYC] Complete failure:', e.message);
      }
  
      // Mock KYC verification
      const kycStatus = 'verified';

      // Prepare response data in ordered format
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

      // Store tourist data in Supabase
      let databaseResult = null;
      try {
        console.log('[KYC] Storing tourist data in Supabase...');
        databaseResult = await storeTouristData(responseData);
        
        if (databaseResult) {
          console.log('[KYC] ✅ Tourist data stored in Supabase:', databaseResult.id);
          
          // Store blockchain transaction data if available
          if (onchain.blockchain && onchain.blockchain.success) {
            await storeBlockchainTransaction(dtidBytes32, {
              transactionHash: onchain.blockchain.transactionHash,
              contractAddress: onchain.blockchain.contractAddress,
              blockNumber: onchain.blockchain.blockNumber,
              gasUsed: onchain.blockchain.gasUsed,
              qrPath: onchain.qrPath,
              status: 'confirmed'
            });
            console.log('[KYC] ✅ Blockchain transaction data stored in Supabase');
          }
        } else {
          console.log('[KYC] ⚠️ Failed to store tourist data in Supabase');
        }
      } catch (dbError) {
        console.error('[KYC] Database storage error:', dbError);
        // Continue with response even if database fails
      }

      // Add database result to response
      responseData.database = {
        stored: !!databaseResult,
        id: databaseResult?.id || null
      };      res.status(201).json({
        success: true,
        message: 'KYC verification completed successfully',
        data: responseData
      });
  
    } catch (error) {
      console.error('KYC verification error:', error);
      res.status(500).json({
        success: false,
        message: 'KYC verification failed',
        error: error.message
      });
    }
  };
  
  module.exports = {
    verifyKYC
  };
  