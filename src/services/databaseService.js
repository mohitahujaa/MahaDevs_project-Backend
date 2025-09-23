// src/services/databaseService.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

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
export async function storeTouristData(tourist) {
  try {
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
        itinerary: tourist.itinerary, // JSON field
        Trip_Start: tourist.trip_start, // Note: Capital T and underscore
        Trip_End: tourist.trip_end       // Note: Capital T and underscore
      }])
      .select(); // Return the inserted data

    if (error) {
      console.error("[DATABASE] Error inserting tourist:", error);
      return { success: false, error: error.message };
    }

    console.log("[DATABASE] Tourist data stored successfully:", data[0]);
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
export async function getTouristByDTID(dtid) {
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
export async function updateTouristData(dtid, updates) {
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
export async function storeBlockchainTransaction(dtid, transactionData) {
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
 * Get all tourists with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {Promise<Object>} - Paginated tourist data
 */
export async function getAllTourists(page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabase
      .from('tourists')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[DATABASE] Error fetching tourists:', error);
      throw error;
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('[DATABASE] Failed to get tourists:', error);
    return { data: [], pagination: null };
  }
}

/**
 * Search tourists by various criteria
 * @param {Object} searchCriteria - Search parameters
 * @returns {Promise<Array>} - Matching tourists
 */
export async function searchTourists(searchCriteria) {
  try {
    let query = supabase.from('tourists').select('*');

    if (searchCriteria.full_name) {
      query = query.ilike('full_name', `%${searchCriteria.full_name}%`);
    }
    
    if (searchCriteria.contact_number) {
      query = query.eq('contact_number', searchCriteria.contact_number);
    }
    
    if (searchCriteria.nationality) {
      query = query.eq('nationality', searchCriteria.nationality);
    }
    
    if (searchCriteria.trip_start) {
      query = query.gte('trip_start', searchCriteria.trip_start);
    }
    
    if (searchCriteria.trip_end) {
      query = query.lte('trip_end', searchCriteria.trip_end);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[DATABASE] Error searching tourists:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[DATABASE] Failed to search tourists:', error);
    return [];
  }
}

/**
 * Get tourist statistics
 * @returns {Promise<Object>} - Statistics data
 */
export async function getTouristStats() {
  try {
    const { data: totalCount, error: countError } = await supabase
      .from('tourists')
      .select('*', { count: 'exact', head: true });

    const { data: recentCount, error: recentError } = await supabase
      .from('tourists')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (countError || recentError) {
      throw countError || recentError;
    }

    return {
      total_tourists: totalCount || 0,
      recent_registrations: recentCount || 0,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DATABASE] Failed to get tourist stats:', error);
    return {
      total_tourists: 0,
      recent_registrations: 0,
      last_updated: new Date().toISOString()
    };
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} - Connection status
 */
export async function testDatabaseConnection() {
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

// Export supabase client for advanced usage
export { supabase };

// Default export for CommonJS compatibility
export default {
  storeTouristData,
  getTouristByDTID,
  updateTouristData,
  storeBlockchainTransaction,
  getAllTourists,
  searchTourists,
  getTouristStats,
  testDatabaseConnection,
  supabase
};