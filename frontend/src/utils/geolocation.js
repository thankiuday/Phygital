/**
 * Geolocation Utilities
 * Handles browser geolocation API with proper error handling
 */

/**
 * Get user's current location
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocation is not supported by this browser');
      reject(new Error('Geolocation not supported'));
      return;
    }

    // Request location with timeout
    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000 // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        console.log('📍 Location captured:', location);
        resolve(location);
      },
      (error) => {
        console.warn('⚠️ Geolocation error:', error.message);
        
        // Handle different error types
        switch(error.code) {
          case error.PERMISSION_DENIED:
            console.log('ℹ️ User denied location permission');
            break;
          case error.POSITION_UNAVAILABLE:
            console.log('ℹ️ Location information unavailable');
            break;
          case error.TIMEOUT:
            console.log('ℹ️ Location request timed out');
            break;
          default:
            console.log('ℹ️ Unknown geolocation error');
        }
        
        // Don't reject - just resolve with null so analytics still works
        resolve(null);
      },
      options
    );
  });
};

/**
 * Get approximate city and country from coordinates using reverse geocoding
 * Note: This is a basic implementation. For production, consider using a proper geocoding API
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<{city: string, country: string}>}
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    // Using OpenStreetMap's Nominatim API (free, but rate-limited)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'PhygitalARApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    return {
      city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
      country: data.address?.country || 'Unknown',
      state: data.address?.state || ''
    };
  } catch (error) {
    console.warn('⚠️ Reverse geocoding failed:', error);
    return {
      city: 'Unknown',
      country: 'Unknown',
      state: ''
    };
  }
};

/**
 * Get complete location data including coordinates and address
 * @returns {Promise<{latitude: number, longitude: number, city: string, country: string} | null>}
 */
export const getCompleteLocation = async () => {
  try {
    console.log('📍 Requesting user location...');
    const coords = await getUserLocation();
    
    if (!coords) {
      console.log('ℹ️ No location data available');
      return null;
    }

    console.log('🌍 Performing reverse geocoding...');
    const address = await reverseGeocode(coords.latitude, coords.longitude);
    
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      city: address.city,
      country: address.country,
      state: address.state,
      accuracy: coords.accuracy
    };
  } catch (error) {
    console.warn('⚠️ Failed to get complete location:', error);
    return null;
  }
};

/**
 * Request location permission from user
 * Shows a friendly prompt before requesting
 */
export const requestLocationPermission = async () => {
  try {
    const location = await getUserLocation();
    return location !== null;
  } catch (error) {
    return false;
  }
};

