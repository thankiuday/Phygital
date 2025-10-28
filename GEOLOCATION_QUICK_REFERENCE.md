# 🌍 Geolocation Tracking - Quick Reference Card

## 📍 Feature Status: ✅ LIVE & WORKING

---

## 🎯 What It Does

**Automatically captures latitude & longitude when users scan QR codes!**

- ✅ Tracks GPS coordinates (latitude, longitude)
- ✅ Converts to city/country names
- ✅ Stores in database with each scan
- ✅ Non-blocking, privacy-respecting
- ✅ Works globally

---

## 🚀 Quick Start (3 Steps)

### 1. Test It (Right Now!)

```bash
# Scan any QR code on your phone
# Browser will ask: "Allow location?"
# Click "Allow"
# Location is now being tracked! ✅
```

### 2. View Data (MongoDB)

```javascript
// Check if location data is being saved
db.analytics.findOne({ 
  eventType: 'scan',
  'eventData.scanLocation': { $exists: true }
})

// Expected result:
{
  eventType: "scan",
  eventData: {
    scanLocation: {
      latitude: 40.7128,
      longitude: -74.0060,
      city: "New York",
      country: "United States"
    }
  }
}
```

### 3. Add to Dashboard (Optional)

```jsx
import LocationAnalytics from '../components/Analytics/LocationAnalytics';

function YourDashboard() {
  return (
    <div>
      <LocationAnalytics userId={userId} days={30} />
    </div>
  );
}
```

---

## 📡 API Endpoints

### Get All Locations
```bash
GET /api/analytics/locations/:userId?days=30
Authorization: Bearer YOUR_TOKEN
```

### Get Project Locations
```bash
GET /api/analytics/project/:userId/:projectId/locations?days=7
Authorization: Bearer YOUR_TOKEN
```

---

## 💻 Code Examples

### Frontend: Get Location Data

```javascript
const fetchLocations = async (userId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${API_URL}/api/analytics/locations/${userId}?days=30`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();
  console.log('Locations:', data.data.cityCountryStats);
};
```

### Backend: Query Location Data

```javascript
// Find all scans with location
const scans = await Analytics.find({
  eventType: 'scan',
  'eventData.scanLocation': { $exists: true, $ne: null }
});

// Count by country
const stats = await Analytics.aggregate([
  { $match: { eventType: 'scan' } },
  { $group: {
    _id: '$eventData.scanLocation.country',
    count: { $sum: 1 }
  }}
]);
```

---

## 🔍 Debugging

### Check Browser Console

Look for these messages when scanning:

```
✅ Good:
📍 Attempting to capture user location for scan...
✅ Location captured: {latitude: 40.7128, longitude: -74.0060}
🌍 Location: New York, United States

⚠️ Normal (user denied):
📍 Attempting to capture user location for scan...
ℹ️ Location not available: User denied Geolocation
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No location data | User denied permission | Normal behavior - app still works |
| "HTTPS required" | Testing on HTTP | Use HTTPS or localhost |
| Geocoding fails | Rate limit | Coordinates still saved |
| Permission not asked | Already denied before | Reset browser permissions |

---

## 📊 What Gets Saved

```json
{
  "userId": "123",
  "projectId": "project-abc",
  "eventType": "scan",
  "eventData": {
    "scanLocation": {
      "latitude": 40.7128,      // GPS coordinate
      "longitude": -74.0060,    // GPS coordinate  
      "city": "New York",       // From geocoding
      "country": "United States" // From geocoding
    },
    "userAgent": "...",
    "ipAddress": "..."
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🎨 UI Component Props

```jsx
<LocationAnalytics
  userId={string}        // Required: User ID
  projectId={string}     // Optional: Specific project
  days={number}          // Optional: Time range (default: 30)
/>
```

---

## 🔧 Configuration

### Change Geocoding Service

Edit: `frontend/src/utils/geolocation.js`

```javascript
// Switch to Google Maps (requires API key)
export const reverseGeocode = async (lat, lng) => {
  const API_KEY = 'YOUR_KEY';
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
  // ... parse response
};
```

### Disable Location Tracking

Edit: `frontend/src/hooks/useAnalytics.js`

```javascript
// Line 37-71: Comment out location capture code
if (event === 'scan') {
  requestBody = {
    userId: userId || projectId,
    projectId,
    scanData: {
      // location: locationData, // <-- Comment this out
      userAgent: navigator.userAgent,
      ...data
    }
  };
}
```

---

## 📈 Use Cases

✅ **Track event attendance** - See where scans happened  
✅ **Marketing analytics** - Measure campaign geographic reach  
✅ **Business intelligence** - Understand customer distribution  
✅ **Fraud detection** - Detect unusual scanning patterns  
✅ **Market research** - Identify new markets  

---

## 📚 Full Documentation

- **[GEOLOCATION_FEATURE_SUMMARY.md](./GEOLOCATION_FEATURE_SUMMARY.md)** - Visual overview
- **[GEOLOCATION_IMPLEMENTATION.md](./GEOLOCATION_IMPLEMENTATION.md)** - Implementation guide
- **[GEOLOCATION_TRACKING_GUIDE.md](./GEOLOCATION_TRACKING_GUIDE.md)** - Complete technical docs

---

## ✅ Files Modified/Created

**New:**
- `frontend/src/utils/geolocation.js`
- `frontend/src/components/Analytics/LocationAnalytics.jsx`

**Updated:**
- `frontend/src/hooks/useAnalytics.js`
- `backend/routes/analytics.js`

**Docs:**
- `GEOLOCATION_TRACKING_GUIDE.md`
- `GEOLOCATION_IMPLEMENTATION.md`
- `GEOLOCATION_FEATURE_SUMMARY.md`
- `GEOLOCATION_QUICK_REFERENCE.md` (this file)

---

## 🎉 Status

✅ **READY TO USE!** No additional setup needed.

**Test it now:** Scan a QR code on your phone! 📱

---

**Questions?** Check the full docs or just test it - it's already working! 🚀

