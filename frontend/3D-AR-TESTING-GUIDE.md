# 3D AR Popup Video - Testing & Configuration Guide

## Overview
This guide helps you test and fine-tune the 3D popup animation for the vertical video standee AR experience.

## Accessing the 3D AR Experience

### URL Patterns
The 3D AR experience is available at:
- **New format**: `/ar-3d/user/{userId}/project/{projectId}`
- **Short format**: `/ar-3d/{userId}/{projectId}`

### Example URLs
```
http://localhost:5173/ar-3d/user/12345/project/67890
http://localhost:5173/ar-3d/12345/67890
```

## Testing Steps

### 1. Prerequisites
- ✅ Project with `.mind` file generated (Step 2: Save QR Position completed)
- ✅ Video uploaded
- ✅ Camera permission granted
- ✅ Printed target image (composite design with QR code)

### 2. Basic Functionality Test
1. Navigate to the 3D AR URL
2. Allow camera permissions
3. Point camera at the printed target image
4. **Expected Behavior**:
   - Scanner animation appears on composite image guide
   - Once target detected, 3D pop-out animation triggers
   - Video scales from tiny → full size (with bounce)
   - Video **pops OUT toward the camera** (Z-axis movement - 0.8 units forward)
   - Video lifts up slightly from marker surface (Y-axis - 0.1 → 0.3 units)
   - Video rotates from flat (lying on marker at -90°) → angled toward viewer (at -60°)
   - Video fades from transparent → opaque
   - Video starts playing after animation completes
   - **Creates illusion of video emerging from the marker toward you!**

### 3. Animation Quality Checklist
- [ ] Scale animation has smooth bounce effect (not too bouncy)
- [ ] Pop-out motion (Z-axis) is smooth and dramatic
- [ ] Lift motion (Y-axis) is subtle and enhances depth
- [ ] Rotation animation is smooth and doesn't jitter (flat → angled)
- [ ] Fade-in is smooth and not abrupt
- [ ] All four animations are synchronized (scale + Z + Y + rotate + fade)
- [ ] Animation completes before video starts playing
- [ ] No flickering or frame drops during animation
- [ ] Video maintains angled-toward-viewer orientation after animation
- [ ] **Creates convincing illusion of emerging toward camera**

### 4. Interaction Tests
- [ ] Video mute/unmute works correctly
- [ ] When target is lost, video pauses and mesh disappears
- [ ] When target is re-detected, animation replays smoothly
- [ ] Social links and contact buttons work
- [ ] Back button navigates correctly
- [ ] Debug panel shows correct information

### 5. Performance Tests
- [ ] Animation runs at 60fps on desktop
- [ ] Animation runs smoothly on mobile devices
- [ ] No memory leaks during extended use
- [ ] Camera feed remains stable
- [ ] Video playback is smooth after animation

## Adjustable Parameters

### Location: `frontend/src/hooks/useARLogic3D.js`

#### 1. Animation Duration
```javascript
// Line ~67
const animationDuration = 1200; // milliseconds
```
**Adjustment Guide**:
- **Faster** (800-1000ms): More energetic, snappier feel
- **Default** (1200ms): Balanced, professional
- **Slower** (1500-2000ms): More dramatic, elegant

#### 2. Pop-Out Distance (Z-axis)
```javascript
// Line ~69
const popOutDistance = 0.8; // units toward camera
```
**Adjustment Guide**:
- **Closer** (0.5-0.7): Subtle pop-out, stays near marker
- **Default** (0.8): Good depth illusion
- **Dramatic** (1.0-1.5): Bold emergence toward viewer

#### 3. Height Above Marker (Y-axis)
```javascript
// Line ~70
const heightAboveMarker = 0.3; // units above surface
```
**Adjustment Guide**:
- **Lower** (0.1-0.2): Stays close to marker surface
- **Default** (0.3): Slight lift for better visibility
- **Higher** (0.4-0.5): More elevated above marker

#### 4. Viewer Angle (Rotation)
```javascript
// Line ~71
const viewerAngle = -Math.PI / 3; // 60° toward viewer
```
**Adjustment Guide**:
- **Less Tilted** (-Math.PI/4 = 45°): More subtle angle
- **Default** (-Math.PI/3 = 60°): Good viewing angle
- **More Tilted** (-Math.PI/2.5 = 72°): Dramatic tilt toward camera

#### 3. Video Standee Dimensions
```javascript
// Line ~140-141
const standeeWidth = 1.2; // Slightly larger than marker
const standeeHeight = standeeWidth / videoAspect;
```
**Adjustment Guide**:
- **Smaller** (0.8-1.0): More subtle, less imposing
- **Default** (1.2): Good visibility
- **Larger** (1.5-2.0): Bold, attention-grabbing

