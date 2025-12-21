// frontend/src/utils/gpsFilter.js

/**
 * Calculate distance between two GPS coordinates in kilometers
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Filter out GPS coordinates that are too far from other points
 * @param {Array} trackingData - Array of tracking points with latitude and longitude
 * @param {number} maxDistanceKm - Maximum allowed distance between consecutive points (default: 50km)
 * @param {number} maxSpeedKmh - Maximum realistic speed in km/h (default: 200 km/h)
 * @param {number} timeThresholdMs - Time threshold for speed calculation (default: 1 hour)
 * @returns {Array} Filtered tracking data
 */
export const filterInvalidGPS = (
  trackingData, 
  maxDistanceKm = 50, 
  maxSpeedKmh = 200, 
  timeThresholdMs = 60 * 60 * 1000 // 1 hour
) => {
  if (!Array.isArray(trackingData) || trackingData.length < 2) {
    return trackingData;
  }

  const filtered = [];
  let lastValidPoint = null;

  for (let i = 0; i < trackingData.length; i++) {
    const currentPoint = trackingData[i];
    
    // Skip points without valid coordinates
    if (!currentPoint.latitude || !currentPoint.longitude) {
      continue;
    }

    // Check for obviously invalid coordinates
    if (currentPoint.latitude < -90 || currentPoint.latitude > 90 ||
        currentPoint.longitude < -180 || currentPoint.longitude > 180) {
      continue;
    }

    // If this is the first valid point, include it
    if (lastValidPoint === null) {
      filtered.push(currentPoint);
      lastValidPoint = currentPoint;
      continue;
    }

    // Calculate distance from last valid point
    const distance = calculateDistance(
      lastValidPoint.latitude, 
      lastValidPoint.longitude,
      currentPoint.latitude, 
      currentPoint.longitude
    );

    // Check if distance is reasonable
    if (distance > maxDistanceKm) {
      // Calculate time difference
      const timeDiff = Math.abs(
        new Date(currentPoint.datetime || currentPoint.timestamp) - 
        new Date(lastValidPoint.datetime || lastValidPoint.timestamp)
      );

      // Calculate speed if we have time difference
      if (timeDiff > 0 && timeDiff < timeThresholdMs) {
        const speedKmh = (distance / timeDiff) * 3600000; // Convert to km/h
        
        // If speed is reasonable, include the point
        if (speedKmh <= maxSpeedKmh) {
          filtered.push(currentPoint);
          lastValidPoint = currentPoint;
        }
        // If speed is too high, skip this point
      } else {
        // If time difference is too large or invalid, skip this point
        continue;
      }
    } else {
      // Distance is reasonable, include the point
      filtered.push(currentPoint);
      lastValidPoint = currentPoint;
    }
  }

  return filtered;
};

/**
 * Get statistics about the filtering process
 * @param {Array} originalData - Original tracking data
 * @param {Array} filteredData - Filtered tracking data
 * @returns {Object} Statistics about the filtering
 */
export const getFilteringStats = (originalData, filteredData) => {
  const totalPoints = originalData.length;
  const filteredPoints = filteredData.length;
  const removedPoints = totalPoints - filteredPoints;
  const removalPercentage = totalPoints > 0 ? (removedPoints / totalPoints) * 100 : 0;

  return {
    totalPoints,
    filteredPoints,
    removedPoints,
    removalPercentage: Math.round(removalPercentage * 100) / 100
  };
};

/**
 * Advanced filtering with multiple criteria
 * @param {Array} trackingData - Array of tracking points
 * @param {Object} options - Filtering options
 * @returns {Object} Filtered data and statistics
 */
export const advancedGPSFilter = (trackingData, options = {}) => {
  const {
    maxDistanceKm = 50,
    maxSpeedKmh = 200,
    timeThresholdMs = 60 * 60 * 1000,
    enableSpeedFilter = true,
    enableDistanceFilter = true,
    enableCoordinateValidation = true
  } = options;

  if (!Array.isArray(trackingData) || trackingData.length === 0) {
    return {
      filteredData: trackingData,
      stats: { totalPoints: 0, filteredPoints: 0, removedPoints: 0, removalPercentage: 0 }
    };
  }

  let filtered = trackingData;

  // Step 1: Basic coordinate validation
  if (enableCoordinateValidation) {
    filtered = filtered.filter(point => {
      return point.latitude && point.longitude &&
             point.latitude >= -90 && point.latitude <= 90 &&
             point.longitude >= -180 && point.longitude <= 180;
    });
  }

  // Step 2: Distance and speed filtering
  if (enableDistanceFilter || enableSpeedFilter) {
    filtered = filterInvalidGPS(filtered, maxDistanceKm, maxSpeedKmh, timeThresholdMs);
  }

  const stats = getFilteringStats(trackingData, filtered);

  return {
    filteredData: filtered,
    stats
  };
}; 