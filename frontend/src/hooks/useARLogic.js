/**
 * AR Logic Hook
 * Handles all AR initialization and management logic
 */
// projcet is ready yeaheeeee

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

export const useARLogic = ({
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
  trackAnalytics,  // Add analytics tracking
  setCameraPermissionRequired,
  setCameraPermissionBlocked,
  setCameraPermissionDismissed
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
  const blobURLRef = useRef(null); // Store blob URL for cleanup
  const savedVideoTimeRef = useRef(0); // Store video time when target is lost for resume
  const videoViewTrackedRef = useRef(false); // Track if video view has been counted
  const isResuming = useRef(false); // Prevent multiple simultaneous resume attempts

  // Throttled state updates
  const throttledSetTargetDetected = useCallback(
    throttle((value) => setTargetDetected(value), 100),
    [setTargetDetected]
  );

  const throttledSetVideoPlaying = useCallback(
    throttle((value) => setVideoPlaying(value), 200),
    [setVideoPlaying]
  );

  // Setup video mesh
  const setupVideo = useCallback(async (anchor) => {
    if (!projectData?.videoUrl || !window.THREE) return;

    try {
      addDebugMessage('🎬 Setting up video...', 'info');

      const video = document.createElement('video');
      video.src = projectData.videoUrl;
      video.muted = true;
      video.loop = false; // Don't loop - preserve video time for resume functionality
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto'; // Changed from 'metadata' to 'auto' for faster loading
      video.controls = false;
      video.autoplay = false; // Don't autoplay - wait for target detection
      video.preservesPitch = false; // Better performance on mobile
      
      // Mobile-specific attributes for iOS and Android
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('x-webkit-airplay', 'allow');
      
      // Additional mobile optimization
      video.style.objectFit = 'contain'; // Ensure video fits within the mesh
      
      videoRef.current = video;
      
      addDebugMessage('📱 Video element created with mobile optimizations', 'info');
      
      // Wait for video to be ready before creating texture
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000);

        video.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          addDebugMessage('✅ Video metadata loaded', 'info');
          addDebugMessage(`📹 Video dimensions: ${video.videoWidth}x${video.videoHeight}`, 'info');

          // Set initial muted state based on current state
          video.muted = videoMuted !== false;
          resolve();
        }, { once: true });
        
        video.addEventListener('canplay', () => {
          addDebugMessage('✅ Video ready to play', 'info');
        }, { once: true });
        
        video.load(); // Start loading
      });
      
      // ✅ CRITICAL: Pre-load video but DON'T play yet
      // We'll start playback when target is detected
      // On mobile, we need to "prime" the video by attempting to play then pause
      try {
        await video.play();
        video.pause();
        // Don't reset currentTime to 0 - let it stay at 0 naturally
        addDebugMessage('✅ Video primed and ready (will play on target detection)', 'success');
      } catch (playError) {
        addDebugMessage(`⚠️ Video priming failed: ${playError.message}`, 'warning');
        addDebugMessage('💡 Video may require user interaction to play', 'info');
      }

      // ✅ CRITICAL: Create HIGH QUALITY texture and material
      const texture = new window.THREE.VideoTexture(video);
      
      // High-quality texture settings for crisp video display
      texture.minFilter = window.THREE.LinearFilter;
      texture.magFilter = window.THREE.LinearFilter;
      texture.format = window.THREE.RGBAFormat;
      texture.generateMipmaps = false; // Disable mipmaps for videos (better performance and quality)
      texture.needsUpdate = true;
      
      // Enable anisotropic filtering for better quality at angles (if supported)
      const renderer = rendererRef.current;
      if (renderer) {
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.anisotropy = Math.min(16, maxAnisotropy); // Use max quality but cap at 16
        addDebugMessage(`🎨 Video anisotropic filtering: ${texture.anisotropy}x`, 'info');
      }
      
      // Set correct color space for proper color reproduction
      texture.colorSpace = window.THREE.SRGBColorSpace || window.THREE.sRGBEncoding;

      // ✅ DYNAMIC SIZING: Calculate dimensions to match the detected target exactly
      // The video should overlay perfectly on the physical printed design
      
      // Get the video aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      
      // Get the target (design) aspect ratio
      const designAspect = projectData.designDimensions 
        ? projectData.designDimensions.width / projectData.designDimensions.height 
        : 1;
      
      addDebugMessage(`📐 Video aspect: ${videoAspect.toFixed(2)}, Design aspect: ${designAspect.toFixed(2)}`, 'info');
      
      // MindAR targets are normalized to fit within a 1x1 unit square
      // We need to size the video plane to match this 1:1 with the target
      let planeWidth, planeHeight;
      
      // Option 1: Fit video to cover entire target (may crop video)
      // Option 2: Fit video to fit within target (may show borders)
      // We'll use "cover" behavior - video fills the entire target
      
      if (videoAspect > designAspect) {
        // Video is wider than target - fit height, crop width
        planeHeight = 1;
        planeWidth = videoAspect / designAspect;
      } else {
        // Video is taller than target - fit width, crop height
        planeWidth = 1;
        planeHeight = designAspect / videoAspect;
      }
      
      const geometry = new window.THREE.PlaneGeometry(planeWidth, planeHeight);
      
      // ✅ Create material with proper transparency handling
      const material = new window.THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: false,
        side: window.THREE.FrontSide
      });

      const videoMesh = new window.THREE.Mesh(geometry, material);
      
      // Position at the center of the anchor (target)
      videoMesh.position.set(0, 0, 0);
      videoMesh.rotation.x = 0;
      
      // ✅ NO SCALING - Video plane is already sized to match the target (1:1)
      // The anchor itself is positioned and scaled by MindAR to match the detected target
      videoMesh.scale.set(1, 1, 1);
      
      addDebugMessage(`📐 Video plane size: ${planeWidth.toFixed(2)} x ${planeHeight.toFixed(2)} (matches target 1:1)`, 'info');
      
      videoMeshRef.current = videoMesh;
      anchor.group.add(videoMesh);
      
      // Initially hidden - will be shown in animation loop when anchor.visible
      videoMesh.visible = false;
      
      addDebugMessage('🎬 Video mesh added to anchor (1:1 scale with detected target)', 'info');
      addDebugMessage('📏 Video will overlay exactly on the physical printed design', 'success');

      // Video event listeners
      video.addEventListener('loadedmetadata', () => {
        addDebugMessage('✅ Video metadata loaded', 'success');
        addDebugMessage(`📹 Video dimensions: ${video.videoWidth}x${video.videoHeight}`, 'info');
      });

      video.addEventListener('canplay', () => {
        addDebugMessage('✅ Video ready to play', 'success');
      });

      video.addEventListener('play', () => {
        setVideoPlaying(true);
        addDebugMessage('▶️ Video started playing', 'success');
      });

      video.addEventListener('pause', () => {
        setVideoPlaying(false);
        addDebugMessage('⏸️ Video paused', 'info');
      });

      video.addEventListener('ended', () => {
        // When video ends, restart from beginning (manual loop for better control)
        video.currentTime = 0;
        savedVideoTimeRef.current = 0;
        setVideoPlaying(false);
        addDebugMessage('🔄 Video ended, restarting...', 'info');
        // Video will auto-play if target is still visible (handled by animation loop)
      });

      addDebugMessage('✅ Video mesh created successfully', 'success');

    } catch (error) {
      addDebugMessage(`❌ Video setup failed: ${error.message}`, 'error');
    }
  }, [projectData, addDebugMessage, setVideoPlaying]);

  // Initialize MindAR
  const initializeMindAR = useCallback(async (retryCount = 0, maxRetries = 3) => {
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    
    // Prevent multiple initializations
    if (mindarRef.current) {
      addDebugMessage('⚠️ MindAR already initialized, skipping...', 'warning');
      return true;
    }
    
    // Check if we're already in the process of initializing
    if (isInitialized) {
      addDebugMessage('⚠️ AR already initialized, skipping...', 'warning');
      return true;
    }
    
    addDebugMessage(`🔍 Checking container element (attempt ${retryCount + 1}/${maxRetries + 1})...`, 'info');
    
    if (!containerRef.current || containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
      if (retryCount < maxRetries) {
        addDebugMessage(`⚠️ Container not ready yet, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`, 'warning');
        
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
      addDebugMessage('🚀 Initializing MindAR...', 'info');

      let targetUrl = projectData.designUrl;
      let targetType = 'image file';
      let mindBuffer = null;
      
      // CRITICAL: Check for .mind file FIRST - but allow fallback to composite image if .mind file unavailable
      // Replicate upload page logic: prefer .mind file, but allow composite image fallback
      if (projectData.mindTargetUrl) {
        addDebugMessage('🎯 Found .mind file URL - validating before use...', 'info');
        
        // Try to fetch and validate the .mind file
        try {
          const testBuffer = await fetchMindFile(projectData.mindTargetUrl, addDebugMessage);
          // If we get here, the .mind file is valid binary format
          targetUrl = projectData.mindTargetUrl;
          targetType = '.mind file';
          addDebugMessage('✅ Valid .mind file found - using for AR tracking (best performance)', 'success');
        } catch (mindValidationError) {
          // .mind file is invalid (likely JSON fallback) - fall back to composite image
          addDebugMessage('⚠️ .mind file validation failed - file appears to be JSON fallback, not binary', 'warning');
          addDebugMessage(`🔍 Validation error: ${mindValidationError.message}`, 'info');
          addDebugMessage('🔄 Falling back to composite image for AR tracking', 'info');
          
          if (projectData.compositeDesignUrl) {
            targetUrl = projectData.compositeDesignUrl;
            targetType = 'image file';
            addDebugMessage('✅ Using composite image as fallback (may have reduced tracking performance)', 'warning');
          } else if (projectData.designUrl) {
            targetUrl = projectData.designUrl;
            targetType = 'image file';
            addDebugMessage('✅ Using design image as fallback (may have reduced tracking performance)', 'warning');
          } else {
            addDebugMessage('❌ No valid .mind file and no composite/design image available', 'error');
            setError('AR tracking requires a valid .mind file or composite image. Please ensure your campaign has a composite design.');
            return false;
          }
        }
      } else {
        // No .mind file URL - use composite image or design image as fallback
        if (projectData.compositeDesignUrl) {
          addDebugMessage('⚠️ No .mind file available - using composite image for AR tracking', 'warning');
          addDebugMessage('💡 .mind files provide better tracking performance, but composite images can work as fallback', 'info');
          targetUrl = projectData.compositeDesignUrl;
          targetType = 'image file';
        } else if (projectData.designUrl) {
          addDebugMessage('⚠️ No .mind file or composite - using design image for AR tracking', 'warning');
          addDebugMessage('💡 This may have reduced tracking performance', 'info');
          targetUrl = projectData.designUrl;
          targetType = 'image file';
        } else {
          addDebugMessage('❌ No .mind file, composite design, or design image available', 'error');
          addDebugMessage('💡 Users need to scan the composite image (design + QR code)', 'info');
          addDebugMessage('🔧 Please generate composite design', 'info');
          setError('No target image available for AR tracking. Please ensure a composite design is available.');
          return false;
        }
      }

      addDebugMessage(`🎯 Using target: ${targetType}`, 'info');
      addDebugMessage(`🔗 Target URL: ${targetUrl}`, 'info');
      
      if (targetType === 'image file') {
        try {
          await validateImageForMindAR(targetUrl, addDebugMessage);
          const processedUrl = await processImageForAR(targetUrl, addDebugMessage);
          targetUrl = processedUrl;
          addDebugMessage(`✅ Using processed image URL: ${processedUrl.substring(0, 50)}...`, 'success');
        } catch (validationError) {
          addDebugMessage(`❌ Image validation failed: ${validationError.message}`, 'error');
          addDebugMessage('🔄 Attempting to use original URL as fallback...', 'warning');
          // Don't throw error, try with original URL
        }
      } else if (targetType === '.mind file') {
        addDebugMessage('🎯 Using .mind file target', 'info');
        try {
          // Fetch .mind file as binary buffer (already validated above, but fetch again for use)
          mindBuffer = await fetchMindFile(targetUrl, addDebugMessage);
          addDebugMessage('✅ .mind file loaded successfully', 'success');
        } catch (mindError) {
          // This should not happen since we validated above, but handle it anyway
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
        facingMode: getMindARFacingMode(), // Back camera on mobile, front on desktop
        resolution: { 
          width: Math.min(containerRef.current.offsetWidth, 640),
          height: Math.min(containerRef.current.offsetHeight, 480) 
        },
        // Ensure canvas is visible and properly positioned
        uiScanning: false, // Disable default UI scanning overlay
        uiLoading: false,  // Disable default UI loading overlay
        uiError: false     // Disable default UI error overlay
      };
      
      addDebugMessage(`🔧 MindAR facing mode: ${mindarConfig.facingMode} (mobile: ${isMobileDevice()})`, 'info');

      // Add specific configuration based on target type
      if (targetType === '.mind file' && mindBuffer) {
        // ✅ Create a Blob URL from the binary buffer
        // MindAR expects a URL, not raw binary data
        const blob = new Blob([mindBuffer], { type: 'application/octet-stream' });
        const blobURL = URL.createObjectURL(blob);
        blobURLRef.current = blobURL; // Store for cleanup
        mindarConfig.imageTargetSrc = blobURL;
        addDebugMessage('🔧 Created Blob URL for .mind file', 'info');
        addDebugMessage(`📍 Blob URL: ${blobURL.substring(0, 50)}...`, 'info');
      } else {
        // For image files, we need to ensure MindAR processes them correctly
        // CRITICAL: When using an image file (not .mind), we must ensure MindAR knows it's an image
        // and doesn't try to process it as a .mind file buffer
        
        // Normalize the image URL to ensure it's clearly an image
        let imageUrl = targetUrl;
        
        // If the URL might be confused with a .mind file, ensure it's clearly an image
        if (imageUrl.includes('/raw/upload/') && !imageUrl.match(/\.(png|jpg|jpeg|webp)$/i)) {
          // This might be a .mind file URL - don't use it as an image
          addDebugMessage('⚠️ Warning: URL appears to be a .mind file, not an image', 'warning');
          throw new Error('Cannot use .mind file URL as image. Please use compositeDesignUrl instead.');
        }
        
        // CRITICAL: Convert image URL to data URL to ensure MindAR treats it as an image, not a .mind file
        // This prevents MindAR from trying to use addImageTargetsFromBuffer on an image URL
        addDebugMessage('🔄 Converting image URL to data URL for safe MindAR processing...', 'info');
        try {
          // Fetch image and convert to data URL
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
          }
          const imageBlob = await imageResponse.blob();
          
          // Validate it's actually an image
          if (!imageBlob.type.startsWith('image/')) {
            throw new Error(`URL does not point to an image: ${imageBlob.type}`);
          }
          
          // Convert to data URL
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
          });
          
          mindarConfig.imageTargetSrc = dataUrl;
          addDebugMessage('✅ Image converted to data URL - MindAR will process as image', 'success');
          addDebugMessage(`📊 Image type: ${imageBlob.type}, size: ${imageBlob.size} bytes`, 'info');
        } catch (conversionError) {
          addDebugMessage(`⚠️ Failed to convert image to data URL: ${conversionError.message}`, 'warning');
          addDebugMessage('🔄 Falling back to direct image URL (may cause issues)', 'warning');
          
          // Fallback: Ensure Cloudinary image URLs have proper image format parameters
          if (imageUrl.includes('cloudinary.com') && !imageUrl.includes('f_')) {
            const separator = imageUrl.includes('?') ? '&' : '?';
            imageUrl = `${imageUrl}${separator}f_png`; // Force PNG format
            addDebugMessage('🔧 Added format parameter to Cloudinary URL', 'info');
          }
          
          mindarConfig.imageTargetSrc = imageUrl;
          addDebugMessage('🔧 Using image URL directly for MindAR', 'info');
          addDebugMessage('⚠️ Note: Image files are processed by MindAR internally (may have reduced performance)', 'warning');
        }
        
        // Add specific image processing hints
        if (imageUrl.includes('.png') || imageUrl.includes('f_png') || imageUrl.includes('format=png')) {
          addDebugMessage('🖼️ Detected PNG image format - MindAR will handle conversion', 'info');
        } else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('f_jpg')) {
          addDebugMessage('🖼️ Detected JPEG image format - MindAR will handle conversion', 'info');
        }
        
        // Validate the image before passing to MindAR
        try {
          addDebugMessage('🔧 Validating image for MindAR compatibility...', 'info');
          
          // Create a temporary image element to validate the image
          const testImg = new Image();
          testImg.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Image validation timeout'));
            }, 10000);
            
            testImg.onload = () => {
              clearTimeout(timeout);
              addDebugMessage(`✅ Image validation successful: ${testImg.naturalWidth}x${testImg.naturalHeight}`, 'success');
              resolve();
            };
            testImg.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Image validation failed'));
            };
            testImg.src = imageUrl;
          });
          
          addDebugMessage('🔧 Image pre-validation completed', 'success');
        } catch (imgError) {
          addDebugMessage(`⚠️ Image pre-validation failed: ${imgError.message}`, 'warning');
          addDebugMessage('🔄 Proceeding with original URL...', 'info');
        }
      }

      
      addDebugMessage(`🔧 MindAR config: container=${mindarConfig.container ? 'ready' : 'missing'}, imageTarget=${mindarConfig.imageTargetSrc ? 'set' : 'missing'}`, 'info');
      addDebugMessage(`🔧 Target URL type: ${typeof mindarConfig.imageTargetSrc}`, 'info');
      addDebugMessage(`🔧 Target URL length: ${mindarConfig.imageTargetSrc ? mindarConfig.imageTargetSrc.length : 'N/A'}`, 'info');
      
      let mindar;
      try {
        // MindAR requires .mind files for image targets
        // If we only have an image file, we need to inform the user
        if (targetType === 'image file') {
          addDebugMessage('⚠️ Warning: Using image file without .mind file', 'warning');
          addDebugMessage('💡 MindAR will attempt to process the image, but a .mind file is recommended', 'info');
          addDebugMessage('🔧 For best performance, generate a .mind file from the composite image', 'info');
        }
        
        // Create MindAR instance
        if (window.MindARThree && window.MindARThree.MindARThree) {
          mindar = new window.MindARThree.MindARThree(mindarConfig);
          mindarRef.current = mindar;
          addDebugMessage('✅ MindAR instance created successfully', 'success');
        } else {
          throw new Error('MindARThree not available');
        }
      } catch (mindarError) {
        addDebugMessage(`❌ MindAR creation failed: ${mindarError.message}`, 'error');
        
        // If it's a buffer corruption error, handle it gracefully
        if (mindarError.message.includes('Extra') && mindarError.message.includes('byte')) {
          addDebugMessage('🔄 Buffer corruption error detected', 'error');
          addDebugMessage(`🔍 Error details: ${mindarError.message}`, 'info');
          
          // If we have a corrupted .mind file, try to regenerate it
          if (targetType === '.mind file') {
            addDebugMessage('❌ .mind file appears to be corrupted', 'error');
            addDebugMessage('💡 The .mind file may need to be regenerated', 'info');
            
            // If we have a composite image, suggest regenerating .mind file
            if (projectData.compositeDesignUrl) {
              addDebugMessage('🔄 Attempting to use composite image as fallback...', 'warning');
              
              // Update target to use composite image instead
              targetUrl = projectData.compositeDesignUrl;
              targetType = 'image file';
              mindBuffer = null;
              mindarConfig.imageTargetSrc = targetUrl;
              
              // Try again with image
              try {
                mindar = new window.MindARThree.MindARThree(mindarConfig);
                mindarRef.current = mindar;
                addDebugMessage('✅ MindAR instance created with fallback composite image', 'success');
              } catch (fallbackError) {
                addDebugMessage(`❌ Fallback also failed: ${fallbackError.message}`, 'error');
                throw new Error(
                  'AR tracking failed: .mind file is corrupted and image fallback also failed. ' +
                  'Please regenerate the .mind file by going back to Step 2: Save QR Position.'
                );
              }
            } else {
              throw new Error(
                'AR tracking failed: .mind file is corrupted. ' +
                'Please regenerate it by going back to Step 2: Save QR Position.'
              );
            }
          } else {
            // Image file buffer error - MindAR is trying to process image as buffer
            addDebugMessage('❌ Image processing error: MindAR requires a .mind file for reliable tracking', 'error');
            addDebugMessage('💡 Please generate a .mind file from your composite image', 'info');
            addDebugMessage('🔧 Go back to Step 2: Save QR Position to generate the .mind file', 'info');
            
            throw new Error(
              'AR tracking requires a .mind file. ' +
              'Please go back to Step 2: Save QR Position to generate the required .mind file.'
            );
          }
        } else {
          throw new Error(`MindAR creation failed: ${mindarError.message}`);
        }
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
      
      // HIGH QUALITY renderer settings for crisp video display
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Use device pixel ratio but cap at 2x for performance
      renderer.sortObjects = true; // Enable object sorting for better transparency handling
      
      // Log renderer quality settings
      addDebugMessage(`🎨 Renderer pixel ratio: ${renderer.getPixelRatio()}x`, 'info');
      addDebugMessage(`🎨 Device pixel ratio: ${window.devicePixelRatio}x`, 'info');
      
      // Ensure we're using the same THREE instance as MindAR
      if (window.THREE && window.THREE.WebGLRenderer) {
        addDebugMessage('✅ Using shared THREE.js instance', 'success');
      }
      
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      
      addDebugMessage('✅ MindAR objects validated and assigned', 'success');

      const anchor = mindar.addAnchor(0);
      anchorRef.current = anchor;
      
      // Configure anchor for better visibility
      anchor.group.visible = true;
      
      // DO NOT add ambient light - causes material.onBuild error with MindAR's Three.js

      if (projectData.videoUrl) {
        await setupVideo(anchor);
      }

      // Note: Using animation loop instead of onTargetFound/onTargetLost callbacks
      // The animation loop continuously checks anchor.visible (more reliable than callbacks)

      // Start MindAR
      addDebugMessage('🚀 Starting MindAR...', 'info');
      
      // Request camera permission explicitly before starting MindAR
      try {
        addDebugMessage('📷 Requesting camera permission...', 'info');
        
        // Detect device type and get appropriate camera constraints
        const isMobile = isMobileDevice();
        addDebugMessage(`📱 Device type: ${isMobile ? 'Mobile' : 'Desktop'}`, 'info');
        
        // Get camera constraints - use exact for initial request
        const videoConstraints = getCameraConstraints(true);
        addDebugMessage(`🎥 Camera constraints: ${JSON.stringify(videoConstraints)}`, 'info');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: false
        });
        setCameraPermissionRequired?.(false);
        setCameraPermissionBlocked?.(false);
        setCameraPermissionDismissed?.(false);
        addDebugMessage('✅ Camera permission granted', 'success');
        addDebugMessage(`📹 Camera stream: ${stream.getVideoTracks().length} video track(s)`, 'info');
        
        // Log camera settings
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        addDebugMessage(`📷 Camera settings: ${settings.width}x${settings.height}, facing: ${settings.facingMode || 'unknown'}`, 'info');
        
        // Stop the test stream as MindAR will handle the camera
        stream.getTracks().forEach(track => track.stop());
        addDebugMessage('✅ Test stream stopped, MindAR will now initialize camera', 'success');
      } catch (permissionError) {
        addDebugMessage(`❌ Camera permission denied: ${permissionError.message}`, 'error');
        setCameraPermissionRequired?.(true);
        setError(null);
        const message = (permissionError?.message || '').toLowerCase();
        const dismissed = message.includes('dismissed');
        if (dismissed) {
          setCameraPermissionDismissed?.(true);
          setCameraPermissionBlocked?.(false);
        } else {
          setCameraPermissionBlocked?.(true);
          setCameraPermissionDismissed?.(false);
        }
        
        // If exact back camera fails on mobile, try with ideal constraint
        if (permissionError.name === 'OverconstrainedError') {
          addDebugMessage('🔄 Retrying with relaxed constraints...', 'warning');
          try {
            // Use ideal constraints instead of exact
            const relaxedConstraints = getCameraConstraints(false);
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: relaxedConstraints,
              audio: false
            });
            stream.getTracks().forEach(track => track.stop());
            setCameraPermissionRequired?.(false);
            setCameraPermissionBlocked?.(false);
            setCameraPermissionDismissed?.(false);
            addDebugMessage('✅ Camera permission granted with relaxed constraints', 'success');
          } catch (retryError) {
            addDebugMessage(`❌ Retry failed: ${retryError.message}`, 'error');
            setCameraPermissionRequired?.(true);
            setCameraPermissionBlocked?.(true);
            setCameraPermissionDismissed?.(false);
            return false;
          }
        } else {
          return false;
        }
      }
      
      try {
        // ✅ CRITICAL: Start MindAR WITHOUT its auto-render loop
        // We'll set up our own loop that includes video control
        await mindar.start();
        addDebugMessage('✅ MindAR started successfully', 'success');
        
        // ✅ Stop MindAR's default animation loop (if it started one)
        // We'll create our own that includes both rendering and video control
        renderer.setAnimationLoop(null);
        addDebugMessage('🛑 Stopped MindAR default loop', 'info');
        
        // ✅ CRITICAL: Custom animation frame loop for video control
        // We use requestAnimationFrame instead of renderer.setAnimationLoop
        // to avoid conflicts with MindAR's internal rendering
        
        // Track previous state to avoid logging every frame
        let wasTargetVisible = false;
        let hasBeenPausedThisCycle = false; // Prevent double-pausing when target is lost
        
        const animateVideoControl = () => {
          const isTargetVisible = anchorRef.current && anchorRef.current.visible;
          
          // Reset pause flag when target becomes visible again
          if (isTargetVisible && !wasTargetVisible) {
            hasBeenPausedThisCycle = false;
          }
          
          // ✅ CRITICAL: Update video texture every frame when video is playing
          // This ensures the video texture reflects the current video frame
          if (videoMeshRef.current && videoRef.current && !videoRef.current.paused) {
            if (videoMeshRef.current.material && videoMeshRef.current.material.map) {
              videoMeshRef.current.material.map.needsUpdate = true;
            }
          }
          
          if (isTargetVisible) {
            // ✅ Target is detected - show video mesh AND play video
            // This matches the working code pattern exactly
            
            // Prepare video mesh (but don't show yet - will show after seek completes)
            if (videoMeshRef.current && !videoMeshRef.current.visible) {
              const timestamp = new Date().toLocaleTimeString();
              console.log(`👁️ [${timestamp}] Target detected, preparing video mesh`);
              console.log(`📊 [${timestamp}] Video mesh info:`, {
                visible: videoMeshRef.current.visible,
                position: videoMeshRef.current.position,
                scale: videoMeshRef.current.scale,
                hasTexture: !!videoMeshRef.current.material?.map,
                videoPlaying: videoRef.current && !videoRef.current.paused,
                videoCurrentTime: videoRef.current ? videoRef.current.currentTime : 0
              });
              // NOTE: Mesh visibility will be set by the seek/play logic below
              
              // Check if video element was destroyed and needs to be recreated
              if (!videoRef.current && videoMeshRef.current.material && videoMeshRef.current.material.map) {
                console.log(`🔧 [${timestamp}] Video element lost, attempting to recover from texture...`);
                // Try to get the video element from the texture
                const texture = videoMeshRef.current.material.map;
                if (texture.image && texture.image.tagName === 'VIDEO') {
                  videoRef.current = texture.image;
                  console.log(`✅ [${timestamp}] Recovered video element from texture`);
                  
                  // CRITICAL: Check if recovered video is playing when it shouldn't be
                  if (!videoRef.current.paused) {
                    // Video is playing but should be paused, save current time and pause it
                    savedVideoTimeRef.current = videoRef.current.currentTime;
                    videoRef.current.pause();
                    console.log(`⏸️ [${timestamp}] Recovered video was playing unexpectedly - paused at ${savedVideoTimeRef.current.toFixed(2)}s`);
                  }
                } else {
                  console.warn(`⚠️ [${timestamp}] WARNING: Could not recover video element!`);
                }
              }
              
              // Debug: Check video state immediately after target detection
              if (videoRef.current) {
                console.log(`🎬 [${timestamp}] Video state at detection:`, {
                  paused: videoRef.current.paused,
                  currentTime: videoRef.current.currentTime.toFixed(2),
                  savedTime: savedVideoTimeRef.current.toFixed(2),
                  readyState: videoRef.current.readyState
                });
              } else {
                console.log(`⚠️ [${timestamp}] WARNING: videoRef.current is null/undefined and could not be recovered!`);
              }
            }
            
            // Play video if paused (resume from saved time)
            // CRITICAL: Prevent multiple simultaneous resume attempts
            if (videoRef.current && videoRef.current.paused && !isResuming.current) {
              isResuming.current = true; // Mark as resuming
              const timestamp = new Date().toLocaleTimeString();
              
              // Debug: Log video state before resume attempt
              console.log(`🔍 [${timestamp}] Attempting to resume video:`, {
                paused: true,
                currentTime: videoRef.current.currentTime.toFixed(2),
                savedTime: savedVideoTimeRef.current.toFixed(2),
                readyState: videoRef.current.readyState,
                hasVideoRef: !!videoRef.current
              });
              
              // CRITICAL: Hide video mesh during entire resume process
              if (videoMeshRef.current) {
                videoMeshRef.current.visible = false;
                if (savedVideoTimeRef.current > 0.1) {
                  console.log(`🙈 [${timestamp}] Hiding video mesh during resume to prevent frame 0 flash`);
                }
              }
              
              console.log(`▶️ [${timestamp}] Starting video playback...`);
              
              // CRITICAL: On mobile, seeking a PAUSED video doesn't work reliably
              // Solution: Play FIRST, then seek WHILE PLAYING, then show mesh
              videoRef.current.play().then(() => {
                // Clear resume flag after successful play
                isResuming.current = false;
                const playTimestamp = new Date().toLocaleTimeString();
                console.log(`✅ [${playTimestamp}] Video play() resolved, currentTime: ${videoRef.current.currentTime.toFixed(2)}s`);
                
                // CRITICAL: Wait for video decoder to stabilize BEFORE seeking
                // Mobile browsers need 100-200ms after play() before they accept seeks
                const targetTime = savedVideoTimeRef.current;
                // ALWAYS seek if targetTime > 0 to force texture update, even if currentTime is close
                if (targetTime > 0.5) { // Only skip seek if very beginning of video
                  console.log(`⏳ [${playTimestamp}] Waiting 150ms for decoder to stabilize before seeking to ${targetTime.toFixed(2)}s...`);
                  
                  // Wait for decoder to stabilize, THEN seek
                  setTimeout(() => {
                    if (!videoRef.current || videoRef.current.paused) {
                      console.warn(`⚠️ Video paused before seek could execute`);
                      return;
                    }
                    
                    const beforeSeek = videoRef.current.currentTime;
                    console.log(`⏩ [${new Date().toLocaleTimeString()}] Seeking from ${beforeSeek.toFixed(2)}s to ${targetTime.toFixed(2)}s (decoder ready)...`);
                    
                    try {
                      videoRef.current.currentTime = targetTime;
                    
                    // Poll until seek completes, then show mesh
                    let seekAttempts = 0;
                    const maxSeekAttempts = 30; // 600ms max wait
                    
                    const waitForSeek = () => {
                      seekAttempts++;
                      
                      if (!videoRef.current || !videoMeshRef.current) {
                        return; // Aborted
                      }
                      
                      const currentTime = videoRef.current.currentTime;
                      const diff = Math.abs(currentTime - targetTime);
                      const ts = new Date().toLocaleTimeString();
                      
                      if (diff < 0.5 || seekAttempts >= maxSeekAttempts) {
                        // Seek complete (or timeout), show mesh
                        const material = videoMeshRef.current.material;
                        if (material && material.map) {
                          for (let i = 0; i < 5; i++) {
                            material.map.needsUpdate = true;
                          }
                        }
                        videoMeshRef.current.visible = true;
                        
                        if (diff < 0.5) {
                          console.log(`👁️ [${ts}] Seek complete after ${seekAttempts * 20}ms - showing mesh at ${currentTime.toFixed(2)}s (target: ${targetTime.toFixed(2)}s)`);
                        } else {
                          console.warn(`⚠️ [${ts}] Seek timeout after ${seekAttempts * 20}ms - showing mesh anyway at ${currentTime.toFixed(2)}s (target: ${targetTime.toFixed(2)}s, diff: ${diff.toFixed(2)}s)`);
                        }
                      } else {
                        // Still seeking, check again
                        setTimeout(waitForSeek, 20);
                      }
                    };
                    
                      // Start checking after 50ms
                      setTimeout(waitForSeek, 50);
                      
                    } catch (seekError) {
                      console.error(`❌ [${new Date().toLocaleTimeString()}] Seek error:`, seekError);
                      // Show mesh anyway on error
                      if (videoMeshRef.current) {
                        videoMeshRef.current.visible = true;
                      }
                    }
                  }, 150); // Wait 150ms for decoder to stabilize
                } else {
                  // No seek needed, but WAIT for video to actually render correct frame
                  const expectedTime = targetTime;
                  console.log(`👁️ [${playTimestamp}] No seek needed (at ${videoRef.current.currentTime.toFixed(2)}s), but waiting for texture to render...`);
                  
                  // Poll to ensure video has moved past frame 0 and texture has updated
                  let renderAttempts = 0;
                  const maxRenderAttempts = 25; // 500ms max
                  
                  const waitForRender = () => {
                    renderAttempts++;
                    
                    if (!videoRef.current || !videoMeshRef.current) {
                      return; // Aborted
                    }
                    
                    const currentTime = videoRef.current.currentTime;
                    const ts = new Date().toLocaleTimeString();
                    
                    // For first play (expectedTime = 0), just show after short delay
                    // For resume, wait until currentTime is close to expected
                    const isCloseEnough = expectedTime === 0 ? 
                      renderAttempts >= 5 : // First play: just wait 100ms (5 * 20ms)
                      Math.abs(currentTime - expectedTime) < 1.0; // Resume: within 1 second
                    
                    if (isCloseEnough || renderAttempts >= maxRenderAttempts) {
                      const material = videoMeshRef.current.material;
                      if (material && material.map) {
                        for (let i = 0; i < 5; i++) {
                          material.map.needsUpdate = true;
                        }
                      }
                      videoMeshRef.current.visible = true;
                      console.log(`👁️ [${ts}] Texture ready after ${renderAttempts * 20}ms - showing mesh at ${currentTime.toFixed(2)}s (expected: ${expectedTime.toFixed(2)}s)`);
                    } else {
                      // Not ready yet, check again
                      setTimeout(waitForRender, 20);
                    }
                  };
                  
                  // Start checking after 50ms
                  setTimeout(waitForRender, 50);
                }
                
                // Track video view when video starts playing (using global deduplication)
                if (trackAnalytics && !videoViewTrackedRef.current) {
                  console.log('🎬 Video playing, checking if should track...', {
                    userId: userId || projectId,
                    projectId: projectId,
                    hasTrackAnalytics: !!trackAnalytics
                  });
                  
                  // Use global deduplication utility
                  if (shouldTrackAnalytics('videoView', userId || projectId, projectId)) {
                    videoViewTrackedRef.current = true;
                    console.log('📊 Tracking video view in AR experience', {
                      userId: userId || projectId,
                      projectId: projectId,
                      videoDuration: videoRef.current?.duration || 0
                    });
                    
                    trackAnalytics('videoView', {
                      source: 'ar_experience',
                      videoProgress: 0,
                      videoDuration: videoRef.current?.duration || 0
                    }).then(() => {
                      console.log('✅ Video view tracked successfully');
                    }).catch(err => {
                      console.error('❌ Video view tracking failed:', err);
                      console.error('Error details:', {
                        message: err.message,
                        stack: err.stack,
                        userId: userId || projectId,
                        projectId: projectId
                      });
                      // Mark as failed so it can be retried
                      videoViewTrackedRef.current = false;
                      markAnalyticsFailed('videoView', userId || projectId, projectId);
                    });
                  } else {
                    console.log('ℹ️ Video view already tracked, skipping duplicate');
                    videoViewTrackedRef.current = true; // Still mark as tracked locally
                  }
                } else if (!trackAnalytics) {
                  console.warn('⚠️ trackAnalytics function is not available');
                } else if (videoViewTrackedRef.current) {
                  console.log('ℹ️ Video view already tracked (ref)');
                }
              }).catch(e => {
                // Clear resume flag even on error
                isResuming.current = false;
                console.log(`⚠️ [${timestamp}] Auto-play failed:`, e.message);
                addDebugMessage('💡 Tap the screen to allow video playback', 'info');
              });
            }
            
            // Only log when state CHANGES (not every frame)
            if (!wasTargetVisible) {
              wasTargetVisible = true;
              const timestamp = new Date().toLocaleTimeString();
              console.log(`🎯 [${timestamp}] TARGET DETECTED`);
              addDebugMessage('🎯 Target detected!', 'success');
              setTargetDetected(true);
            }
            
          } else {
            // ✅ Target is lost - hide video mesh AND pause video
            // This matches the working code pattern exactly
            
            // Hide video mesh
            if (videoMeshRef.current && videoMeshRef.current.visible) {
              videoMeshRef.current.visible = false;
              const timestamp = new Date().toLocaleTimeString();
              console.log(`👁️ [${timestamp}] Video mesh hidden`);
            }
            
            // Pause video and save current time for resume
            // Only pause if we haven't already paused in this target-lost cycle
            if (!hasBeenPausedThisCycle) {
              // CRITICAL: Always pause via the texture's video element (most reliable)
              let videoElement = null;
              
              // First, try to get from texture (most reliable source)
              if (videoMeshRef.current && videoMeshRef.current.material && videoMeshRef.current.material.map) {
                const texture = videoMeshRef.current.material.map;
                if (texture.image && texture.image.tagName === 'VIDEO') {
                  videoElement = texture.image;
                  // Restore videoRef if it was lost
                  if (!videoRef.current) {
                    videoRef.current = videoElement;
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`🔧 [${timestamp}] Recovered video ref from texture before pausing`);
                  }
                }
              }
              
              // Fallback to videoRef if texture doesn't have it
              if (!videoElement && videoRef.current) {
                videoElement = videoRef.current;
              }
              
              // Pause the video ONCE if it's playing (this ensures the actual element is paused)
              if (videoElement && !videoElement.paused) {
                // Save current time before pausing
                savedVideoTimeRef.current = videoElement.currentTime;
                videoElement.pause();
                hasBeenPausedThisCycle = true; // Mark as paused to prevent double-pause
                
                // Double-check the pause took effect
                if (videoElement.paused) {
                  const timestamp = new Date().toLocaleTimeString();
                  console.log(`⏸️ [${timestamp}] Video paused successfully (saved time: ${savedVideoTimeRef.current.toFixed(2)}s)`);
                  addDebugMessage(`⏸️ Video paused at ${savedVideoTimeRef.current.toFixed(1)}s`, 'info');
                } else {
                  const timestamp = new Date().toLocaleTimeString();
                  console.warn(`⚠️ [${timestamp}] WARNING: Video pause failed! Forcing pause...`);
                  // Force pause again
                  videoElement.pause();
                  console.log(`⏸️ [${timestamp}] Video force-paused (saved time: ${savedVideoTimeRef.current.toFixed(2)}s)`);
                  addDebugMessage(`⏸️ Video paused at ${savedVideoTimeRef.current.toFixed(1)}s`, 'info');
                }
              }
            }
            
            // Only log when state CHANGES (not every frame)
            if (wasTargetVisible) {
              wasTargetVisible = false;
              // Reset resume flag when target is lost
              isResuming.current = false;
              const timestamp = new Date().toLocaleTimeString();
              console.log(`🔍 [${timestamp}] TARGET LOST`);
              addDebugMessage('🔍 Target lost', 'warning');
              setTargetDetected(false);
              setVideoPlaying(false);
            }
          }
          
          // No need to call requestAnimationFrame - renderer.setAnimationLoop handles this
        };
        
        // ✅ CRITICAL: Set up our own render loop that includes BOTH rendering AND video control
        // This is exactly how the working code does it
        renderer.setAnimationLoop(() => {
          // Update video control (show/hide mesh, play/pause video)
          animateVideoControl();
          
          // ✅ HIGH QUALITY: Update video texture every frame for smooth playback
          if (videoMeshRef.current && videoRef.current && !videoRef.current.paused) {
            const material = videoMeshRef.current.material;
            if (material && material.map) {
              material.map.needsUpdate = true; // Critical for smooth video frames
            }
          }
          
          // Render the scene (this actually draws everything to the screen)
          renderer.render(scene, camera);
        });
        
        addDebugMessage('🔄 Combined render + video control loop started', 'success');
        
        // Log MindAR tracking status
        console.log('🔍 MindAR tracking info:', {
          maxTrack: mindar.maxTrack,
          anchors: mindar.anchors?.length || 0,
          hasOnTargetFound: typeof mindar.onTargetFound === 'function',
          hasOnTargetLost: typeof mindar.onTargetLost === 'function'
        });
      
      addDebugMessage('🎯 MindAR is now tracking. Point camera at the COMPOSITE IMAGE (with QR code)', 'info');
      addDebugMessage('💡 TIP: Use the image downloaded from Step 5 (Final Design)', 'info');
      
      // Add a test to simulate target detection (for debugging)
      window.testTargetDetection = () => {
        console.log('🧪 Testing target detection manually...');
        if (anchorRef.current) {
          anchorRef.current.visible = true;
          console.log('✅ Manually set anchor.visible = true');
        }
      };
      
      console.log('🧪 Debug: Run window.testTargetDetection() to test video overlay');
      addDebugMessage('🧪 Test command available: window.testTargetDetection()', 'info');
        
      } catch (startError) {
        // Check if it's the buffer corruption error (happens when MindAR tries to process image as .mind file)
        const isBufferError = startError.message && (
          startError.message.includes('Extra') && startError.message.includes('byte') ||
          startError.message.includes('RangeError') ||
          startError.stack?.includes('addImageTargetsFromBuffer')
        );
        
        if (isBufferError) {
          addDebugMessage('❌ MindAR failed to start: Target format error', 'error');
          addDebugMessage('🔍 Error type: Buffer corruption (image being processed as .mind file)', 'error');
          
          if (targetType === 'image file') {
            addDebugMessage('⚠️ Image files require conversion to .mind format', 'warning');
            addDebugMessage('💡 MindAR cannot reliably process images directly - .mind file required', 'info');
            addDebugMessage('🔧 Solution: Generate .mind file from composite image', 'info');
            addDebugMessage('📋 Go back to Step 2: Save QR Position to generate .mind file', 'info');
            
            setError(
              'AR tracking requires a .mind file. ' +
              'The composite image needs to be converted to a .mind file format. ' +
              'Please go back to Step 2: Save QR Position to generate the required .mind file.'
            );
          } else if (targetType === '.mind file') {
            addDebugMessage('⚠️ .mind file appears to be corrupted', 'error');
            addDebugMessage('💡 The .mind file may need to be regenerated', 'info');
            addDebugMessage('🔧 Solution: Regenerate .mind file from composite image', 'info');
            
            setError(
              'AR tracking failed: The .mind file appears to be corrupted. ' +
              'Please go back to Step 2: Save QR Position to regenerate the .mind file.'
            );
          } else {
            setError(
              'AR tracking failed: Invalid target format. ' +
              'Please ensure a valid .mind file is generated from your composite image.'
            );
          }
          
          throw startError; // Re-throw to stop initialization
        } else {
          addDebugMessage(`❌ MindAR failed to start: ${startError.message}`, 'error');
          addDebugMessage(`🔍 Error stack: ${startError.stack?.substring(0, 200)}...`, 'info');
          throw new Error(`MindAR start failed: ${startError.message}`);
        }
      }
      
      // Mark camera as active immediately after start
      setCameraActive(true);
      addDebugMessage('✅ Camera marked as active', 'success');
      
      // Give MindAR a moment to create the canvas and video
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force check for canvas multiple times
      let attempts = 0;
      const maxAttempts = 5;
      let canvas = null;
      
      while (attempts < maxAttempts && !canvas) {
        canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) {
          addDebugMessage(`🔍 Canvas check attempt ${attempts + 1}/${maxAttempts} - not found yet`, 'info');
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }
      
      // Debug: Check what MindAR created
      addDebugMessage('🔍 Checking MindAR elements...', 'info');
      
      const allElements = containerRef.current?.children || [];
      addDebugMessage(`📊 Total children in container: ${allElements.length}`, 'info');
      
      // List all child elements
      Array.from(allElements).forEach((element, index) => {
        addDebugMessage(`📍 Child ${index}: ${element.tagName} (${element.className})`, 'info');
      });
      
      // Check for canvas (reuse the canvas variable from above)
      if (canvas) {
        addDebugMessage(`✅ Canvas found: ${canvas.width}x${canvas.height}`, 'success');
        addDebugMessage(`📍 Canvas position: ${canvas.style.position}`, 'info');
        addDebugMessage(`📍 Canvas z-index: ${canvas.style.zIndex}`, 'info');
        
        // Ensure canvas is visible
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '10'; // Higher z-index to ensure it's visible
        canvas.style.backgroundColor = 'transparent';
        
        // Also ensure the video element is visible and properly configured for mobile
        const video = containerRef.current?.querySelector('video');
        if (video) {
          video.style.position = 'absolute';
          video.style.top = '0';
          video.style.left = '0';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.zIndex = '5'; // Behind canvas but above background
          video.style.objectFit = 'cover';
          
          // Add mobile-specific attributes if not already set
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
          
          addDebugMessage('🔧 Video element styling and mobile attributes applied', 'info');
        }
        
        addDebugMessage('🔧 Canvas styling applied', 'info');
      } else {
        addDebugMessage('❌ No canvas found in container!', 'error');
        
        // Try to find video element
        const video = containerRef.current?.querySelector('video');
        if (video) {
          addDebugMessage(`✅ Video element found: ${video.videoWidth}x${video.videoHeight}`, 'success');
          // Style video element with mobile support
          video.style.position = 'absolute';
          video.style.top = '0';
          video.style.left = '0';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.zIndex = '1';
          video.style.objectFit = 'cover';
          
          // Add mobile-specific attributes
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.setAttribute('muted', '');
          video.setAttribute('autoplay', '');
          video.muted = true;
          video.autoplay = true;
          
          addDebugMessage('🔧 Video element mobile attributes applied', 'info');
        } else {
          addDebugMessage('❌ No video element found either!', 'error');
          
          // Check if MindAR created any other elements
          const mindarElements = containerRef.current?.querySelectorAll('[class*="mindar"], [id*="mindar"]');
          if (mindarElements && mindarElements.length > 0) {
            addDebugMessage(`🔍 Found ${mindarElements.length} MindAR elements`, 'info');
            mindarElements.forEach((el, i) => {
              addDebugMessage(`📍 MindAR element ${i}: ${el.tagName} (${el.className || el.id})`, 'info');
            });
          } else {
            addDebugMessage('⚠️ MindAR may not have created any visual elements', 'warning');
            addDebugMessage('🔧 This could indicate a MindAR configuration issue', 'info');
            
            // Try to manually access the camera stream
            try {
              addDebugMessage('🔧 Attempting to access camera stream directly...', 'info');
              
              // Get appropriate camera constraints for this device
              const videoConstraints = getCameraConstraints(false);
              
              const stream = await navigator.mediaDevices.getUserMedia({ 
                video: videoConstraints,
                audio: false
              });
              
              // Create a video element manually
              const video = document.createElement('video');
              video.srcObject = stream;
              video.autoplay = true;
              video.muted = true;
              video.playsInline = true;
              video.setAttribute('playsinline', ''); // iOS requirement
              video.setAttribute('webkit-playsinline', ''); // Older iOS
              video.setAttribute('muted', ''); // Mobile autoplay requirement
              video.style.position = 'absolute';
              video.style.top = '0';
              video.style.left = '0';
              video.style.width = '100%';
              video.style.height = '100%';
              video.style.zIndex = '1';
              video.style.objectFit = 'cover';
              video.style.transform = 'scaleX(-1)'; // Mirror for front camera if needed
              
              // Ensure video plays on mobile
              video.addEventListener('loadedmetadata', () => {
                video.play().catch(err => {
                  addDebugMessage(`⚠️ Video autoplay failed: ${err.message}`, 'warning');
                });
              });
              
              containerRef.current.appendChild(video);
              addDebugMessage('✅ Manual video element created and added', 'success');
              
            } catch (streamError) {
              addDebugMessage(`❌ Failed to create manual video: ${streamError.message}`, 'error');
            }
          }
        }
      }
      
      // Check container dimensions
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        addDebugMessage(`📍 Container dimensions: ${containerRect.width}x${containerRect.height}`, 'info');
      }
      
      // Ensure camera is active and AR is ready
      setCameraActive(true);
      setArReady(true);
      setIsInitialized(true);
      
      // Expose debug helpers
      window.debugAR = {
        showVideoMesh: () => {
          if (videoMeshRef.current) {
            videoMeshRef.current.visible = true;
            console.log('✅ Video mesh manually shown');
            return 'Video mesh is now visible';
          }
          return 'Video mesh not available';
        },
        hideVideoMesh: () => {
          if (videoMeshRef.current) {
            videoMeshRef.current.visible = false;
            console.log('✅ Video mesh manually hidden');
            return 'Video mesh is now hidden';
          }
          return 'Video mesh not available';
        },
        playVideo: async () => {
          if (videoRef.current) {
            try {
              await videoRef.current.play();
              console.log('✅ Video manually started');
              return 'Video playing';
            } catch (err) {
              console.error('❌ Video play failed:', err);
              return `Error: ${err.message}`;
            }
          }
          return 'Video not available';
        },
        getVideoMeshInfo: () => {
          if (videoMeshRef.current) {
            return {
              visible: videoMeshRef.current.visible,
              position: videoMeshRef.current.position,
              renderOrder: videoMeshRef.current.renderOrder,
              material: {
                opacity: videoMeshRef.current.material.opacity,
                transparent: videoMeshRef.current.material.transparent,
                depthTest: videoMeshRef.current.material.depthTest,
                depthWrite: videoMeshRef.current.material.depthWrite
              }
            };
          }
          return 'Video mesh not available';
        },
        getAnchorInfo: () => {
          if (anchorRef.current) {
            return {
              visible: anchorRef.current.group.visible,
              children: anchorRef.current.group.children.length,
              position: anchorRef.current.group.position
            };
          }
          return 'Anchor not available';
        }
      };
      
      console.log('🛠️ Debug helpers available: window.debugAR');
      addDebugMessage('🛠️ Debug helpers: window.debugAR.showVideoMesh(), window.debugAR.playVideo()', 'info');
      
      // On mobile, if we still don't have a visible video element, force create one
      const isMobile = isMobileDevice();
      if (isMobile) {
        addDebugMessage('📱 Mobile device detected - verifying video visibility...', 'info');
        
        // Wait a bit more for MindAR to fully initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for ALL video elements
        const allVideos = containerRef.current?.querySelectorAll('video');
        addDebugMessage(`🔍 Found ${allVideos?.length || 0} video element(s) in container`, 'info');
        
        if (allVideos && allVideos.length > 0) {
          Array.from(allVideos).forEach((vid, index) => {
            addDebugMessage(`📹 Video ${index}: ${vid.videoWidth}x${vid.videoHeight}, paused=${vid.paused}, srcObject=${!!vid.srcObject}`, 'info');
          });
        }
        
        const video = containerRef.current?.querySelector('video');
        if (!video) {
          addDebugMessage('⚠️ No video element found on mobile - creating manual stream...', 'warning');
          
          try {
            // Get camera stream again
            const videoConstraints = getCameraConstraints(false);
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: videoConstraints,
              audio: false
            });
            
            // Create video element manually
            const manualVideo = document.createElement('video');
            manualVideo.srcObject = stream;
            manualVideo.autoplay = true;
            manualVideo.muted = true;
            manualVideo.playsInline = true;
            manualVideo.setAttribute('playsinline', '');
            manualVideo.setAttribute('webkit-playsinline', '');
            manualVideo.setAttribute('muted', '');
            manualVideo.setAttribute('autoplay', '');
            
            // Style for full visibility
            manualVideo.style.position = 'absolute';
            manualVideo.style.top = '0';
            manualVideo.style.left = '0';
            manualVideo.style.width = '100%';
            manualVideo.style.height = '100%';
            manualVideo.style.objectFit = 'cover';
            manualVideo.style.zIndex = '1';
            
            // Add to container
            containerRef.current.insertBefore(manualVideo, containerRef.current.firstChild);
            
            // Force play
            await manualVideo.play().catch(err => {
              addDebugMessage(`⚠️ Manual video play failed: ${err.message}`, 'warning');
            });
            
            addDebugMessage('✅ Manual video stream created and playing', 'success');
          } catch (streamError) {
            addDebugMessage(`❌ Failed to create manual video stream: ${streamError.message}`, 'error');
          }
        } else {
          // Video exists, ensure it's visible and playing
          addDebugMessage('✅ Video element found - ensuring visibility...', 'success');
          
          // Log current video state before modifications
          addDebugMessage(`📹 Video current state: width=${video.videoWidth}, height=${video.videoHeight}, paused=${video.paused}, srcObject=${!!video.srcObject}`, 'info');
          addDebugMessage(`📹 Video style: display=${video.style.display}, visibility=${video.style.visibility}, opacity=${video.style.opacity}`, 'info');
          
          video.style.position = 'absolute';
          video.style.top = '0';
          video.style.left = '0';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'cover';
          video.style.zIndex = '1';
          video.style.display = 'block';
          video.style.visibility = 'visible';
          video.style.opacity = '1';
          
          // Ensure mobile attributes are set
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.setAttribute('muted', '');
          video.setAttribute('autoplay', '');
          video.muted = true;
          video.autoplay = true;
          
          // Check if video has a stream
          if (!video.srcObject) {
            addDebugMessage('⚠️ Video element has no srcObject - may not have camera stream!', 'warning');
          }
          
          // Force play
          if (video.paused) {
            addDebugMessage('🎬 Video is paused, attempting to play...', 'info');
            try {
              await video.play();
              addDebugMessage('✅ Video play succeeded', 'success');
            } catch (err) {
              addDebugMessage(`❌ Video play failed: ${err.message}`, 'error');
            }
          } else {
            addDebugMessage('✅ Video is already playing', 'success');
          }
          
          // Log final state
          addDebugMessage(`📹 Video final state: ${video.videoWidth}x${video.videoHeight}, paused: ${video.paused}, readyState: ${video.readyState}`, 'info');
        }
      }
      
      return true;

    } catch (error) {
      addDebugMessage(`❌ MindAR initialization failed: ${error.message}`, 'error');
      setError(`AR initialization failed: ${error.message}`);
      return false;
    }
  }, [librariesLoaded, projectData, isInitialized, addDebugMessage, setError, setCameraActive, setArReady, setIsInitialized, setTargetDetected, setVideoPlaying, setupVideo]);

  // Start AR scanning
  const startScanning = useCallback(async () => {
    if (isScanning || !isInitialized) return;

    try {
      addDebugMessage('📱 Starting AR scan...', 'info');
      setIsScanning(true);
      setError(null);

      // MindAR is already started during initialization, just set scanning state
      addDebugMessage('✅ AR scanning active', 'success');

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
        setVideoPlaying(false); // Use direct setter for immediate response
        addDebugMessage('⏸️ Video paused by user', 'info');
      } else {
        const playPromise = videoRef.current.play();

        if (playPromise !== undefined) {
          try {
            await playPromise;
            setVideoPlaying(true); // Use direct setter for immediate response
            addDebugMessage('▶️ Video started by user', 'success');
          } catch (playError) {
            if (playError.name === 'NotAllowedError') {
              addDebugMessage('⚠️ Autoplay blocked, trying with muted...', 'warning');
              videoRef.current.muted = true;
              try {
                await videoRef.current.play();
                setVideoPlaying(true); // Use direct setter for immediate response
                addDebugMessage('▶️ Video started with muted fallback', 'success');
              } catch (mutedError) {
                addDebugMessage(`❌ Video play failed even with muted: ${mutedError.message}`, 'error');
                throw mutedError;
              }
            } else {
              addDebugMessage(`❌ Video play failed: ${playError.message}`, 'error');
              throw playError;
            }
          }
        }
      }
    } catch (error) {
      addDebugMessage(`❌ Video toggle failed: ${error.message}`, 'error');
    }
  }, [videoPlaying, targetDetected, setVideoPlaying, addDebugMessage]);

  // Toggle video mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    videoRef.current.muted = !videoRef.current.muted;
    // Update the videoMuted state in the parent component
    safeSetVideoMuted(videoRef.current.muted);
    addDebugMessage(`🔊 Video ${videoRef.current.muted ? 'muted' : 'unmuted'}`, 'info');
  }, [addDebugMessage, safeSetVideoMuted]);

  // Cleanup function
  const cleanupAR = useCallback(async () => {
    addDebugMessage('🧹 Cleaning up AR resources...', 'info');
    
    try {
      // Stop MindAR first
      if (mindarRef.current) {
        await mindarRef.current.stop();
        mindarRef.current = null;
      }
      
      // Clean up video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
        videoRef.current = null;
      }
      
      // Clean up video mesh
      if (videoMeshRef.current) {
        try {
          if (videoMeshRef.current.material && videoMeshRef.current.material.map) {
            videoMeshRef.current.material.map.dispose();
          }
          
          if (videoMeshRef.current.material) {
            videoMeshRef.current.material.dispose();
          }
          
          if (sceneRef.current && videoMeshRef.current.parent) {
            sceneRef.current.remove(videoMeshRef.current);
          }
          
          if (videoMeshRef.current.geometry) {
            videoMeshRef.current.geometry.dispose();
          }
        } catch (error) {
          console.warn('Error disposing video mesh:', error);
        }
        videoMeshRef.current = null;
      }
      
      // Clean up renderer and WebGL context
      if (rendererRef.current) {
        try {
          // Dispose of the renderer to free WebGL context
          rendererRef.current.dispose();
          // Clear the canvas
          const canvas = rendererRef.current.domElement;
          if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
        } catch (error) {
          console.warn('Error disposing renderer:', error);
        }
        rendererRef.current = null;
      }
      
      // Clean up blob URL if it exists
      if (blobURLRef.current) {
        URL.revokeObjectURL(blobURLRef.current);
        addDebugMessage('🗑️ Blob URL revoked', 'info');
        blobURLRef.current = null;
      }
      
      // Clear other refs
      sceneRef.current = null;
      cameraRef.current = null;
      anchorRef.current = null;
      
      addDebugMessage('✅ AR cleanup completed', 'info');
    } catch (error) {
      addDebugMessage(`❌ Cleanup error: ${error.message}`, 'error');
    }
  }, [addDebugMessage]);

  // Restart AR
  const restartAR = useCallback(async () => {
    addDebugMessage('🔄 Restarting AR...', 'info');
    
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
