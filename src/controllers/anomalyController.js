const supabase = require('../config/database');
const {
  detectInactivity,
  detectRouteDeviation,
  detectAltitudeDrop,
  detectSpeedAnomaly
} = require('../utils/anomalyDetection');
const { checkGeofenceBreach } = require('../utils/geofencing');
const { updateSafetyScore } = require('../services/safetyScoreService');

const checkAnomalies = async (req, res) => {
  try {
    const { dtid } = req.params;

    // Get recent locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('*')
      .eq('dtid', dtid)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (locError) throw locError;

    if (!locations || locations.length === 0) {
      return res.json({
        success: true,
        data: {
          anomalies: [],
          status: 'no_data'
        }
      });
    }

    // Get itineraries
    const { data: itineraries } = await supabase
      .from('itineraries')
      .select('*')
      .eq('dtid', dtid);

    const anomalies = [];
    const latestLocation = locations[0];

    // Check for inactivity
    const inactivityCheck = detectInactivity(latestLocation.timestamp);
    if (inactivityCheck.isAnomaly) {
      anomalies.push(inactivityCheck);
    }

    // Check for route deviation
    if (itineraries && itineraries.length > 0) {
      const deviationCheck = detectRouteDeviation(
        latestLocation.latitude, 
        latestLocation.longitude, 
        itineraries
      );
      if (deviationCheck.isAnomaly) {
        anomalies.push(deviationCheck);
      }
    }

    // Check for altitude drop
    const altitudeCheck = detectAltitudeDrop(locations);
    if (altitudeCheck.isAnomaly) {
      anomalies.push(altitudeCheck);
    }

    // Check for speed anomaly
    const speedCheck = detectSpeedAnomaly(locations);
    if (speedCheck.isAnomaly) {
      anomalies.push(speedCheck);
    }

    // Check for geofence breach
    const geofenceCheck = await checkGeofenceBreach(
      latestLocation.latitude, 
      latestLocation.longitude
    );
    if (geofenceCheck.isAnomaly) {
      anomalies.push(geofenceCheck);
    }

    // Store new anomalies in database
    for (const anomaly of anomalies) {
      if (anomaly.isAnomaly) {
        // Check if this anomaly type already exists and is active
        const { data: existing } = await supabase
          .from('anomalies')
          .select('id')
          .eq('dtid', dtid)
          .eq('anomaly_type', anomaly.type)
          .eq('status', 'active')
          .single();

        if (!existing) {
          // Create new anomaly record
          await supabase
            .from('anomalies')
            .insert({
              dtid,
              anomaly_type: anomaly.type,
              severity: anomaly.severity,
              description: `${anomaly.type.replace('_', ' ')} detected`,
              latitude: latestLocation.latitude,
              longitude: latestLocation.longitude,
              metadata: anomaly.details
            });

          // Update safety score
          const scoreDeduction = getSeverityScore(anomaly.severity);
          await updateSafetyScore(dtid, scoreDeduction, anomaly.type);
        }
      }
    }

    // Get all active anomalies from database
    const { data: activeAnomalies, error: anomalyError } = await supabase
      .from('anomalies')
      .select('*')
      .eq('dtid', dtid)
      .eq('status', 'active')
      .order('detected_at', { ascending: false });

    if (anomalyError) throw anomalyError;

    res.json({
      success: true,
      data: {
        anomalies: activeAnomalies || [],
        detected_now: anomalies.filter(a => a.isAnomaly),
        status: activeAnomalies && activeAnomalies.length > 0 ? 'anomalies_detected' : 'normal'
      }
    });

  } catch (error) {
    console.error('Anomaly check error:', error);
    res.status(500).json({
      success: false,
      message: 'Anomaly check failed',
      error: error.message
    });
  }
};

const resolveAnomaly = async (req, res) => {
  try {
    const { anomalyId } = req.params;
    const { status = 'resolved', notes } = req.body;

    if (!['resolved', 'false_positive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "resolved" or "false_positive"'
      });
    }

    // First get the current anomaly to preserve existing metadata
    const { data: currentAnomaly, error: fetchError } = await supabase
      .from('anomalies')
      .select('metadata')
      .eq('id', anomalyId)
      .single();

    if (fetchError) throw fetchError;
    if (!currentAnomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }

    const { data: anomaly, error } = await supabase
      .from('anomalies')
      .update({
        status: status,
        resolved_at: new Date().toISOString(),
        metadata: { 
          ...currentAnomaly.metadata, 
          resolution_notes: notes 
        }
      })
      .eq('id', anomalyId)
      .select()
      .single();

    if (error) throw error;

    // If resolved, restore some safety score points
    if (status === 'resolved') {
      const restorePoints = getSeverityScore(anomaly.severity) / -2; // Restore half the deducted points
      await updateSafetyScore(anomaly.dtid, restorePoints, 'anomaly_resolved');
    }

    res.json({
      success: true,
      message: `Anomaly marked as ${status}`,
      data: anomaly
    });

  } catch (error) {
    console.error('Resolve anomaly error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve anomaly',
      error: error.message
    });
  }
};

const getAllAnomalies = async (req, res) => {
  try {
    const { status = 'active', limit = 50 } = req.query;

    const { data: anomalies, error } = await supabase
      .from('anomalies')
      .select(`
        *,
        tourists(full_name, contact_number)
      `)
      .eq('status', status)
      .order('detected_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data: anomalies || []
    });

  } catch (error) {
    console.error('Get all anomalies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch anomalies',
      error: error.message
    });
  }
};

// Helper function to get score deduction based on severity
const getSeverityScore = (severity) => {
  const severityScores = {
    low: -5,
    medium: -10,
    high: -20,
    critical: -30
  };
  return severityScores[severity] || -10;
};

module.exports = {
  checkAnomalies,
  resolveAnomaly,
  getAllAnomalies
};