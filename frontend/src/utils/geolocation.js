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
 * Get approximate location details from coordinates using reverse geocoding
 * Captures village/area, city, state, and country with fallback to "Anonymous"
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<{village: string|null, city: string, state: string, country: string}>}
 */
export const reverseGeocode = async (latitude, longitude, retries = 2) => {
  try {
    // Use backend proxy endpoint to avoid CORS issues
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await fetch(
      `${apiBaseUrl}/analytics/reverse-geocode?lat=${latitude}&lon=${longitude}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status !== 'success' || !result.data) {
      throw new Error('Invalid response from geocoding service');
    }

    const data = result.data;
    
    console.log('🌍 Geocoding result:', { village: data.village, city: data.city, state: data.state, country: data.country });
    
    return {
      village: data.village,
      city: data.city,
      state: data.state,
      country: data.country
    };
  } catch (error) {
    console.warn('⚠️ Reverse geocoding failed:', error);
    
    // Retry with exponential backoff
    if (retries > 0) {
      const delay = (3 - retries) * 1000; // 1s, 2s delays
      console.log(`🔄 Retrying geocoding in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return reverseGeocode(latitude, longitude, retries - 1);
    }
    
    // Return "Anonymous" for all fields if all retries fail
    return {
      village: null,
      city: 'Anonymous',
      state: '',
      country: 'Anonymous'
    };
  }
};

/**
 * Get complete location data including coordinates and address
 * @returns {Promise<{latitude: number, longitude: number, village: string|null, city: string, state: string, country: string} | null>}
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
      village: address.village,
      city: address.city,
      state: address.state,
      country: address.country,
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

