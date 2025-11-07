/**
 * AR Logic Hook - 3D Popup Version
 * Handles AR with vertical video standee that floats above marker
 * Features: 3D entrance animation (scale + rotate + fade)
 */

import { useRef, useCallback, useEffect } from 'react';
import { 
  validateImageForMindAR, 
  processImageForAR, 
  fetchMindFile, 
  base64ToUint8Array, 
  isValidMindBuffer, 
  throttle,
  isMobileDevice,
  getCameraConstraints,
  getMindARFacingMode
} from '../utils/arUtils';
import { shouldTrackAnalytics, markAnalyticsFailed } from '../utils/analyticsDeduplication';
import { easeOutBack, easeOutCubic, easeInOut } from '../utils/easingFunctions';

export const useARLogic3D = ({
  librariesLoaded,
  projectData,
  userId,
  projectId,
  isInitialized,
  isScanning,
  videoPlaying,
  videoMuted,
  targetDetected,
  setError,
  setCameraActive,
  setArReady,
  setTargetDetected,
  setVideoPlaying,
  setVideoMuted,
  setIsInitialized,
  setIsScanning,
  addDebugMessage,
  resetARState,
  trackAnalytics
}) => {
  // Ensure setVideoMuted is available
  const safeSetVideoMuted = setVideoMuted || (() => {
    console.warn('setVideoMuted not provided');
  });
  
  // Refs
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const mindarRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const anchorRef = useRef(null);
  const videoMeshRef = useRef(null);
  const blobURLRef = useRef(null);
  const savedVideoTimeRef = useRef(0);
  const videoViewTrackedRef = useRef(false);
  const isResuming = useRef(false);
  
  // 3D Animation refs
  const animationStartTimeRef = useRef(null);
  const animationCompleteRef = useRef(false);
  const animationDuration = 1500; // 1.5 seconds for dramatic pop-out effect
  const lastBillboardLogRef = useRef(0); // Track last billboard log time
  
  // Vertical standee configuration - video stands ON TOP of marker facing camera
  const popOutDistance = 0; // No forward pop-out - stays centered on marker
  const heightAboveMarker = 0.6; // Height above marker surface (stands tall vertically)
  const verticalAngle = 0; // Stand up to 0° (perpendicular to marker)
  const facingAngle = 0; // Y-axis rotation to face camera (try: 0, Math.PI/2, Math.PI, -Math.PI/2)

  // Throttled state updates
  const throttledSetTargetDetected = useCallback(
    throttle((value) => setTargetDetected(value), 100),
    [setTargetDetected]
  );

  const throttledSetVideoPlaying = useCallback(
    throttle((value) => setVideoPlaying(value), 200),
    [setVideoPlaying]
  );

  // Setup video mesh with 3D vertical orientation
  const setupVideo = useCallback(async (anchor) => {
    if (!projectData?.videoUrl || !window.THREE) return;

    try {
      addDebugMessage('🎬 Setting up 3D vertical video standee...', 'info');

      const video = document.createElement('video');
      video.src = projectData.videoUrl;
      video.muted = true;
      video.loop = true; // Loop for continuous playback
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.controls = false;
      video.autoplay = false;
      video.preservesPitch = false;
      
      // Mobile-specific attributes
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('x-webkit-airplay', 'allow');
      video.style.objectFit = 'contain';
      
      videoRef.current = video;
      
      addDebugMessage('📱 Video element created with mobile optimizations', 'info');
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000);

        video.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          addDebugMessage('✅ Video metadata loaded', 'info');
          addDebugMessage(`📹 Video dimensions: ${video.videoWidth}x${video.videoHeight}`, 'info');
          video.muted = videoMuted !== false;
          resolve();
        }, { once: true });
        
        video.addEventListener('canplay', () => {
          addDebugMessage('✅ Video ready to play', 'info');
        }, { once: true });
        
        video.load();
      });
      
      // Prime the video for mobile
      try {
        await video.play();
        video.pause();
        addDebugMessage('✅ Video primed and ready for 3D animation', 'success');
      } catch (playError) {
        addDebugMessage(`⚠️ Video priming failed: ${playError.message}`, 'warning');
      }

      // Create video texture
      const texture = new window.THREE.VideoTexture(video);
      
      // High-quality texture settings
      texture.minFilter = window.THREE.LinearFilter;
      texture.magFilter = window.THREE.LinearFilter;
      texture.format = window.THREE.RGBAFormat;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      
      // Anisotropic filtering
      const renderer = rendererRef.current;
      if (renderer) {
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.anisotropy = Math.min(16, maxAnisotropy);
        addDebugMessage(`🎨 Video anisotropic filtering: ${texture.anisotropy}x`, 'info');
      }
      
      texture.colorSpace = window.THREE.SRGBColorSpace || window.THREE.sRGBEncoding;

      // Calculate dimensions for VERTICAL (portrait) standee display
      const videoAspect = video.videoWidth / video.videoHeight;
      
      // For vertical portrait display, height should be greater than width
      // Swap dimensions to make video stand tall (portrait orientation)
      let standeeWidth, standeeHeight;
      
      if (videoAspect > 1) {
        // Video is landscape (wider than tall) - make it portrait by swapping
        standeeHeight = 1.2; // Taller dimension
        standeeWidth = standeeHeight / videoAspect; // Narrower dimension
      } else {
        // Video is already portrait (taller than wide) - keep natural proportions
        standeeHeight = 1.2; // Taller dimension
        standeeWidth = standeeHeight * videoAspect; // Narrower dimension
      }
      
      addDebugMessage(`📐 Vertical standee dimensions: ${standeeWidth.toFixed(2)}w x ${standeeHeight.toFixed(2)}h (portrait)`, 'info');
      
      const geometry = new window.THREE.PlaneGeometry(standeeWidth, standeeHeight);
      
      // Create material with transparency for fade animation
      const material = new window.THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0, // Start invisible for fade-in animation
        side: window.THREE.DoubleSide, // Visible from both sides
        depthTest: true,
        depthWrite: true
      });

      const videoMesh = new window.THREE.Mesh(geometry, material);
      
      // 🎯 ROBUST SOLUTION: Double-nested groups for independent rotation control
      // Group 1 (innerGroup): Handles landscape video rotation (Z-axis)
      // Group 2 (outerGroup): Handles vertical standing (X-axis) and billboard (Y-axis)
      
      const innerGroup = new window.THREE.Group();
      const outerGroup = new window.THREE.Group();
      
      // For landscape videos, rotate the entire inner group on Z-axis
      // This makes the video display vertically
      if (videoAspect > 1) {
        innerGroup.rotation.z = Math.PI / 2; // Rotate 90° for vertical display
        addDebugMessage('🔄 Rotating landscape video 90° for vertical display', 'info');
      }
      
      // Build hierarchy: mesh → innerGroup → outerGroup → anchor
      innerGroup.add(videoMesh);
      outerGroup.add(innerGroup);
      
      // 🎯 CRITICAL: Set up outerGroup for VERTICAL standee that faces camera
      // The video should stand PERPENDICULAR to marker, with bottom toward marker
      
      // Initial position: center the video at half its height above marker
      // This makes the bottom edge sit on the marker surface
      outerGroup.position.set(0, standeeHeight / 2, 0); // Center video vertically
      
      // Video starts already perpendicular (standing upright)
      // No X-rotation animation needed
      outerGroup.rotation.x = 0; // Already perpendicular to marker
      outerGroup.rotation.y = 0; // Will be set by billboard to face camera  
      outerGroup.rotation.z = 0; // No tilt
      
      outerGroup.scale.set(0.01, 0.01, 0.01); // Start tiny for scale animation
      outerGroup.rotation.order = 'YXZ'; // Rotation order: Y (billboard) then X
      
      const facingDegrees = (facingAngle * 180 / Math.PI).toFixed(0);
      addDebugMessage(`🎭 Vertical Standee Setup: height ${standeeHeight} units`, 'info');
      addDebugMessage(`🎬 Animation: scale (0.01→1) + billboard Y-rotation + fade (0→1)`, 'info');
      addDebugMessage(`🔄 Billboard mode: Y-axis camera-facing active (video perpendicular to marker)`, 'info');
      addDebugMessage(`📦 Using double-nested groups for robust rotation (YXZ order)`, 'info');
      console.log('🎯 Vertical standee configuration:', {
        standeeHeight,
        rotationOrder: 'YXZ',
        doubleNested: true,
        alreadyPerpendicular: true
      });
      
      // Store groups, mesh, and dimensions for easy access
      videoMeshRef.current = { 
        container: outerGroup,  // Backwards compatibility
        outerGroup: outerGroup, 
        innerGroup: innerGroup, 
        mesh: videoMesh,
        standeeHeight: standeeHeight, // Store height for animation
        standeeWidth: standeeWidth
      };
      anchor.group.add(outerGroup);
      
      // Initially hidden
      outerGroup.visible = false;
      
      addDebugMessage('✅ 3D vertical video standee created', 'success');
      addDebugMessage('📏 Video will pop up vertically above the marker', 'success');

      // Video event listeners
      video.addEventListener('play', () => {
        setVideoPlaying(true);
        addDebugMessage('▶️ Video started playing', 'success');
      });

      video.addEventListener('pause', () => {
        setVideoPlaying(false);
        addDebugMessage('⏸️ Video paused', 'info');
      });

      video.addEventListener('ended', () => {
        video.currentTime = 0;
        savedVideoTimeRef.current = 0;
        addDebugMessage('🔄 Video ended, restarting...', 'info');
      });

    } catch (error) {
      addDebugMessage(`❌ Video setup failed: ${error.message}`, 'error');
    }
  }, [projectData, addDebugMessage, setVideoPlaying, videoMuted, popOutDistance, heightAboveMarker, verticalAngle, facingAngle]);

  // Initialize MindAR
  const initializeMindAR = useCallback(async (retryCount = 0, maxRetries = 3) => {
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    
    if (mindarRef.current) {
      addDebugMessage('⚠️ MindAR already initialized, skipping...', 'warning');
      return true;
    }
    
    if (isInitialized) {
      addDebugMessage('⚠️ AR already initialized, skipping...', 'warning');
      return true;
    }
    
    addDebugMessage(`🔍 Checking container element (attempt ${retryCount + 1}/${maxRetries + 1})...`, 'info');
    
    if (!containerRef.current || containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
      if (retryCount < maxRetries) {
        addDebugMessage(`⚠️ Container not ready yet, retrying in ${retryDelay}ms...`, 'warning');
        
        setTimeout(() => {
          addDebugMessage(`🔄 Retrying MindAR initialization (attempt ${retryCount + 2})...`, 'info');
          initializeMindAR(retryCount + 1, maxRetries);
        }, retryDelay);
        return false;
      } else {
        addDebugMessage('❌ Container failed to initialize after maximum retries', 'error');
        setError('AR container could not be initialized. Please refresh the page and try again.');
        return false;
      }
    }
    
    if (!librariesLoaded || !projectData) {
      addDebugMessage('❌ MindAR init failed: Missing requirements', 'error');
      return false;
    }
    
    addDebugMessage(`✅ Container ready: ${containerRef.current.offsetWidth}x${containerRef.current.offsetHeight}`, 'success');
    
    // Ensure container has minimum dimensions
    if (containerRef.current.offsetWidth < 100 || containerRef.current.offsetHeight < 100) {
      addDebugMessage('⚠️ Container too small, forcing minimum dimensions', 'warning');
      containerRef.current.style.width = '100%';
      containerRef.current.style.height = '100%';
      containerRef.current.style.minWidth = '320px';
      containerRef.current.style.minHeight = '240px';
    }

    try {
      addDebugMessage('🚀 Initializing MindAR for 3D experience...', 'info');

      let targetUrl = projectData.designUrl;
      let targetType = 'image file';
      let mindBuffer = null;
      
      // Priority: .mind file > composite image > original design
      if (projectData.mindTargetUrl) {
        targetUrl = projectData.mindTargetUrl;
        targetType = '.mind file';
        addDebugMessage('🎯 Using .mind file for AR tracking', 'info');
      } else if (projectData.compositeDesignUrl) {
        targetUrl = projectData.compositeDesignUrl;
        addDebugMessage('🎯 Using composite design for AR tracking', 'info');
      } else if (projectData.designUrl) {
        addDebugMessage('❌ No composite design available', 'error');
      }
      
      if (!targetUrl) {
        throw new Error('No target image available');
      }
      
      if (!projectData.mindTargetUrl) {
        addDebugMessage('❌ .mind file not available - cannot proceed', 'error');
        setError('AR tracking requires a .mind file. Please complete Step 2: "Save QR Position" to generate the required .mind file.');
        return false;
      }

      addDebugMessage(`🎯 Using target: ${targetType}`, 'info');
      
      if (targetType === '.mind file') {
        try {
          mindBuffer = await fetchMindFile(targetUrl, addDebugMessage);
          addDebugMessage('✅ .mind file loaded successfully', 'success');
        } catch (mindError) {
          addDebugMessage(`❌ Failed to load .mind file: ${mindError.message}`, 'error');
          throw new Error(`MindAR .mind file failed to load: ${mindError.message}`);
        }
      }

      // Create MindAR instance
      addDebugMessage('🔧 Creating MindAR instance...', 'info');
      
      const mindarConfig = {
        container: containerRef.current,
        maxTrack: 1,
        filterMinCF: 0.00005,
        filterBeta: 0.002,
        warmupTolerance: 20,
        missTolerance: 20,
        facingMode: getMindARFacingMode(),
        resolution: { 
          width: Math.min(containerRef.current.offsetWidth, 640),
          height: Math.min(containerRef.current.offsetHeight, 480) 
        },
        uiScanning: false,
        uiLoading: false,
        uiError: false
      };
      
      addDebugMessage(`🔧 MindAR facing mode: ${mindarConfig.facingMode}`, 'info');

      if (targetType === '.mind file' && mindBuffer) {
        const blob = new Blob([mindBuffer], { type: 'application/octet-stream' });
        const blobURL = URL.createObjectURL(blob);
        blobURLRef.current = blobURL;
        mindarConfig.imageTargetSrc = blobURL;
        addDebugMessage('🔧 Created Blob URL for .mind file', 'info');
      } else {
        mindarConfig.imageTargetSrc = targetUrl;
      }

      let mindar;
      try {
        mindar = new window.MindARThree.MindARThree(mindarConfig);
        mindarRef.current = mindar;
        addDebugMessage('✅ MindAR instance created successfully', 'success');
      } catch (mindarError) {
        addDebugMessage(`❌ MindAR creation failed: ${mindarError.message}`, 'error');
        throw new Error(`MindAR creation failed: ${mindarError.message}`);
      }

      const { renderer, scene, camera } = mindar;
      
      if (!renderer || !scene || !camera) {
        throw new Error('MindAR objects are undefined');
      }
      
      // Fix Three.js deprecation warnings
      if (renderer.outputEncoding !== undefined) {
        delete renderer.outputEncoding;
      }
      renderer.outputColorSpace = window.THREE.SRGBColorSpace;
      
      // High quality renderer settings for AR overlay
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.sortObjects = true;
      
      // Enable transparency and proper depth testing for 3D video overlay
      renderer.setClearColor(0x000000, 0); // Transparent background
      renderer.autoClear = false; // Don't auto-clear (preserve camera feed)
      
      // Ensure renderer canvas is properly positioned on top of video
      const rendererCanvas = renderer.domElement;
      rendererCanvas.style.position = 'absolute';
      rendererCanvas.style.top = '0';
      rendererCanvas.style.left = '0';
      rendererCanvas.style.width = '100%';
      rendererCanvas.style.height = '100%';
      rendererCanvas.style.zIndex = '10';
      rendererCanvas.style.pointerEvents = 'auto';
      
      addDebugMessage(`🎨 Renderer pixel ratio: ${renderer.getPixelRatio()}x`, 'info');
      addDebugMessage('🎨 Renderer configured for transparent AR overlay', 'success');
      
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      
      addDebugMessage('✅ MindAR objects validated and assigned', 'success');

      const anchor = mindar.addAnchor(0);
      anchorRef.current = anchor;
      anchor.group.visible = true;

      if (projectData.videoUrl) {
        await setupVideo(anchor);
      }

      // Start MindAR
      addDebugMessage('🚀 Starting MindAR...', 'info');
      
      // Request camera permission
      try {
        addDebugMessage('📷 Requesting camera permission...', 'info');
        const isMobile = isMobileDevice();
        addDebugMessage(`📱 Device type: ${isMobile ? 'Mobile' : 'Desktop'}`, 'info');
        
        const videoConstraints = getCameraConstraints(true);
        addDebugMessage(`🎥 Camera constraints: ${JSON.stringify(videoConstraints)}`, 'info');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: false
        });
        
        addDebugMessage('✅ Camera permission granted', 'success');
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        addDebugMessage(`📷 Camera: ${settings.width}x${settings.height}, facing: ${settings.facingMode || 'unknown'}`, 'info');
        
        stream.getTracks().forEach(track => track.stop());
        addDebugMessage('✅ Test stream stopped, MindAR will initialize camera', 'success');
      } catch (permissionError) {
        addDebugMessage(`❌ Camera permission denied: ${permissionError.message}`, 'error');
        
        if (permissionError.name === 'OverconstrainedError') {
          addDebugMessage('🔄 Retrying with relaxed constraints...', 'warning');
          try {
            const relaxedConstraints = getCameraConstraints(false);
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: relaxedConstraints,
              audio: false
            });
            stream.getTracks().forEach(track => track.stop());
            addDebugMessage('✅ Camera permission granted with relaxed constraints', 'success');
          } catch (retryError) {
            addDebugMessage(`❌ Retry failed: ${retryError.message}`, 'error');
            throw new Error(`Camera access denied: ${retryError.message}`);
          }
        } else {
          throw new Error(`Camera access denied: ${permissionError.message}`);
        }
      }
      
      try {
        await mindar.start();
        addDebugMessage('✅ MindAR started successfully', 'success');
        
        renderer.setAnimationLoop(null);
        addDebugMessage('🛑 Stopped MindAR default loop', 'info');
        
        // 🎭 CRITICAL: 3D Animation Control Loop
        let wasTargetVisible = false;
        
        const animate3DVideo = () => {
          const isTargetVisible = anchorRef.current && anchorRef.current.visible;
          
          // Update video texture every frame when playing
          if (videoMeshRef.current && videoRef.current && !videoRef.current.paused) {
            const mesh = videoMeshRef.current.mesh;
            if (mesh && mesh.material && mesh.material.map) {
              mesh.material.map.needsUpdate = true;
            }
          }
          
          if (isTargetVisible) {
            // 🎯 Target detected - trigger 3D entrance animation
            
            if (!wasTargetVisible) {
              // Target just appeared - start animation
              animationStartTimeRef.current = Date.now();
              animationCompleteRef.current = false;
              wasTargetVisible = true;
              
              const timestamp = new Date().toLocaleTimeString();
              console.log(`🎯 [${timestamp}] TARGET DETECTED - Starting 3D animation`);
              addDebugMessage('🎯 Target detected! Starting 3D popup animation...', 'success');
              addDebugMessage('🎭 Billboard mode: Y-axis camera-facing enabled', 'info');
              setTargetDetected(true);
              
              // Show container (will be animated from invisible to visible)
              if (videoMeshRef.current) {
                const container = videoMeshRef.current.container;
                const mesh = videoMeshRef.current.mesh;
                const videoHeight = videoMeshRef.current.standeeHeight;
                container.visible = true;
                console.log('🎬 Video container initial state:', {
                  visible: container.visible,
                  videoHeight: videoHeight,
                  position: {
                    x: container.position.x.toFixed(2),
                    y: container.position.y.toFixed(2),
                    z: container.position.z.toFixed(2)
                  },
                  rotation: {
                    x: `${(container.rotation.x * 180 / Math.PI).toFixed(0)}°`,
                    y: `${(container.rotation.y * 180 / Math.PI).toFixed(0)}°`,
                    z: `${(container.rotation.z * 180 / Math.PI).toFixed(0)}°`
                  },
                  scale: container.scale.x.toFixed(2),
                  opacity: mesh.material?.opacity.toFixed(2),
                  materialVisible: mesh.material?.visible,
                  meshVisible: mesh.visible
                });
                addDebugMessage(`📏 Video height: ${videoHeight}, Starting Y: ${container.position.y.toFixed(2)}`, 'info');
              }
            }
            
            // 🎭 ROBUST BILLBOARD EFFECT: Calculate Y-axis rotation to face camera
            // This runs every frame to keep video facing the camera as user moves
            let angleToCamera = 0; // Default to face forward
            
            if (videoMeshRef.current && cameraRef.current && anchorRef.current && window.THREE) {
              try {
                const container = videoMeshRef.current.container;
                
                // Get camera position in world space
                const cameraPosition = new window.THREE.Vector3();
                cameraRef.current.getWorldPosition(cameraPosition);
                
                // Get container position in world space
                const containerPosition = new window.THREE.Vector3();
                container.getWorldPosition(containerPosition);
                
                // Calculate direction vector from container to camera (on XZ plane only)
                const dx = cameraPosition.x - containerPosition.x;
                const dz = cameraPosition.z - containerPosition.z;
                
                // Calculate Y-axis rotation angle to face camera
                // atan2 gives us the angle in radians
                angleToCamera = Math.atan2(dx, dz);
                
              } catch (billboardError) {
                // Silently fall back to default angle if calculation fails
                console.warn('Billboard calculation failed:', billboardError);
              }
            }
            
            // 🎬 Animate entrance effect
            if (!animationCompleteRef.current && animationStartTimeRef.current) {
              const elapsed = Date.now() - animationStartTimeRef.current;
              const progress = Math.min(elapsed / animationDuration, 1);
              
              if (videoMeshRef.current) {
                const container = videoMeshRef.current.container;
                const mesh = videoMeshRef.current.mesh;
                const videoHeight = videoMeshRef.current.standeeHeight;
                
                // Scale animation with bounce (easeOutBack)
                const scale = easeOutBack(progress);
                container.scale.set(scale, scale, scale);
                
                // 🎯 RISE FROM BOTTOM ANIMATION
                // Start: video bottom at marker (Y = videoHeight/2 puts center at half height, bottom at 0)
                // End: video rises up so bottom is at heightAboveMarker
                const startY = videoHeight / 2; // Bottom edge at marker surface
                const endY = heightAboveMarker + (videoHeight / 2); // Bottom edge at heightAboveMarker
                const currentY = startY + (easeOutCubic(progress) * (endY - startY));
                
                container.position.x = 0; // Centered horizontally
                container.position.y = currentY; // Rising animation
                container.position.z = 0; // No forward/back movement
                
                // 🎯 X-Rotation: Keep at 0° (perpendicular to marker - standing upright)
                container.rotation.x = 0;
                
                // 🎯 Y-Rotation: Billboard effect - dynamically face camera
                container.rotation.y = angleToCamera; // Real-time camera-facing
                
                // 🎯 Z-Rotation: Keep at 0 (no tilt)
                container.rotation.z = 0;
                
                // Fade animation (opacity 0 to 1)
                const opacity = easeInOut(progress);
                if (mesh.material) {
                  mesh.material.opacity = opacity;
                }
                
                // Log progress at key milestones
                if (progress === 0.25 || progress === 0.5 || progress === 0.75) {
                  const percent = Math.round(progress * 100);
                  addDebugMessage(`🎬 Rising from marker ${percent}% - Y:${currentY.toFixed(2)}, Scale:${scale.toFixed(2)}, Opacity:${opacity.toFixed(2)}`, 'info');
                }
              }
              
              // Animation complete
              if (progress >= 1) {
                animationCompleteRef.current = true;
                addDebugMessage('✨ Video risen and facing camera! Billboard mode active', 'success');
                
                // Log final position
                if (videoMeshRef.current) {
                  const container = videoMeshRef.current.container;
                  const mesh = videoMeshRef.current.mesh;
                  console.log('✅ Video container final state:', {
                    position: {
                      x: container.position.x.toFixed(2),
                      y: container.position.y.toFixed(2),
                      z: container.position.z.toFixed(2)
                    },
                    rotation: {
                      x: `${(container.rotation.x * 180 / Math.PI).toFixed(0)}°`,
                      y: `${(container.rotation.y * 180 / Math.PI).toFixed(0)}°`,
                      z: `${(container.rotation.z * 180 / Math.PI).toFixed(0)}°`
                    },
                    scale: container.scale.x.toFixed(2),
                    opacity: mesh.material?.opacity.toFixed(2),
                    materialVisible: mesh.material?.visible,
                    containerVisible: container.visible,
                    meshVisible: mesh.visible
                  });
                }
                
                // Start video playback after animation
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().then(() => {
                    console.log('✅ Video playing after animation');
                    
                    // Track video view analytics
                    if (trackAnalytics && !videoViewTrackedRef.current) {
                      if (shouldTrackAnalytics('videoView', userId || projectId, projectId)) {
                        videoViewTrackedRef.current = true;
                        trackAnalytics('videoView', {
                          source: 'ar_3d_experience',
                          videoProgress: 0,
                          videoDuration: videoRef.current?.duration || 0
                        }).catch(err => {
                          console.error('❌ Video view tracking failed:', err);
                          videoViewTrackedRef.current = false;
                          markAnalyticsFailed('videoView', userId || projectId, projectId);
                        });
                      }
                    }
                  }).catch(e => {
                    console.log(`⚠️ Auto-play failed:`, e.message);
                    addDebugMessage('💡 Tap to allow video playback', 'info');
                  });
                }
              }
            } else if (animationCompleteRef.current && videoMeshRef.current) {
              // 🎭 Animation complete - continue billboard effect
              // Keep the video facing the camera as user moves around
              const container = videoMeshRef.current.container;
              container.rotation.y = angleToCamera;
              
              // Log camera-facing angle periodically (every 2 seconds)
              const now = Date.now();
              if (now - lastBillboardLogRef.current > 2000) {
                const angleDegrees = (angleToCamera * 180 / Math.PI).toFixed(0);
                console.log(`🎭 Billboard active - Y-rotation: ${angleDegrees}° (facing camera)`);
                lastBillboardLogRef.current = now;
              }
            }
            
          } else {
            // 🔍 Target lost - hide container and reset animation
            
            if (videoMeshRef.current && videoMeshRef.current.container.visible) {
              const container = videoMeshRef.current.container;
              const mesh = videoMeshRef.current.mesh;
              const videoHeight = videoMeshRef.current.standeeHeight;
              container.visible = false;
              
              // Reset animation state for next detection
              animationStartTimeRef.current = null;
              animationCompleteRef.current = false;
              
              // Reset container to initial state for next rise animation
              container.scale.set(0.01, 0.01, 0.01);
              container.position.set(0, videoHeight / 2, 0); // Reset to start position
              container.rotation.x = 0; // Keep perpendicular
              container.rotation.y = 0; // Reset Y rotation for billboard
              container.rotation.z = 0; // No tilt
              if (mesh.material) {
                mesh.material.opacity = 0;
              }
            }
            
            // Pause video
            if (videoRef.current && !videoRef.current.paused) {
              savedVideoTimeRef.current = videoRef.current.currentTime;
              videoRef.current.pause();
              const timestamp = new Date().toLocaleTimeString();
              console.log(`⏸️ [${timestamp}] Video paused at ${savedVideoTimeRef.current.toFixed(2)}s`);
            }
            
            if (wasTargetVisible) {
              wasTargetVisible = false;
              const timestamp = new Date().toLocaleTimeString();
              console.log(`🔍 [${timestamp}] TARGET LOST`);
              addDebugMessage('🔍 Target lost - ready for next scan', 'warning');
              setTargetDetected(false);
              setVideoPlaying(false);
            }
          }
        };
        
        // Set up render loop with 3D animation control
        renderer.setAnimationLoop(() => {
          animate3DVideo();
          
          // Update video texture
          if (videoMeshRef.current && videoRef.current && !videoRef.current.paused) {
            const mesh = videoMeshRef.current.mesh;
            if (mesh && mesh.material && mesh.material.map) {
              mesh.material.map.needsUpdate = true;
            }
          }
          
          // Clear and render scene on top of camera feed
          renderer.clear(); // Clear canvas (transparent)
          renderer.render(scene, camera); // Render 3D scene
        });
        
        addDebugMessage('🔄 Vertical standee render loop started', 'success');
        addDebugMessage('🎯 Point camera at the target image - video will face you in 3D!', 'info');
      
      } catch (startError) {
        addDebugMessage(`❌ MindAR failed to start: ${startError.message}`, 'error');
        throw new Error(`MindAR start failed: ${startError.message}`);
      }
      
      setCameraActive(true);
      addDebugMessage('✅ Camera marked as active', 'success');
      
      // Give MindAR time to create elements
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for canvas
      let attempts = 0;
      const maxAttempts = 5;
      let canvas = null;
      
      while (attempts < maxAttempts && !canvas) {
        canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }
      
      addDebugMessage('🔍 Checking MindAR elements...', 'info');
      
      if (canvas) {
        addDebugMessage(`✅ Canvas found: ${canvas.width}x${canvas.height}`, 'success');
        
        // Style canvas
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '10';
        canvas.style.backgroundColor = 'transparent';
        
        const video = containerRef.current?.querySelector('video');
        if (video) {
          video.style.position = 'absolute';
          video.style.top = '0';
          video.style.left = '0';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.zIndex = '5';
          video.style.objectFit = 'cover';
          
          if (!video.hasAttribute('playsinline')) {
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
          }
          if (!video.hasAttribute('muted')) {
            video.setAttribute('muted', '');
            video.muted = true;
          }
          video.setAttribute('autoplay', '');
          video.autoplay = true;
        }
      }
      
      setCameraActive(true);
      setArReady(true);
      setIsInitialized(true);
      
      addDebugMessage('✅ 3D AR Experience ready!', 'success');
      
      return true;

    } catch (error) {
      addDebugMessage(`❌ MindAR initialization failed: ${error.message}`, 'error');
      setError(`AR initialization failed: ${error.message}`);
      return false;
    }
  }, [librariesLoaded, projectData, isInitialized, addDebugMessage, setError, setCameraActive, setArReady, setIsInitialized, setTargetDetected, setVideoPlaying, setupVideo, trackAnalytics, userId, projectId, animationDuration, popOutDistance, heightAboveMarker, verticalAngle, facingAngle]);

  // Start AR scanning
  const startScanning = useCallback(async () => {
    if (isScanning || !isInitialized) return;

    try {
      addDebugMessage('📱 Starting 3D AR scan...', 'info');
      setIsScanning(true);
      setError(null);
      addDebugMessage('✅ 3D AR scanning active', 'success');
    } catch (error) {
      addDebugMessage(`❌ Failed to start scanning: ${error.message}`, 'error');
      setError(`Failed to start scanning: ${error.message}`);
      setIsScanning(false);
    }
  }, [isScanning, isInitialized, setIsScanning, setError, addDebugMessage]);

  // Stop AR scanning
  const stopScanning = useCallback(async () => {
    if (!isScanning) return;

    try {
      addDebugMessage('⏹️ Stopping AR scan...', 'info');
      
      if (mindarRef.current) {
        await mindarRef.current.stop();
      }
      
      setIsScanning(false);
      setCameraActive(false);
      setTargetDetected(false);
      setVideoPlaying(false);
      
      addDebugMessage('✅ AR scanning stopped', 'success');
    } catch (error) {
      addDebugMessage(`❌ Failed to stop scanning: ${error.message}`, 'error');
    }
  }, [isScanning, setIsScanning, setCameraActive, setTargetDetected, setVideoPlaying, addDebugMessage]);

  // Toggle video playback
  const toggleVideo = useCallback(async () => {
    if (!videoRef.current || !targetDetected) return;

    try {
      if (videoPlaying) {
        videoRef.current.pause();
        setVideoPlaying(false);
        addDebugMessage('⏸️ Video paused by user', 'info');
      } else {
        await videoRef.current.play();
        setVideoPlaying(true);
        addDebugMessage('▶️ Video started by user', 'success');
      }
    } catch (error) {
      addDebugMessage(`❌ Video toggle failed: ${error.message}`, 'error');
    }
  }, [videoPlaying, targetDetected, setVideoPlaying, addDebugMessage]);

  // Toggle video mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    videoRef.current.muted = !videoRef.current.muted;
    safeSetVideoMuted(videoRef.current.muted);
    addDebugMessage(`🔊 Video ${videoRef.current.muted ? 'muted' : 'unmuted'}`, 'info');
  }, [addDebugMessage, safeSetVideoMuted]);

  // Cleanup function
  const cleanupAR = useCallback(async () => {
    addDebugMessage('🧹 Cleaning up 3D AR resources...', 'info');
    
    try {
      if (mindarRef.current) {
        await mindarRef.current.stop();
        mindarRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
        videoRef.current = null;
      }
      
      if (videoMeshRef.current) {
        try {
          const mesh = videoMeshRef.current.mesh;
          const container = videoMeshRef.current.container;
          
          // Dispose mesh resources
          if (mesh) {
            if (mesh.material && mesh.material.map) {
              mesh.material.map.dispose();
            }
            if (mesh.material) {
              mesh.material.dispose();
            }
            if (mesh.geometry) {
              mesh.geometry.dispose();
            }
          }
          
          // Remove container from scene
          if (container && container.parent) {
            container.parent.remove(container);
          }
        } catch (error) {
          console.warn('Error disposing video mesh:', error);
        }
        videoMeshRef.current = null;
      }
      
      if (rendererRef.current) {
        try {
          rendererRef.current.dispose();
          const canvas = rendererRef.current.domElement;
          if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
        } catch (error) {
          console.warn('Error disposing renderer:', error);
        }
        rendererRef.current = null;
      }
      
      if (blobURLRef.current) {
        URL.revokeObjectURL(blobURLRef.current);
        blobURLRef.current = null;
      }
      
      sceneRef.current = null;
      cameraRef.current = null;
      anchorRef.current = null;
      animationStartTimeRef.current = null;
      animationCompleteRef.current = false;
      
      addDebugMessage('✅ 3D AR cleanup completed', 'info');
    } catch (error) {
      addDebugMessage(`❌ Cleanup error: ${error.message}`, 'error');
    }
  }, [addDebugMessage]);

  // Restart AR
  const restartAR = useCallback(async () => {
    addDebugMessage('🔄 Restarting 3D AR...', 'info');
    
    await stopScanning();
    await cleanupAR();
    resetARState();

    setTimeout(async () => {
      const success = await initializeMindAR();
      if (success) {
        await startScanning();
      }
    }, 1000);
  }, [stopScanning, cleanupAR, resetARState, initializeMindAR, startScanning, addDebugMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAR();
    };
  }, [cleanupAR]);

  return {
    // Refs
    containerRef,
    videoRef,
    mindarRef,
    sceneRef,
    rendererRef,
    cameraRef,
    anchorRef,
    videoMeshRef,
    
    // Functions
    initializeMindAR,
    startScanning,
    stopScanning,
    toggleVideo,
    toggleMute,
    restartAR,
    cleanupAR
  };
};

