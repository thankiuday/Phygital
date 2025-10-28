# Geolocation Tracking Guide

## Overview

The AR experience now automatically tracks the **latitude and longitude** of users who scan QR codes. This provides valuable insights into where your AR content is being accessed geographically.

## How It Works

### 1. **Automatic Location Capture**

When a user scans your QR code and accesses the AR experience page:

1. The browser requests location permission from the user (if not already granted)
2. If permission is granted, the system captures:
   - **Latitude** and **Longitude** (precise coordinates)
   - **City** and **Country** (using reverse geocoding)
3. This location data is automatically sent with the scan analytics
4. If permission is denied, analytics still work - just without location data

### 2. **Privacy & Permissions**

- **User Consent**: The browser always asks for user permission before sharing location
- **Graceful Degradation**: If users deny permission, the app continues to work normally
- **No Blocking**: Location capture doesn't block or delay the AR experience
- **Privacy**: Location data is only used for analytics and is stored securely

### 3. **Data Storage**

Location data is stored in the Analytics model:

```javascript
{
  eventType: 'scan',
  eventData: {
    scanLocation: {
      latitude: 40.7128,      // Precise coordinates
      longitude: -74.0060,
      city: 'New York',       // From reverse geocoding
      country: 'United States'
    }
  },
  timestamp: '2024-01-15T10:30:00Z',
  projectId: 'project-123',
  userId: 'user-456'
}
```

## Viewing Location Analytics

### API Endpoints

#### 1. **Get All Location Analytics** (for all your projects)
```bash
GET /api/analytics/locations/:userId?days=30&projectId=optional
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalScansWithLocation": 45,
    "locations": [
      {
        "latitude": 40.71,
        "longitude": -74.01,
        "city": "New York",
        "country": "United States",
        "count": 12,
        "lastScanAt": "2024-01-15T10:30:00Z"
      }
    ],
    "cityCountryStats": [
      {
        "city": "New York",
        "country": "United States",
        "count": 12
      },
      {
        "city": "Los Angeles",
        "country": "United States",
        "count": 8
      }
    ]
  }
}
```

#### 2. **Get Project-Specific Location Analytics**
```bash
GET /api/analytics/project/:userId/:projectId/locations?days=30
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "projectId": "project-123",
    "totalScansWithLocation": 25,
    "locations": [
      {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "city": "New York",
        "country": "United States",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Using in Frontend

```javascript
import { authAPI } from './utils/api';

