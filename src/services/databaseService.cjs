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
        Trip_End: tourist.trip_end       // Note: Capital T and underscore
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
  supabase
};