#### 4. Initial Scale (for animation start)
```javascript
// Line ~159
videoMesh.scale.set(0.01, 0.01, 0.01); // Start tiny
```
**Adjustment Guide**:
- **Smaller** (0.001): More dramatic popup effect
- **Default** (0.01): Visible but small starting point
- **Larger** (0.05-0.1): Less dramatic, quicker to visible size

## Easing Function Adjustments

### Location: `frontend/src/utils/easingFunctions.js`

### Scale Animation (easeOutBack)
Current bounce factor:
```javascript
const c1 = 1.70158; // Controls bounce intensity
```
**Adjustment Guide**:
- **Less bounce** (1.2-1.5): Subtle overshoot
- **Default** (1.70158): Standard bounce
- **More bounce** (2.0-2.5): Exaggerated spring effect

### Alternative: Use easeOutElastic for more bounce
In `useARLogic3D.js`, line ~425, change:
```javascript
const scale = easeOutElastic(progress); // Instead of easeOutBack
```

## Common Issues & Solutions

### Issue: Animation too fast/slow
**Solution**: Adjust `animationDuration` (line ~67 in useARLogic3D.js)

### Issue: Video too close/far from marker
**Solution**: Adjust `floatingHeight` (line ~68 in useARLogic3D.js)

### Issue: Video not visible enough
**Solutions**:
1. Increase `standeeWidth` (line ~140)
2. Increase `floatingHeight` for better viewing angle
3. Check lighting conditions

### Issue: Animation feels choppy
**Solutions**:
1. Check device performance
2. Reduce video resolution
3. Ensure camera feed is stable
4. Close other browser tabs

### Issue: Video plays before animation completes
**Check**: Line ~448 in useARLogic3D.js - video should only start after `progress >= 1`

### Issue: Rotation doesn't look right
**Solution**: Verify rotation calculation at line ~432:
```javascript
const targetRotation = -Math.PI / 2; // 90° vertical
```

## Mobile-Specific Testing

### iOS Testing
- [ ] Safari: Animation smooth
- [ ] Chrome iOS: Animation smooth
- [ ] Camera permission flow works
- [ ] Video autoplay after animation works
- [ ] Touch controls work properly

### Android Testing
- [ ] Chrome Android: Animation smooth
- [ ] Firefox Android: Animation smooth
- [ ] Camera switches to back camera correctly
- [ ] Video playback after animation works

## Performance Metrics

### Target Performance
- **Animation FPS**: 60fps consistently
- **Initial Load**: < 3 seconds
- **Target Detection**: < 500ms
- **Animation Duration**: ~1.2 seconds
- **Video Start Delay**: < 200ms after animation

### Monitoring
Check browser console for:
```
🎯 TARGET DETECTED - Starting 3D animation
🎬 Animation 25% complete
🎬 Animation 50% complete
🎬 Animation 75% complete
✨ 3D entrance animation complete!
✅ Video playing after animation
```

## Recommended Configurations

### For Product Showcases
```javascript
animationDuration = 1500; // Elegant, not rushed
floatingHeight = 0.7;     // Prominent display
standeeWidth = 1.5;       // Large and visible
```

### For Quick Demos
```javascript
animationDuration = 800;  // Fast and snappy
floatingHeight = 0.5;     // Subtle
standeeWidth = 1.0;       // Modest size
```

### For Dramatic Effect
```javascript
animationDuration = 2000; // Slow and dramatic
floatingHeight = 1.0;     // High float
standeeWidth = 2.0;       // Large standee
// Use easeOutElastic for scale animation
```

## Debug Mode

Enable debug panel by adding `?debug=true` to URL or clicking the settings icon.

Debug information shows:
- Libraries loaded status
- Camera active status
- AR ready status
- Target detected status
- Video playing status
- All debug messages

## Next Steps After Testing

1. ✅ Verify all animations are smooth
2. ✅ Adjust parameters based on your preference
3. ✅ Test on multiple devices
4. ✅ Test with different lighting conditions
5. ✅ Test with different video aspect ratios
6. ✅ Share URLs with testers
7. ✅ Collect feedback and iterate

## Support

For issues or questions:
1. Check browser console for errors
2. Enable debug panel for detailed information
3. Verify `.mind` file is properly generated
4. Ensure target image is clearly visible to camera
5. Check camera permissions

## Future Enhancements

Potential improvements to consider:
- [ ] Add different entrance animation styles (slide-up, spiral, etc.)
- [ ] Add exit animation when target is lost
- [ ] Add particle effects during animation
- [ ] Add sound effects synchronized with animation
- [ ] Add multiple video planes for carousel effect
- [ ] Add interactive touch controls on the 3D video