// Get location analytics
const getLocationAnalytics = async (userId, projectId = null) => {
  const token = localStorage.getItem('token');
  const url = projectId 
    ? `/api/analytics/project/${userId}/${projectId}/locations?days=30`
    : `/api/analytics/locations/${userId}?days=30`;
  
  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

## Use Cases

### 1. **Geographic Distribution**
- See which cities/countries have the most engagement
- Identify new markets for your AR content
- Plan location-specific campaigns

### 2. **Event Tracking**
- Track QR code scans at physical events
- Verify campaign reach in specific locations
- Measure geographic effectiveness

### 3. **Business Intelligence**
- Understand where your audience is located
- Make data-driven decisions about expansion
- Identify unexpected markets

## Technical Details

### Browser Compatibility

Geolocation API is supported by:
- ✅ Chrome/Edge (desktop & mobile)
- ✅ Safari (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ✅ Opera (desktop & mobile)

### Accuracy

- **GPS-enabled devices** (phones, tablets): ±10-50 meters
- **WiFi-based location** (laptops): ±100-500 meters
- **IP-based location** (fallback): ±1-5 kilometers

### Reverse Geocoding

- Uses **OpenStreetMap Nominatim API** (free)
- Rate limit: ~1 request per second
- Fallback: If geocoding fails, coordinates are still saved
- Alternative: You can replace with Google Maps Geocoding API for production

## Configuration

### Changing Geocoding Service

Edit `frontend/src/utils/geolocation.js`:

```javascript
// Using Google Maps Geocoding API (requires API key)
export const reverseGeocode = async (latitude, longitude) => {
  const API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`
  );
  
  const data = await response.json();
  const result = data.results[0];
  
  return {
    city: result.address_components.find(c => c.types.includes('locality'))?.long_name || 'Unknown',
    country: result.address_components.find(c => c.types.includes('country'))?.long_name || 'Unknown'
  };
};
```

### Disabling Location Tracking

To disable location tracking, edit `frontend/src/hooks/useAnalytics.js`:

```javascript
// Change this section to skip location capture
if (event === 'scan') {
  requestBody = {
    userId: userId || projectId,
    projectId,
    scanData: {
      // location: locationData, // Comment out this line
      userAgent: navigator.userAgent,
      ...data
    }
  };
}
```

## Testing

### Test Location Tracking

1. **Open AR Experience** in your browser
2. **Allow location** when prompted
3. **Scan the QR code**
4. **Check browser console** for location messages:
   ```
   📍 Attempting to capture user location for scan...
   ✅ Location captured: {latitude: 40.7128, longitude: -74.0060}
   🌍 Location with address: {city: "New York", country: "United States"}
   ```
5. **Check database** for saved location data

### Simulate Different Locations (Chrome DevTools)

1. Open **Chrome DevTools** (F12)
2. Press **Ctrl+Shift+P** (Cmd+Shift+P on Mac)
3. Type "**sensors**"
4. Select "**Show Sensors**"
5. Under "**Geolocation**", choose a preset or enter custom coordinates

## Troubleshooting

### Location Not Being Captured

**Issue**: No location data in analytics

**Solutions**:
1. **Check browser permissions**: Make sure location is allowed
2. **Check HTTPS**: Geolocation requires HTTPS (or localhost)
3. **Check console**: Look for geolocation errors
4. **Try different browser**: Some browsers have stricter policies

### Reverse Geocoding Fails

**Issue**: Coordinates saved but no city/country

**Solutions**:
1. **Check rate limits**: Nominatim has rate limits
2. **Check network**: Verify API is accessible
3. **Use alternative service**: Switch to Google Maps Geocoding
4. **Accept coordinates only**: City/country is optional

### Permission Denied

**Issue**: Users deny location permission

**This is normal behavior**:
- Analytics will work without location
- User privacy is respected
- App continues to function normally
- Coordinates will be `null` in database

## Database Queries

### Find All Scans with Location
```javascript
db.analytics.find({
  eventType: 'scan',
  'eventData.scanLocation': { $exists: true, $ne: null }
})
```

### Get Scans from Specific City
```javascript
db.analytics.find({
  eventType: 'scan',
  'eventData.scanLocation.city': 'New York'
})
```

### Count Scans by Country
```javascript
db.analytics.aggregate([
  { $match: { eventType: 'scan' } },
  { $group: {
    _id: '$eventData.scanLocation.country',
    count: { $sum: 1 }
  }},
  { $sort: { count: -1 } }
])
```

## Future Enhancements

Potential improvements for location tracking:

1. **Map Visualization**: Display scan locations on an interactive map
2. **Heatmaps**: Show density of scans in different regions
3. **Location-Based Content**: Serve different AR content based on user location
4. **Geofencing**: Set up alerts when scans occur in specific areas
5. **Export Data**: Download location data as CSV/Excel for analysis

## Security & Privacy

- ✅ Location data requires explicit user permission
- ✅ Data is transmitted over HTTPS
- ✅ Location data is only used for analytics
- ✅ Users can deny permission without breaking the app
- ✅ Comply with GDPR/privacy regulations by informing users

## Summary

✨ **Geolocation tracking is now enabled automatically** when users scan QR codes! This provides valuable insights into where your AR content is being accessed, helping you make data-driven decisions about your content strategy.

The feature is:
- 🔒 Privacy-respecting (requires user permission)
- 🚀 Non-blocking (doesn't delay AR experience)
- 📊 Actionable (provides city/country insights)
- 🌍 Global (works worldwide)
- 🔧 Configurable (easy to customize or disable)

For questions or custom implementations, check the code in:
- `frontend/src/utils/geolocation.js` - Geolocation utilities
- `frontend/src/hooks/useAnalytics.js` - Analytics tracking with location
- `backend/routes/analytics.js` - Location analytics endpoints
- `backend/models/Analytics.js` - Data model

