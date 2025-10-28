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
        throw new Error('Failed to fetch location analytics');
      }

      const result = await response.json();
      setLocationData(result.data);
      setError(null);
    } catch (err) {
      console.error('Location analytics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-300">Loading location data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/30">
        <p className="text-red-400 text-sm">Failed to load location analytics: {error}</p>
      </div>
    );
  }

  if (!locationData || locationData.totalScansWithLocation === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 text-sm">No location data available yet</p>
          <p className="text-slate-500 text-xs mt-1">
            Location data will appear when users grant location permission
          </p>
        </div>
      </div>
    );
  }

  const { totalScansWithLocation, cityCountryStats, locations } = locationData;

  // Get top 5 locations
  const topLocations = cityCountryStats?.slice(0, 5) || [];

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="bg-gradient-to-br from-primary-600/20 to-purple-600/20 rounded-xl p-6 border border-primary-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">Scans with Location</p>
            <h3 className="text-3xl font-bold text-white">{totalScansWithLocation}</h3>
          </div>
          <div className="bg-primary-500/20 p-4 rounded-full">
            <Globe className="w-8 h-8 text-primary-400" />
          </div>
        </div>
      </div>

      {/* Top Locations List */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-400" />
          Top Locations
        </h4>
        
        {topLocations.length > 0 ? (
          <div className="space-y-3">
            {topLocations.map((location, index) => {
              const percentage = ((location.count / totalScansWithLocation) * 100).toFixed(1);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      <span className="text-slate-200 font-medium">
                        {location.city}, {location.country}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">{location.count}</span>
                      <span className="text-slate-500 text-sm ml-2">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-4">
            No location data available
          </p>
        )}
      </div>

      {/* All Locations Table (Optional - shows if there are many locations) */}
      {locations && locations.length > 5 && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h4 className="text-lg font-semibold text-white mb-4">All Scan Locations</h4>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800">
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-2">Location</th>
                  <th className="pb-2 text-right">Scans</th>
                  <th className="pb-2 text-right">Last Scan</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {locations.map((location, index) => (
                  <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{location.city}, {location.country}</div>
                        <div className="text-xs text-slate-500">
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-right font-semibold">{location.count}</td>
                    <td className="py-2 text-right text-xs">
                      {new Date(location.lastScanAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
        <p className="text-blue-400 text-sm">
          <strong>ℹ️ Note:</strong> Location data is only collected when users grant permission. 
          Some users may deny location access, which is normal and expected.
        </p>
      </div>
    </div>
  );
};

export default LocationAnalytics;

