/**
 * Location Analytics Component
 * Displays geographic distribution of QR code scans
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Globe, TrendingUp } from 'lucide-react';

const LocationAnalytics = ({ userId, projectId = null, days = 30 }) => {
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLocationData();
  }, [userId, projectId, days]);

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Choose endpoint based on whether we're looking at a specific project
      const endpoint = projectId
        ? `/analytics/project/${userId}/${projectId}/locations?days=${days}`
        : `/analytics/locations/${userId}?days=${days}`;

      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch location analytics';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        console.error('❌ Location analytics API error:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage
        });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Location analytics response:', result);
      
      // Handle both {status: 'success', data: {...}} and {data: {...}} formats
      const locationData = result.data || result;
      console.log('📍 Location data:', locationData);
      
      setLocationData(locationData);
      setError(null);
    } catch (err) {
      console.error('❌ Location analytics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-slate-700/50">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-300 text-sm sm:text-base">Loading location data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-red-500/30">
        <p className="text-red-400 text-xs sm:text-sm">Failed to load location analytics: {error}</p>
      </div>
    );
  }

  console.log('🔍 LocationAnalytics render check:', {
    hasLocationData: !!locationData,
    totalScansWithLocation: locationData?.totalScansWithLocation,
    locations: locationData?.locations?.length,
    cityCountryStats: locationData?.cityCountryStats?.length
  });

  if (!locationData || !locationData.totalScansWithLocation || locationData.totalScansWithLocation === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-slate-700/50">
        <div className="text-center py-4 sm:py-8">
          <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-slate-500 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-2">No Location Data Yet</h3>
          <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4 max-w-md mx-auto">
            Geographic analytics will appear here once users scan your QR codes and grant location permission.
          </p>
          
          <div className="bg-blue-500/10 rounded-lg p-3 sm:p-4 border border-blue-500/30 max-w-md mx-auto text-left">
            <h4 className="text-blue-400 font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2">📍 How Location Tracking Works:</h4>
            <ul className="text-blue-300 text-xs space-y-1">
              <li>• When someone scans your QR code, they may be prompted to share their location</li>
              <li>• Location data is completely optional and privacy-friendly</li>
              <li>• Users can deny location access, which is normal and expected</li>
              <li>• Once granted, you'll see city and country data here</li>
            </ul>
          </div>
          
          <div className="mt-4 sm:mt-6 text-slate-500 text-xs">
            <p>💡 Tip: Share your QR code and scan it yourself to test location tracking</p>
          </div>
        </div>
      </div>
    );
  }

  const { totalScansWithLocation, cityCountryStats, locations } = locationData;

  // Get top locations (fewer on mobile for space)
  const topLocations = cityCountryStats?.slice(0, 5) || [];

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Header Stats */}
      <div className="bg-gradient-to-br from-primary-600/20 to-purple-600/20 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-primary-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Scans with Location</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">{totalScansWithLocation}</h3>
          </div>
          <div className="bg-primary-500/20 p-2.5 sm:p-4 rounded-full">
            <Globe className="w-5 h-5 sm:w-8 sm:h-8 text-primary-400" />
          </div>
        </div>
      </div>

      {/* Top Locations List */}
      <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-slate-700/50">
        <h4 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4 flex items-center">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-primary-400" />
          Top Locations
        </h4>
        
        {topLocations.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {topLocations.map((location, index) => {
              const percentage = ((location.count / totalScansWithLocation) * 100).toFixed(1);
              
              // Build location display with village hierarchy
              const locationParts = [];
              if (location.village) locationParts.push(location.village);
              locationParts.push(location.city || 'Anonymous');
              locationParts.push(location.country || 'Anonymous');
              const locationDisplay = locationParts.join(', ');
              
              return (
                <div key={index} className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-200 font-medium block truncate text-sm sm:text-base">
                          {locationDisplay}
                        </span>
                        {location.state && (
                          <span className="text-slate-500 text-xs hidden sm:block">{location.state}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-white font-semibold text-sm sm:text-base">{location.count}</span>
                      <span className="text-slate-500 text-xs sm:text-sm ml-1 sm:ml-2">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 sm:h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-purple-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-xs sm:text-sm text-center py-3 sm:py-4">
            No location data available
          </p>
        )}
      </div>

      {/* All Locations Table (Optional - shows if there are many locations) - Hidden on mobile to save space */}
      {locations && locations.length > 5 && (
        <div className="hidden sm:block bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
          <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">All Scan Locations</h4>
          <div className="max-h-48 sm:max-h-64 overflow-y-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="sticky top-0 bg-slate-800">
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-1.5 sm:pb-2">Location</th>
                  <th className="pb-1.5 sm:pb-2 text-right">Scans</th>
                  <th className="pb-1.5 sm:pb-2 text-right">Last Scan</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {locations.map((location, index) => {
                  // Build location display with village hierarchy
                  const locationParts = [];
                  if (location.village) locationParts.push(location.village);
                  locationParts.push(location.city || 'Anonymous');
                  locationParts.push(location.country || 'Anonymous');
                  const locationDisplay = locationParts.join(', ');
                  
                  return (
                    <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-1.5 sm:py-2">
                        <div>
                          <div className="font-medium text-xs sm:text-sm">{locationDisplay}</div>
                          <div className="text-xs text-slate-500">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            {location.state && ` • ${location.state}`}
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm">{location.count}</td>
                      <td className="py-1.5 sm:py-2 text-right text-xs">
                        {new Date(location.lastScanAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box - More compact on mobile */}
      <div className="bg-blue-500/10 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-blue-500/30">
        <p className="text-blue-400 text-xs sm:text-sm">
          <strong className="hidden sm:inline">ℹ️ Note: </strong>
          <span className="sm:hidden">ℹ️ </span>
          Location data is only collected when users grant permission. 
          Some users may deny location access, which is normal and expected.
        </p>
      </div>
    </div>
  );
};

export default LocationAnalytics;

