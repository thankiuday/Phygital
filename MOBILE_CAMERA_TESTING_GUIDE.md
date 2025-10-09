# Mobile Camera Testing Guide

## Quick Test Steps

### On Mobile Device (Smartphone/Tablet)

1. **Navigate to AR Experience**
   - Open your mobile browser (Chrome, Safari, etc.)
   - Go to the AR Experience page for a project
   - URL format: `/ar/{userId}/{projectId}` or `/ar/{projectId}`

2. **Grant Camera Permission**
   - When prompted, tap "Allow" to grant camera access
   - If you previously denied, go to browser settings to enable camera

3. **Verify Back Camera Opens**
   - ✅ **Expected**: You should see what's in front of the phone (back camera view)
   - ❌ **NOT Expected**: Black screen or your face (front camera)

4. **Check Camera View**
   - Point phone at different objects to verify camera is working
   - Camera feed should be clear and real-time
   - No lag or freezing

5. **Open Debug Panel (Optional)**
   - Tap the Settings icon (⚙️) in top-right corner
   - Look for these messages:
     ```
     📱 Device type: Mobile
     📷 Camera settings: ...x..., facing: environment
     ✅ Camera permission granted
     ```

### On Desktop/Laptop

1. **Navigate to AR Experience**
   - Open browser (Chrome, Firefox, Edge)
   - Go to the AR Experience page

2. **Grant Camera Permission**
   - When prompted, click "Allow"

3. **Verify Front Camera Opens**
   - ✅ **Expected**: You should see your reflection (front camera/webcam)
   - Camera feed should be clear

4. **Check Debug Panel (Optional)**
   - Click Settings icon (⚙️)
   - Look for:
     ```
     📱 Device type: Desktop
     📷 Camera settings: ...x..., facing: user
     ```

## Troubleshooting

### Black Screen on Mobile

#### Possible Causes & Solutions:

1. **Camera Permission Denied**
   - Go to browser settings
   - Find site permissions
   - Enable camera access
   - Refresh page

2. **Browser Not Supported**
   - Try Chrome or Safari (most compatible)
   - Update browser to latest version

3. **HTTPS Required**
   - Camera only works on HTTPS (secure) sites
   - Check URL starts with `https://`

4. **Camera In Use**
   - Close other apps using camera
   - Restart browser

5. **Hardware Issue**
   - Test camera in native camera app
   - If camera doesn't work there, it's a device issue

### Camera Shows Front Instead of Back

1. **Check Debug Panel**
   - Look for "Device type: Mobile"
   - If it shows "Desktop", the device detection failed

2. **Try Forcing Mobile View**
   - Some tablets may be detected as desktop
   - This is expected behavior for large tablets

3. **Browser Override**
   - Some browsers may override camera selection
   - Check browser camera settings

### "OverconstrainedError"

This error means your device doesn't support the exact camera constraints requested.

**The app now handles this automatically:**
- First tries to use exact back camera (environment)
- If that fails, retries with relaxed constraints
- Should work on most devices

**If it still fails:**
- Your device may not have a back camera
- Camera may be disabled in device settings

## Browser Compatibility

### Mobile
✅ **Recommended:**
- Chrome for Android (latest)
- Safari for iOS (iOS 11+)

⚠️ **Limited Support:**
- Firefox Mobile (may have camera issues)
- Samsung Internet (test required)

❌ **Not Supported:**
- Opera Mini (WebRTC not supported)
- UC Browser (limited WebRTC)

### Desktop
✅ **Supported:**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (macOS)

## Debug Panel Information

### Key Messages to Look For

#### Successful Mobile Setup:
```
🔍 Checking AR libraries...
✅ AR libraries loaded successfully
📱 Device type: Mobile
📷 Requesting camera permission...
🎥 Camera constraints: {"facingMode":{"exact":"environment"},...}
✅ Camera permission granted
📹 Camera stream: 1 video track(s)
📷 Camera settings: 1280x720, facing: environment
✅ Test stream stopped, MindAR will now initialize camera
🔧 MindAR facing mode: environment (mobile: true)
✅ MindAR started successfully
```

#### Successful Desktop Setup:
```
🔍 Checking AR libraries...
✅ AR libraries loaded successfully
📱 Device type: Desktop
📷 Requesting camera permission...
🎥 Camera constraints: {"facingMode":"user",...}
✅ Camera permission granted
📹 Camera stream: 1 video track(s)
📷 Camera settings: 640x480, facing: user
✅ Test stream stopped, MindAR will now initialize camera
🔧 MindAR facing mode: user (mobile: false)
✅ MindAR started successfully
```

#### Error Example:
```
❌ Camera permission denied: NotAllowedError: Permission denied
```
**Solution**: Grant camera permission in browser settings

## Testing Checklist

### Before Deployment
- [ ] Test on Android phone (Chrome)
- [ ] Test on iPhone (Safari)
- [ ] Test on Android tablet
- [ ] Test on iPad
- [ ] Test on laptop/desktop
- [ ] Verify back camera on all mobile devices
- [ ] Verify front camera on all desktop devices
- [ ] Check debug messages for each device
- [ ] Test with camera permission denied
- [ ] Test with camera permission granted

### After Deployment
- [ ] Test production URL on mobile
- [ ] Verify HTTPS is working
- [ ] Check camera opens on first visit
- [ ] Verify no console errors
- [ ] Test AR tracking works with back camera

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Black screen | Check camera permissions, refresh page |
| Wrong camera (front vs back) | Check device type in debug panel |
| Camera not starting | Verify HTTPS, check browser compatibility |
| Slow camera startup | Normal on first load, wait 2-3 seconds |
| Camera freezes | Restart browser, clear cache |
| Permission popup doesn't appear | Check browser settings, camera may be blocked |

## Performance Tips

### Mobile
- Close background apps using camera
- Ensure good lighting for better tracking
- Use latest browser version
- Clear browser cache if issues persist

### Desktop
- Close other video apps (Zoom, Teams, etc.)
- Use good lighting for webcam
- Test with built-in webcam first

## Need Help?

If issues persist:
1. Open Debug Panel (Settings icon)
2. Screenshot the debug messages
3. Note device type, browser, and OS version
4. Check console for JavaScript errors (F12 Developer Tools)

## Notes

- Camera access requires HTTPS in production
- Some corporate networks may block camera access
- iOS Safari requires `playsinline` attribute (now included)
- Android Chrome requires `muted` for autoplay (now included)
- First camera access may take 2-3 seconds

