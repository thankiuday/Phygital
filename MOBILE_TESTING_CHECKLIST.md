# Mobile Camera Testing Checklist

## ✅ Pre-Test Setup
- [ ] Deploy latest build to production/testing server
- [ ] Ensure HTTPS is enabled (required for camera access)
- [ ] Have mobile device ready (smartphone/tablet)
- [ ] Have AR target image ready (composite design with QR code)

## 📱 Test on Mobile Device

### Step 1: Open AR Experience
- [ ] Open browser on mobile device (Chrome or Safari recommended)
- [ ] Navigate to AR Experience page
- [ ] URL: `https://your-domain/ar/{userId}/{projectId}`

### Step 2: Camera Permission
- [ ] Browser prompts for camera permission
- [ ] Grant camera permission
- [ ] **Look for green dot** on phone (indicates camera is active)

### Step 3: Check Screen
- [ ] **✅ PASS**: Camera feed is visible
- [ ] **❌ FAIL**: Black screen

### Step 4: Open Debug Panel
- [ ] Tap Settings icon (⚙️) in top-right corner
- [ ] Debug panel opens

### Step 5: Check Debug Panel Status

#### System Status Section
- [ ] **Libraries**: Should show **"Loaded"** (green dot ✅)
- [ ] **Camera**: Should show **"Active"** (green dot ✅)
- [ ] **AR**: Should show **"Ready"** (green dot ✅)
- [ ] **Target**: Shows "Searching" (orange dot - this is normal)

#### Video Status Section
- [ ] **Video**: Should show **"Loaded"** (green dot ✅)
- [ ] **Playing**: Shows "No" (this is for AR video, not camera - OK)
- [ ] **Audio**: Shows "Muted" (normal)

### Step 6: Check Debug Messages

Look for these key messages in "Recent Messages":

#### ✅ Success Messages
- [ ] `✅ MindAR started successfully`
- [ ] `✅ Camera marked as active`
- [ ] `📱 Mobile device detected - verifying video visibility...`
- [ ] `🔍 Found 1 video element(s) in container` (or more)
- [ ] `📹 Video 0: 1280x720, paused=false, srcObject=true` (dimensions may vary)
- [ ] `✅ Video element found - ensuring visibility...`
- [ ] `✅ Video is already playing` OR `✅ Video play succeeded`

#### ⚠️ Warning Messages (Fallback Activated)
- [ ] `⚠️ No video element found on mobile - creating manual stream...`
- [ ] `✅ Manual video stream created and playing`

#### ❌ Error Messages (Investigation Needed)
- [ ] `❌ Video play failed: ...`
- [ ] `⚠️ Video element has no srcObject`
- [ ] `❌ Failed to create manual video stream: ...`

### Step 7: Camera Feed Verification
- [ ] Move phone around - camera feed updates in real-time
- [ ] Point at different objects - camera follows
- [ ] Camera shows what's **behind** phone (back camera)
- [ ] Image is clear and not frozen

### Step 8: AR Tracking Test (Optional)
- [ ] Point camera at AR target image
- [ ] Wait for target detection
- [ ] Check if AR content appears
- [ ] Debug panel shows "Target: Detected"

## 📊 Test Results

### ✅ PASS Criteria
All of these must be true:
- ✅ Camera feed visible (no black screen)
- ✅ Debug panel shows "Camera: Active"
- ✅ Debug panel shows "AR: Ready"
- ✅ Back camera used on mobile
- ✅ Debug messages show video element found
- ✅ Real-time camera feed

### ⚠️ PARTIAL PASS (Fallback Used)
- ✅ Camera feed visible
- ✅ Debug panel shows "Camera: Active"
- ⚠️ Debug message: "No video element found - creating manual stream"
- ⚠️ AR tracking might not work properly
- ℹ️ **Note**: This means MindAR didn't create video, but fallback worked

### ❌ FAIL Criteria
Any of these:
- ❌ Black screen (no camera feed)
- ❌ Debug panel shows "Camera: Inactive"
- ❌ Debug panel shows "AR: Not Ready"
- ❌ Error messages in debug panel
- ❌ Camera feed frozen

## 🐛 If Test Fails

### Black Screen Checklist
1. **Check camera permission**
   - Go to browser settings
   - Verify camera permission is granted
   - Try revoking and re-granting permission

2. **Check debug messages**
   - Look for error messages
   - Note the last successful message
   - Screenshot debug panel

3. **Check browser console**
   - Open DevTools if possible (Chrome Remote Debugging)
   - Look for JavaScript errors
   - Check for WebRTC errors

4. **Try different browser**
   - Test in Chrome (if using Safari)
   - Test in Safari (if using Chrome)
   - Try incognito/private mode

5. **Check device compatibility**
   - Ensure device has back camera
   - Try on different mobile device
   - Check if camera works in native camera app

## 📸 Screenshots to Capture

If test fails, capture:
1. **Screen showing black screen**
2. **Debug panel - System Status section**
3. **Debug panel - Video Status section**
4. **Debug panel - Recent Messages (full list)**
5. **Browser console (if accessible)**

## 🔄 Repeat Tests

Test on multiple devices:
- [ ] Android phone (Chrome)
- [ ] Android phone (other browser)
- [ ] iPhone (Safari)
- [ ] iPad (Safari)
- [ ] Android tablet

## 📝 Report Template

```
Device: [e.g., Samsung Galaxy S21, iPhone 12, etc.]
OS: [e.g., Android 12, iOS 15, etc.]
Browser: [e.g., Chrome 120, Safari 15, etc.]

Test Result: [PASS / PARTIAL PASS / FAIL]

Camera Feed: [Visible / Black Screen]
Debug Panel - Camera: [Active / Inactive]
Debug Panel - AR: [Ready / Not Ready]

Debug Messages (copy last 10):
[paste debug messages here]

Additional Notes:
[any other observations]

Screenshots: [attached / not attached]
```

## 🎯 Quick Diagnosis

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| Black screen + Camera Inactive | Permission denied or not requested | Check browser permissions |
| Black screen + Camera Active | Video element not created/visible | Check debug messages for video info |
| Camera feed visible but wrong camera | Device detection issue | Report (should not happen with fix) |
| Camera feed visible but frozen | Stream not playing | Check debug message for "paused=true" |
| Camera feed visible briefly then black | Stream stopped or lost | Check for error messages |

## ✅ Success Indicators

When everything works correctly:
```
📱 Device type: Mobile
📷 Requesting camera permission...
🎥 Camera constraints: {...}
✅ Camera permission granted
📹 Camera stream: 1 video track(s)
📷 Camera settings: 1280x720, facing: environment
✅ Test stream stopped, MindAR will now initialize camera
🔧 MindAR facing mode: environment (mobile: true)
✅ MindAR started successfully
✅ Camera marked as active
📱 Mobile device detected - verifying video visibility...
🔍 Found 1 video element(s) in container
📹 Video 0: 1280x720, paused=false, srcObject=true
✅ Video element found - ensuring visibility...
📹 Video current state: width=1280, height=720, paused=false, srcObject=true
✅ Video is already playing
📹 Video final state: 1280x720, paused: false, readyState: 4
```

---

## 💡 Tips

1. **Always check debug panel first** - it has all the info you need
2. **Green dot on phone** = camera is being accessed (good sign)
3. **Debug messages** tell you exactly what's happening
4. **Take screenshots** if something goes wrong
5. **Test in good lighting** for better AR tracking

---

**Ready to test!** 🚀

