// src/services/databaseService.cjs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[DATABASE] Supabase credentials not found in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Store tourist data in Supabase database
 * @param {Object} tourist - Tourist data object
 * @returns {Promise<Object|null>} - Stored data or null if error
 */
async function storeTouristData(tourist) {
  try {
    console.log("[DATABASE] Attempting to store tourist data...");
    
    const { data, error } = await supabase
      .from('tourists')
      .insert([{
        dtid: tourist.dtid,
        full_name: tourist.full_name,
        date_of_birth: tourist.date_of_birth,
        contact_number: tourist.contact_number,
        email: tourist.email,
        emergency_contact_1: tourist.emergency_contact_1,
        emergency_contact_2: tourist.emergency_contact_2,
        nationality: tourist.nationality,
        Trip_Start: tourist.trip_start, // Note: Capital T and underscore
        Trip_End: tourist.trip_end,     // Note: Capital T and underscore
        id_file_path: tourist.id_file_path // Store the uploaded document path
        // Note: Excluding itinerary as it doesn't exist in current schema
      }])
      .select(); // Return the inserted data

    if (error) {
      console.error("[DATABASE] Error inserting tourist:", error);
      
      // Handle specific error cases
      if (error.code === '42501') {
        console.log("[DATABASE] 🔧 RLS Policy Issue: Row Level Security is blocking insertion");
        console.log("[DATABASE] 💡 Solution: Update Supabase RLS policies or use service role key");
      } else if (error.code === 'PGRST204') {
        console.log("[DATABASE] 🔧 Schema Issue: Column not found in table");
        console.log("[DATABASE] 💡 Solution: Check table schema matches the data being inserted");
      }
      
      return { success: false, error: error.message, code: error.code };
    }

    console.log("[DATABASE] ✅ Tourist data stored successfully:", data[0]?.dtid);
    return { success: true, data: data[0] };
    
  } catch (error) {
    console.error("[DATABASE] Unexpected error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Store QR code information in Supabase qr_codes table
 * @param {string} dtid - Tourist DTID
 * @param {string} fileUrl - URL/path to the QR code file
 * @returns {Promise<Object>} - Storage result
 */
async function storeQRCodeData(dtid, fileUrl) {
  try {
    console.log("[DATABASE] Storing QR code data for DTID:", dtid);
    
    // Simplified payload with just the essential fields
    const qrData = {
      dtid: dtid,
      file_url: fileUrl
      // Note: Let Supabase handle any timestamp fields automatically
    };

    const { data, error } = await supabase
      .from('qr_codes')
      .insert([qrData]);

    if (error) {
      console.error("[DATABASE] ❌ Error storing QR code data:", error);
      
      // Handle specific error cases
      if (error.code === '23505') { // Unique constraint violation
        console.log("[DATABASE] 🔄 QR code already exists, updating...");
        
        // Try to update existing record
        const { data: updateData, error: updateError } = await supabase
          .from('qr_codes')
          .update({ file_url: fileUrl })
          .eq('dtid', dtid);
          
        if (updateError) {
          console.error("[DATABASE] ❌ Error updating QR code:", updateError);
          return { success: false, error: updateError.message, data: null };
        }
        
        console.log("[DATABASE] ✅ QR code data updated successfully");
        return { success: true, error: null, action: 'updated' };
      }
      
      return { success: false, error: error.message, data: null };
    }
    
    console.log("[DATABASE] ✅ QR code data stored successfully");
    return { success: true, error: null, action: 'created' };
    
  } catch (err) {
    console.error("[DATABASE] ❌ Unexpected error storing QR code:", err);
    return { success: false, error: err.message, data: null };
  }
}

/**
 * Get QR code information by DTID
 * @param {string} dtid - Tourist DTID
 * @returns {Promise<Object>} - QR code data or null
 */
async function getQRCodeByDTID(dtid) {
  try {
    console.log("[DATABASE] Fetching QR code for DTID:", dtid);
    
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('dtid', dtid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log("[DATABASE] ℹ️ No QR code found for DTID:", dtid);
        return { success: false, error: 'QR code not found', data: null };
      }
      console.error("[DATABASE] ❌ Error fetching QR code:", error);
      return { success: false, error: error.message, data: null };
    }
    
    console.log("[DATABASE] ✅ QR code data retrieved successfully");
    return { success: true, error: null, data: data };
    
  } catch (err) {
    console.error("[DATABASE] ❌ Unexpected error fetching QR code:", err);
    return { success: false, error: err.message, data: null };
  }
}

/**
 * List all QR codes with optional filtering
 * @param {Object} filters - Optional filters (limit, offset, etc.)
 * @returns {Promise<Object>} - QR codes list
 */
async function listQRCodes(filters = {}) {
  try {
    const { limit = 50, offset = 0 } = filters;
    
    console.log("[DATABASE] Listing QR codes...");
    
    let query = supabase
      .from('qr_codes')
      .select('*');
    
    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;

    if (error) {
      console.error("[DATABASE] ❌ Error listing QR codes:", error);
      return { success: false, error: error.message, data: null };
    }
    
    console.log(`[DATABASE] ✅ Retrieved ${data.length} QR codes`);
    return { success: true, error: null, data: data };
    
  } catch (err) {
    console.error("[DATABASE] ❌ Unexpected error listing QR codes:", err);
    return { success: false, error: err.message, data: null };
  }
}

/**
 * Get tourist data by DTID
 * @param {string} dtid - Tourist DTID
 * @returns {Promise<Object|null>} - Tourist data or null if not found
 */
async function getTouristByDTID(dtid) {
  try {
    console.log('[DATABASE] Fetching tourist data for DTID:', dtid);
    
    const { data, error } = await supabase
      .from('tourists')
      .select('*')
      .eq('dtid', dtid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[DATABASE] Tourist not found for DTID:', dtid);
        return null;
      }
      console.error('[DATABASE] Error fetching tourist:', error);
      throw error;
    }

    console.log('[DATABASE] Tourist data retrieved successfully');
    return data;
  } catch (error) {
    console.error('[DATABASE] Failed to get tourist data:', error);
    return null;
  }
}

/**
 * Update tourist data
 * @param {string} dtid - Tourist DTID
 * @param {Object} updates - Data to update
 * @returns {Promise<Object|null>} - Updated data or null if error
 */
async function updateTouristData(dtid, updates) {
  try {
    console.log('[DATABASE] Updating tourist data for DTID:', dtid);
    
    const { data, error } = await supabase
      .from('tourists')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('dtid', dtid)
      .select();

    if (error) {
      console.error('[DATABASE] Error updating tourist:', error);
      throw error;
    }

    console.log('[DATABASE] Tourist data updated successfully');
    return data[0];
  } catch (error) {
    console.error('[DATABASE] Failed to update tourist data:', error);
    return null;
  }
}

/**
 * Store blockchain transaction data
 * @param {string} dtid - Tourist DTID
 * @param {Object} transactionData - Blockchain transaction details
 * @returns {Promise<Object|null>} - Inserted data or null if error
 */
async function storeBlockchainTransaction(dtid, transactionData) {
  try {
    console.log('[DATABASE] Storing blockchain transaction for DTID:', dtid);
    
    const { data, error } = await supabase
      .from('blockchain_transactions')
      .insert([{
        dtid: dtid,
        transaction_hash: transactionData.transactionHash,
        contract_address: transactionData.contractAddress,
        block_number: transactionData.blockNumber,
        gas_used: transactionData.gasUsed,
        network: 'sepolia',
        status: transactionData.status || 'confirmed',
        qr_path: transactionData.qrPath,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('[DATABASE] Error inserting blockchain transaction:', error);
      throw error;
    }

    console.log('[DATABASE] Blockchain transaction stored successfully');
    return data[0];
  } catch (error) {
    console.error('[DATABASE] Failed to store blockchain transaction:', error);
    return null;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} - Connection status
 */
async function testDatabaseConnection() {
  try {
    const { error } = await supabase
      .from('tourists')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('[DATABASE] Connection test failed:', error);
      return false;
    }

    console.log('[DATABASE] Connection test successful');
    return true;
  } catch (error) {
    console.error('[DATABASE] Connection test error:', error);
    return false;
  }
}

module.exports = {
  storeTouristData,
  getTouristByDTID,
  updateTouristData,
  storeBlockchainTransaction,
  testDatabaseConnection,
  storeQRCodeData,
  getQRCodeByDTID,
  listQRCodes,
  supabase
};