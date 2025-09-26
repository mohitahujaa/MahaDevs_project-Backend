const supabase = require('../config/database.cjs');
const { updateSafetyScore } = require('../services/safetyScoreService.js');

// Geofencing helpers (inlined to avoid missing utils dependency)
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isInsideGeofence(currentLat, currentLong, zoneLat, zoneLong, radiusMeters) {
  const distance = haversineDistanceMeters(currentLat, currentLong, zoneLat, zoneLong);
  return distance <= radiusMeters;
}

function findNearestZones(currentLat, currentLong, zones, withinMeters) {
  const withDistance = zones.map((zone) => {
    const distance = haversineDistanceMeters(currentLat, currentLong, zone.latitude, zone.longitude);
    return { ...zone, distance };
  });
  return withDistance
    .filter((z) => z.distance <= withinMeters)
    .sort((a, b) => a.distance - b.distance);
}

const checkGeofence = async (req, res) => {
  try {
    const { dtid, currentLat, currentLong } = req.body;

    if (!dtid || !currentLat || !currentLong) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: dtid, currentLat, currentLong'
      });
    }

    // Get restricted zones (filter active in code to be resilient to schema differences)
    const { data: zonesRaw, error: zonesError } = await supabase
      .from('restricted_zones')
      .select('*');

    if (zonesError) throw zonesError;

    const zones = (zonesRaw || []).filter((zone) => {
      const hasIsActive = Object.prototype.hasOwnProperty.call(zone, 'is_active');
      const hasActive = Object.prototype.hasOwnProperty.call(zone, 'active');
      if (hasIsActive) return Boolean(zone.is_active);
      if (hasActive) return Boolean(zone.active);
      return true; // default to active if no column present
    });

    let breachedZones = [];
    let nearbyZones = [];

    if (zones && zones.length > 0) {
      // Check for geofence breaches
      breachedZones = zones.filter(zone => 
        isInsideGeofence(currentLat, currentLong, zone.latitude, zone.longitude, zone.radius_meters)
      );

      // Find nearby zones (within 10km)
      nearbyZones = findNearestZones(currentLat, currentLong, zones, 10000)
        .filter(zone => !breachedZones.find(breach => breach.id === zone.id));
    }

    // If there's a breach, create an anomaly record and update safety score
    if (breachedZones.length > 0) {
      const highestRiskZone = breachedZones.reduce((prev, current) => {
        const riskOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        return (riskOrder[current.risk_level] > riskOrder[prev.risk_level]) ? current : prev;
      });

      // Create anomaly record
      await supabase
        .from('anomalies')
        .insert({
          dtid,
          anomaly_type: 'geofence_breach',
          severity: highestRiskZone.risk_level,
          description: `Entered restricted zone: ${highestRiskZone.name}`,
          latitude: currentLat,
          longitude: currentLong,
          metadata: {
            zone_id: highestRiskZone.id,
            zone_name: highestRiskZone.name,
            zone_type: highestRiskZone.zone_type
          }
        });

      // Update safety score
      const scoreDeduction = highestRiskZone.risk_level === 'critical' ? -30 : -20;
      await updateSafetyScore(dtid, scoreDeduction, 'geofence_breach');
    }

    res.json({
      success: true,
      data: {
        inside: breachedZones.length > 0,
        breached_zones: breachedZones,
        nearby_zones: nearbyZones.slice(0, 5), // Limit to 5 nearest zones
        risk_level: breachedZones.length > 0 ? 
          Math.max(...breachedZones.map(z => ({ low: 1, medium: 2, high: 3, critical: 4 })[z.risk_level])) : 0
      }
    });

  } catch (error) {
    console.error('Geofence check error:', error);
    res.status(500).json({
      success: false,
      message: 'Geofence check failed',
      error: error.message
    });
  }
};

const getRestrictedZones = async (req, res) => {
  try {
    const { data: zonesRaw, error } = await supabase
      .from('restricted_zones')
      .select('*')
      .order('risk_level', { ascending: false });

    if (error) throw error;

    const zones = (zonesRaw || []).filter((zone) => {
      const hasIsActive = Object.prototype.hasOwnProperty.call(zone, 'is_active');
      const hasActive = Object.prototype.hasOwnProperty.call(zone, 'active');
      if (hasIsActive) return Boolean(zone.is_active);
      if (hasActive) return Boolean(zone.active);
      return true;
    });

    res.json({
      success: true,
      data: zones
    });

  } catch (error) {
    console.error('Get restricted zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restricted zones',
      error: error.message
    });
  }
};

module.exports = {
  checkGeofence,
  getRestrictedZones
};