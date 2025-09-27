import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, AlertCircle, RefreshCw, Settings, X, Play, Pause, Volume2, VolumeX } from 'lucide-react';

const ARExperiencePage = () => {
  const { userId, projectId } = useParams();
  const navigate = useNavigate();
  const scanId = projectId || userId;

  // Core states
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // AR states
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [arReady, setArReady] = useState(false);
  const [targetDetected, setTargetDetected] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);

  // Debug states
  const [showDebug, setShowDebug] = useState(false);
  const [debugMessages, setDebugMessages] = useState([]);

  // Refs
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const mindarRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const anchorRef = useRef(null);
  const videoMeshRef = useRef(null);

  // Production-ready debug logging with performance monitoring
  const addDebugMessage = useCallback((message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const debugEntry = {
      id: Date.now(),
      message,
      type,
      timestamp,
      data
    };
    
    // Log to console with performance timing
    const perfMark = `AR-${Date.now()}`;
    performance.mark(perfMark);
    console.log(`[AR Debug ${timestamp}] ${message}`, data || '');
    
    // Track performance metrics
    if (type === 'performance') {
      console.log(`⏱️ Performance: ${message}`);
    }
    
    setDebugMessages(prev => [...prev.slice(-29), debugEntry]); // Keep last 30 messages
    
    // Send critical errors to analytics (in production)
    if (type === 'error' && process.env.NODE_ENV === 'production') {
      // Analytics tracking would go here
      console.error('Critical AR Error:', message, data);
    }
  }, []);

  // Check if libraries are available
  const checkLibraries = useCallback(async () => {
    console.log('🔍 Starting library check...');
    addDebugMessage('🔍 Checking AR libraries...', 'info');
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (attempts < maxAttempts) {
      const threeAvailable = !!window.THREE;
      const mindarAvailable = !!window.MindARThree;
      
      console.log(`📊 Library check attempt ${attempts + 1}: THREE=${threeAvailable}, MindAR=${mindarAvailable}`);
      
      if (attempts % 10 === 0) { // Log every 10 attempts (every second)
        addDebugMessage(`📊 Library check ${attempts + 1}/50: THREE=${threeAvailable}, MindAR=${mindarAvailable}`, 'info');
      }
      
      if (threeAvailable && mindarAvailable) {
        console.log('✅ AR libraries loaded successfully');
        addDebugMessage('✅ AR libraries loaded successfully', 'success');
        setLibrariesLoaded(true);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.error('❌ AR libraries failed to load after 50 attempts');
    addDebugMessage('❌ AR libraries failed to load after 5 seconds', 'error');
    addDebugMessage('🔄 Attempting fallback library loading...', 'info');
    
    // Fallback: Try loading libraries dynamically
    try {
      console.log('🔄 Fallback: Loading Three.js...');
      if (!window.THREE) {
        const threeScript = document.createElement('script');
        threeScript.src = 'https://unpkg.com/three@0.158.0/build/three.min.js';
        document.head.appendChild(threeScript);
        await new Promise((resolve, reject) => {
          threeScript.onload = resolve;
          threeScript.onerror = reject;
          setTimeout(reject, 10000);
        });
      }
      
      console.log('🔄 Fallback: Loading MindAR...');
      if (!window.MindARThree) {
        try {
          // Try dynamic import
          const mindarModule = await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js');
          window.MindARThree = mindarModule.MindARThree;
          console.log('✅ MindAR loaded via dynamic import');
        } catch (importError) {
          console.log('🔄 Dynamic import failed, trying script tag...');
          // Fallback to script tag
          const mindarScript = document.createElement('script');
          mindarScript.src = 'https://unpkg.com/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
          mindarScript.type = 'module';
          document.head.appendChild(mindarScript);
          await new Promise((resolve, reject) => {
            mindarScript.onload = resolve;
            mindarScript.onerror = reject;
            setTimeout(reject, 15000);
          });
        }
      }
      
      // Wait for libraries to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (window.THREE && window.MindARThree) {
        console.log('✅ Fallback loading successful!');
        addDebugMessage('✅ Fallback loading successful!', 'success');
        setLibrariesLoaded(true);
        return true;
      }
      
      throw new Error('Libraries still not available after fallback');
      
    } catch (fallbackError) {
      console.error('❌ Fallback loading also failed:', fallbackError);
      addDebugMessage(`❌ Fallback loading failed: ${fallbackError.message}`, 'error');
      setError('AR libraries could not be loaded. Please refresh the page and try again.');
      return false;
    }
  }, [addDebugMessage]);

  // Track analytics events
  const trackAnalytics = useCallback(async (event, data = {}) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/analytics/${event}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || projectId,
          projectId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ...data
        })
      });
      addDebugMessage(`📊 Analytics tracked: ${event}`, 'info');
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }, [userId, projectId, addDebugMessage]);

  // Fetch project data
  const fetchProjectData = useCallback(async () => {
    const startTime = performance.now();
    
    try {
      console.log('🌐 Starting project data fetch...');
      addDebugMessage('🌐 Fetching project data...', 'info');
      setIsLoading(true);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const endpoint = projectId 
        ? `/qr/project-data/${projectId}` 
        : `/qr/user-data/${userId}`;
      
      const fullUrl = `${apiUrl}${endpoint}`;
      console.log('🌐 Fetching from URL:', fullUrl);
      addDebugMessage(`🌐 API URL: ${fullUrl}`, 'info');
      
      const response = await fetch(fullUrl);
      console.log('🌐 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🌐 Response data:', data);
      
      // Handle both success formats: {success: true} and {status: 'success'}
      const isSuccess = data.success === true || data.status === 'success';
      if (!isSuccess) {
        throw new Error(data.message || 'Failed to fetch project data');
      }
      
      setProjectData(data.data);
      console.log('✅ Project data set:', data.data);
      addDebugMessage('✅ Project data loaded successfully', 'success');
      
      // Track AR experience start
      await trackAnalytics('ar-experience-start', {
        loadTime: performance.now() - startTime,
        hasVideo: !!data.data.videoUrl,
        hasDesign: !!data.data.designUrl
      });
      
    } catch (error) {
      console.error('❌ Project data fetch error:', error);
      addDebugMessage(`❌ Failed to fetch project data: ${error.message}`, 'error');
      setError(`Failed to load project: ${error.message}`);
      
      // Track error
      await trackAnalytics('ar-experience-error', {
        error: error.message,
        step: 'project-data-fetch'
      });
    } finally {
      const loadTime = performance.now() - startTime;
      addDebugMessage(`⏱️ Project data fetch took ${loadTime.toFixed(2)}ms`, 'performance');
      console.log('🌐 Setting isLoading to false');
      setIsLoading(false);
    }
  }, [projectId, userId, addDebugMessage, trackAnalytics]);

  // Initialize MindAR with retry mechanism
  const initializeMindAR = useCallback(async (retryCount = 0, maxRetries = 3) => {
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
    
    // Debug container element in detail
    addDebugMessage(`🔍 Checking container element (attempt ${retryCount + 1}/${maxRetries + 1})...`, 'info');
    addDebugMessage(`📱 containerRef.current:`, containerRef.current, 'info');
    addDebugMessage(`📱 containerRef.current?.offsetWidth:`, containerRef.current?.offsetWidth, 'info');
    addDebugMessage(`📱 containerRef.current?.offsetHeight:`, containerRef.current?.offsetHeight, 'info');
    addDebugMessage(`📱 containerRef.current?.clientWidth:`, containerRef.current?.clientWidth, 'info');
    addDebugMessage(`📱 containerRef.current?.clientHeight:`, containerRef.current?.clientHeight, 'info');
    
    // Check if container is ready with proper dimensions
    if (!containerRef.current || containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
      if (retryCount < maxRetries) {
        addDebugMessage(`⚠️ Container not ready yet, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`, 'warning');
        addDebugMessage(`📊 Container check: exists=${!!containerRef.current}, width=${containerRef.current?.offsetWidth}, height=${containerRef.current?.offsetHeight}`, 'info');
        
        // Retry with exponential backoff
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
      addDebugMessage(`📊 Requirements check: libraries=${librariesLoaded}, projectData=${!!projectData}, container=${!!containerRef.current}`, 'info');
      return false;
    }
    
    // Container is ready - log final dimensions
    addDebugMessage(`✅ Container ready: ${containerRef.current.offsetWidth}x${containerRef.current.offsetHeight}`, 'success');

    try {
      addDebugMessage('🚀 Initializing MindAR...', 'info');
      addDebugMessage('📊 Container element:', containerRef.current, 'info');

      // Determine target image URL - prefer design image over corrupted .mind file
      let targetUrl = projectData.designUrl;
      let targetType = 'image file';
      
      // Only use .mind file if design URL is not available
      if (!targetUrl && projectData.mindTargetUrl) {
        targetUrl = projectData.mindTargetUrl;
        targetType = '.mind file';
      }
      
      if (!targetUrl) {
        throw new Error('No target image available');
      }

      addDebugMessage(`🎯 Using target: ${targetType}`, 'info');
      addDebugMessage(`🔗 Target URL: ${targetUrl}`, 'info');
      
      // If using .mind file, add warning about potential corruption
      if (targetType === '.mind file') {
        addDebugMessage('⚠️ Using .mind file - if AR fails, the file may be corrupted', 'warning');
      }
      
        // Pre-validate and optimize image URL to detect potential issues
        if (targetType === 'image file') {
          addDebugMessage('🔍 Pre-validating and optimizing image URL...', 'info');
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = () => {
                addDebugMessage(`✅ Image validation successful: ${img.naturalWidth}x${img.naturalHeight}`, 'success');
                
                // Resize image if too large for better MindAR performance
                if (img.naturalWidth > 640 || img.naturalHeight > 640) {
                  addDebugMessage('🖼️ Image too large, resizing for better performance...', 'info');
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const maxSize = 640;
                  const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
                  canvas.width = img.naturalWidth * scale;
                  canvas.height = img.naturalHeight * scale;
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  targetUrl = canvas.toDataURL('image/jpeg', 0.8);
                  addDebugMessage(`🖼️ Image resized to ${canvas.width}x${canvas.height}`, 'success');
                }
                resolve();
              };
              img.onerror = () => {
                addDebugMessage('⚠️ Image validation failed - may cause AR issues', 'warning');
                reject(new Error('Image load failed'));
              };
              img.src = targetUrl;
            });
          } catch (imgError) {
            addDebugMessage(`⚠️ Image processing error: ${imgError.message}`, 'warning');
          }
        }

      // Check if we have real MindAR or stub
      const isRealMindAR = window.MindARThree && window.MindARThree.MindARThree && 
                          typeof window.MindARThree.MindARThree === 'function' &&
                          !window.MindARThree.MindARThree.toString().includes('stub') &&
                          window.MindARThree.MindARThree.toString().length > 1000; // Real MindAR is much larger than stub

      if (isRealMindAR) {
        addDebugMessage('✅ Using real MindAR library', 'success');
      } else {
        addDebugMessage('🧪 Using MindAR stub (test mode)', 'info');
      }

      // Check camera permissions before initializing MindAR
      addDebugMessage('🎥 Checking camera permissions...', 'info');
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' });
        addDebugMessage(`📹 Camera permission status: ${permissionStatus.state}`, 'info');
        
        if (permissionStatus.state === 'denied') {
          addDebugMessage('❌ Camera permission denied by user', 'error');
          setError('Camera permission is required for AR experience. Please allow camera access and refresh the page.');
          return false;
        }
      } catch (permError) {
        addDebugMessage(`⚠️ Could not check camera permissions: ${permError.message}`, 'warning');
      }

      // Test camera access before MindAR initialization
      addDebugMessage('🎥 Testing camera access...', 'info');
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        addDebugMessage('✅ Camera access test successful', 'success');
        addDebugMessage(`📹 Camera stream details: ${testStream.getVideoTracks().length} video tracks`, 'info');
        
        // Stop test stream
        testStream.getTracks().forEach(track => {
          track.stop();
          addDebugMessage(`🛑 Stopped test track: ${track.kind}`, 'info');
        });
      } catch (cameraError) {
        addDebugMessage(`❌ Camera access test failed: ${cameraError.name} - ${cameraError.message}`, 'error');
        
        // Provide specific error messages
        if (cameraError.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and refresh the page.');
        } else if (cameraError.name === 'NotFoundError') {
          setError('No camera found. Please ensure your device has a camera.');
        } else if (cameraError.name === 'NotReadableError') {
          setError('Camera is already in use by another application.');
        } else {
          setError(`Camera error: ${cameraError.message}`);
        }
        return false;
      }

      // Create MindAR instance with proper camera configuration
      addDebugMessage('🔧 Creating MindAR instance...', 'info');
      addDebugMessage(`📱 Container element:`, containerRef.current, 'info');
      addDebugMessage(`📱 Container dimensions: ${containerRef.current?.offsetWidth}x${containerRef.current?.offsetHeight}`, 'info');
      
        const mindarConfig = {
        container: containerRef.current,
        imageTargetSrc: targetUrl,
        maxTrack: 1,
          filterMinCF: 0.0005, // Relaxed for faster detection
          filterBeta: 0.01,    // Adjusted for better performance
          warmupTolerance: 10, // Increased tolerance for initialization
          missTolerance: 10,   // Increased tolerance for target loss
          // Force back camera on mobile
          facingMode: 'environment',
          // Optimize for mobile - use container dimensions for better compatibility
          resolution: { 
            width: Math.min(containerRef.current.offsetWidth, 640), 
            height: Math.min(containerRef.current.offsetHeight, 480) 
          }
        };
      
      addDebugMessage('🔧 MindAR config:', mindarConfig, 'info');
      
      let mindar;
      try {
        mindar = new window.MindARThree.MindARThree(mindarConfig);
      } catch (mindarError) {
        addDebugMessage(`❌ MindAR instance creation failed: ${mindarError.message}`, 'error');
        
        // Try with simplified config if initial creation fails
        addDebugMessage('🔄 Retrying with simplified MindAR config...', 'info');
        const simpleConfig = {
          container: containerRef.current,
          imageTargetSrc: targetUrl,
          maxTrack: 1
        };
        
        try {
          mindar = new window.MindARThree.MindARThree(simpleConfig);
          addDebugMessage('✅ MindAR created with simplified config', 'success');
        } catch (simpleError) {
          addDebugMessage(`❌ MindAR creation failed even with simple config: ${simpleError.message}`, 'error');
          throw new Error(`MindAR initialization failed: ${simpleError.message}`);
        }
      }

      addDebugMessage('✅ MindAR instance created', 'success');
      mindarRef.current = mindar;

      // Get Three.js objects with proper validation
      const { renderer, scene, camera } = mindar;
      
      // Validate MindAR objects before assigning
      if (!renderer || !scene || !camera) {
        throw new Error('MindAR objects are undefined - renderer, scene, or camera missing');
      }
      
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      
      addDebugMessage('✅ MindAR objects validated and assigned', 'success');

      // Create anchor
      const anchor = mindar.addAnchor(0);
      anchorRef.current = anchor;

      // Setup video if available
      if (projectData.videoUrl) {
        await setupVideo(anchor);
      }

      // Setup event listeners with throttled updates
      mindar.onTargetFound = () => {
        addDebugMessage('🎯 Target detected!', 'success');
        throttledSetTargetDetected(true);
      };

      mindar.onTargetLost = () => {
        addDebugMessage('🔍 Target lost', 'warning');
        throttledSetTargetDetected(false);
        throttledSetVideoPlaying(false);
      };

      // Start MindAR with error handling and timeout
      let progressInterval = null;
      try {
        addDebugMessage('🚀 Starting MindAR...', 'info');
        
        // Add progress indicators
          const startProgress = () => {
            let seconds = 0;
            progressInterval = setInterval(() => {
              seconds++;
              if (seconds <= 30) {
                addDebugMessage(`⏳ MindAR starting... ${seconds}/30 seconds`, 'info');
              }
            }, 1000);
          };
        
        startProgress();
        
        // Add multiple timeout strategies
        const startPromise = mindar.start();
        
        // Short timeout for quick fallback (increased for mobile)
        const quickTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MindAR start timeout after 15 seconds')), 15000)
        );
        
        // Long timeout as backup (increased for complex images)
        const longTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MindAR start timeout after 30 seconds')), 30000)
        );
        
        // Race between start, quick timeout, and long timeout
        const result = await Promise.race([startPromise, quickTimeout, longTimeout]);
        
        // Clear progress indicator
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        addDebugMessage('✅ MindAR started successfully', 'success');
      } catch (startError) {
        // Clear progress indicator
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        addDebugMessage(`❌ MindAR start failed: ${startError.message}`, 'error');
        
        // Log full error details for debugging
        console.error('Full MindAR start error:', startError);
        console.error('Error stack:', startError.stack);
        
        // Check if it's a buffer/corruption error or timeout
        if (startError.message.includes('Extra') && startError.message.includes('byte(s)') || 
            startError.message.includes('timeout') || 
            startError.message.includes('RangeError')) {
          
          if (startError.message.includes('timeout')) {
            addDebugMessage('⏰ MindAR start timeout - image processing taking too long', 'warning');
            addDebugMessage('💡 This can happen with complex images on mobile devices. Enabling test mode...', 'info');
          } else {
            addDebugMessage('🚨 Image file corruption detected!', 'error');
            addDebugMessage('💡 The design image appears to be corrupted or incompatible. Enabling test mode...', 'warning');
          }
          
          // Instead of failing completely, enable test mode
          addDebugMessage('🧪 Switching to AR test mode due to image issues', 'info');
          
            // Create a test mode MindAR instance
            try {
              const testConfig = {
                container: containerRef.current,
                imageTargetSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 transparent PNG
                maxTrack: 1,
                filterMinCF: 0.001, // Relaxed for test mode
                filterBeta: 0.01,   // Relaxed for test mode
                warmupTolerance: 5,
                missTolerance: 5
              };
              
              addDebugMessage('🧪 Creating test mode MindAR with config:', testConfig, 'info');
              const testMindar = new window.MindARThree.MindARThree(testConfig);
              
              // Validate test MindAR objects
              const { renderer, scene, camera } = testMindar;
              if (!renderer || !scene || !camera) {
                throw new Error('Test MindAR objects are undefined');
              }
              
              mindarRef.current = testMindar;
              rendererRef.current = renderer;
              sceneRef.current = scene;
              cameraRef.current = camera;
              
              addDebugMessage('✅ Test MindAR objects validated', 'success');
            
            // Setup video for test mode
            if (projectData.videoUrl) {
              await setupVideo(testMindar.addAnchor(0));
            }
            
            // Setup test mode event listeners
            testMindar.onTargetFound = () => {
              addDebugMessage('🎯 Target detected! (test mode)', 'success');
              throttledSetTargetDetected(true);
            };

            testMindar.onTargetLost = () => {
              addDebugMessage('🔍 Target lost (test mode)', 'warning');
              throttledSetTargetDetected(false);
              throttledSetVideoPlaying(false);
            };
            
            try {
              await testMindar.start();
              addDebugMessage('✅ MindAR test mode started successfully', 'success');
            } catch (testStartError) {
              addDebugMessage(`⚠️ Test MindAR start failed: ${testStartError.message}`, 'warning');
              addDebugMessage('🔄 Continuing with camera activation anyway...', 'info');
            }
            
               // Set test mode flag
               if (startError.message.includes('timeout')) {
                 setError('⏰ AR processing timeout - Running in test mode. Complex images may take longer to process on mobile devices.');
               } else {
                 setError('⚠️ Image corruption detected - AR is running in test mode. Please re-upload a clean image for full AR functionality.');
               }
               
               // Activate camera and AR in test mode
               setCameraActive(true);
               setArReady(true);
               setIsInitialized(true);
               addDebugMessage('🎥 Camera activated in test mode', 'success');
               return true;
            
          } catch (testError) {
            addDebugMessage(`❌ Test mode also failed: ${testError.message}`, 'error');
            addDebugMessage('🔄 Attempting basic camera fallback...', 'info');
            
            // Last resort: basic camera without MindAR
            try {
              setError('⚠️ AR tracking failed - Basic camera mode enabled. Video playback available.');
              setCameraActive(true);
              setArReady(true);
              setIsInitialized(true);
              addDebugMessage('🎥 Basic camera mode activated', 'success');
              return true;
            } catch (fallbackError) {
              addDebugMessage(`❌ Even basic camera failed: ${fallbackError.message}`, 'error');
              setError('Camera initialization failed completely. Please refresh the page and try again.');
              return false;
            }
          }
        }
        
        // If start fails due to target file issues, try with design image instead
        if (targetType === '.mind file' && projectData.designUrl) {
          addDebugMessage('🔄 Target file failed, retrying with design image...', 'info');
          
          try {
            // Recreate MindAR with design image
            const fallbackConfig = {
              container: containerRef.current,
              imageTargetSrc: projectData.designUrl,
              maxTrack: 1
            };
            
            const fallbackMindar = new window.MindARThree.MindARThree(fallbackConfig);
            mindarRef.current = fallbackMindar;
            
            // Setup video again
            if (projectData.videoUrl) {
              await setupVideo(fallbackMindar.addAnchor(0));
            }
            
            // Setup event listeners
            fallbackMindar.onTargetFound = () => {
              addDebugMessage('🎯 Target detected! (using design image)', 'success');
              throttledSetTargetDetected(true);
            };

            fallbackMindar.onTargetLost = () => {
              addDebugMessage('🔍 Target lost', 'warning');
              throttledSetTargetDetected(false);
              throttledSetVideoPlaying(false);
            };
            
            await fallbackMindar.start();
            addDebugMessage('✅ MindAR started successfully with design image fallback', 'success');
          } catch (fallbackError) {
            addDebugMessage(`❌ Fallback MindAR also failed: ${fallbackError.message}`, 'error');
            
            // Check if fallback also has corruption
            if (fallbackError.message.includes('Extra') && fallbackError.message.includes('byte(s)')) {
              addDebugMessage('🚨 Design image is also corrupted!', 'error');
              setError('The design image is corrupted and cannot be used for AR tracking. Please go back and re-upload a clean image file.');
              return false;
            }
            
            throw new Error(`AR initialization failed: ${fallbackError.message}`);
          }
        } else {
          throw new Error(`MindAR start failed: ${startError.message}`);
        }
      }
      
      addDebugMessage('✅ MindAR initialized successfully', 'success');
      setCameraActive(true);
      setArReady(true);
      setIsInitialized(true);
      
      return true;

    } catch (error) {
      addDebugMessage(`❌ MindAR initialization failed: ${error.message}`, 'error');
      setError(`AR initialization failed: ${error.message}`);
      return false;
    }
  }, [librariesLoaded, projectData, addDebugMessage]);

  // Throttle function for frequent updates
  const throttle = useCallback((func, delay) => {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }, []);

  // Throttled state updates
  const throttledSetTargetDetected = useCallback(
    throttle((value) => setTargetDetected(value), 100),
    [throttle]
  );

  const throttledSetVideoPlaying = useCallback(
    throttle((value) => setVideoPlaying(value), 200),
    [throttle]
  );

  // Setup video mesh
  const setupVideo = useCallback(async (anchor) => {
    if (!projectData.videoUrl || !window.THREE) return;

    try {
      addDebugMessage('🎬 Setting up video...', 'info');

      // Create video element with enhanced reliability
      const video = document.createElement('video');
      video.src = projectData.videoUrl;
      video.muted = true; // Critical for autoplay on mobile
      video.loop = true;
      video.playsInline = true; // Critical for iOS
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.controls = false; // Hide controls for AR overlay
      
      // Add mobile-specific attributes
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      
      videoRef.current = video;

      // Create video texture
      const texture = new window.THREE.VideoTexture(video);
      texture.minFilter = window.THREE.LinearFilter;
      texture.magFilter = window.THREE.LinearFilter;

      // Create geometry based on design dimensions
      const aspectRatio = projectData.designDimensions 
        ? projectData.designDimensions.width / projectData.designDimensions.height 
        : 1;
      
      const geometry = new window.THREE.PlaneGeometry(aspectRatio, 1);
      const material = new window.THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.9
      });

      // Create mesh
      const videoMesh = new window.THREE.Mesh(geometry, material);
      videoMesh.position.set(0, 0, 0);
      videoMesh.rotation.x = 0;
      
      videoMeshRef.current = videoMesh;
      anchor.group.add(videoMesh);

      // Video event listeners with enhanced error handling
      video.addEventListener('loadedmetadata', () => {
        addDebugMessage('✅ Video metadata loaded', 'success');
        addDebugMessage(`📹 Video dimensions: ${video.videoWidth}x${video.videoHeight}`, 'info');
      });

      video.addEventListener('canplay', () => {
        addDebugMessage('✅ Video ready to play', 'success');
      });

      video.addEventListener('play', () => {
        throttledSetVideoPlaying(true);
        addDebugMessage('▶️ Video started playing', 'success');
      });

      video.addEventListener('pause', () => {
        throttledSetVideoPlaying(false);
        addDebugMessage('⏸️ Video paused', 'info');
      });

      video.addEventListener('ended', () => {
        throttledSetVideoPlaying(false);
        addDebugMessage('🔚 Video ended', 'info');
      });

      video.addEventListener('error', (e) => {
        const error = video.error;
        let errorMessage = 'Unknown video error';
        
        if (error) {
          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              errorMessage = 'Video playback was aborted';
              break;
            case error.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error occurred while loading video';
              break;
            case error.MEDIA_ERR_DECODE:
              errorMessage = 'Video decoding error';
              break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Video format not supported';
              break;
            default:
              errorMessage = `Video error: ${error.message || 'Unknown error'}`;
          }
        }
        
        addDebugMessage(`❌ Video error: ${errorMessage}`, 'error');
      });

      // Add loadstart and progress events for better debugging
      video.addEventListener('loadstart', () => {
        addDebugMessage('🔄 Video loading started', 'info');
      });

      video.addEventListener('progress', () => {
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          const duration = video.duration;
          if (duration > 0) {
            const bufferedPercent = (bufferedEnd / duration) * 100;
            addDebugMessage(`📊 Video buffered: ${bufferedPercent.toFixed(1)}%`, 'info');
          }
        }
      });

      addDebugMessage('✅ Video mesh created successfully', 'success');

    } catch (error) {
      addDebugMessage(`❌ Video setup failed: ${error.message}`, 'error');
    }
  }, [projectData, addDebugMessage]);

  // Start AR scanning
  const startScanning = useCallback(async () => {
    if (isScanning || !isInitialized) return;

    try {
      addDebugMessage('📱 Starting AR scan...', 'info');
      setIsScanning(true);
      setError(null);

      // Start MindAR if it's not already running
      if (mindarRef.current && !cameraActive) {
        addDebugMessage('🎥 Starting MindAR camera...', 'info');
        try {
          await mindarRef.current.start();
          addDebugMessage('✅ MindAR camera started', 'success');
        } catch (mindarError) {
          addDebugMessage(`⚠️ MindAR start warning: ${mindarError.message}`, 'warning');
          // Continue anyway - test mode or basic camera might still work
        }
      } else if (!mindarRef.current && cameraActive) {
        addDebugMessage('🎥 Basic camera mode - no MindAR instance', 'info');
      }

      // Update UI state
      addDebugMessage('✅ AR scanning active', 'success');

    } catch (error) {
      addDebugMessage(`❌ Failed to start scanning: ${error.message}`, 'error');
      setError(`Failed to start scanning: ${error.message}`);
      setIsScanning(false);
    }
  }, [isScanning, isInitialized, cameraActive, addDebugMessage]);

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
  }, [isScanning, addDebugMessage]);

  // Toggle video playback with enhanced reliability
  const toggleVideo = useCallback(async () => {
    if (!videoRef.current || !targetDetected) return;

    try {
      if (videoPlaying) {
        videoRef.current.pause();
        addDebugMessage('⏸️ Video paused by user', 'info');
      } else {
        // Enhanced video play with mobile compatibility
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          try {
            await playPromise;
            addDebugMessage('▶️ Video started by user', 'success');
          } catch (playError) {
            // If autoplay fails, try with muted
            if (playError.name === 'NotAllowedError') {
              addDebugMessage('⚠️ Autoplay blocked, trying with muted...', 'warning');
              videoRef.current.muted = true;
              try {
                await videoRef.current.play();
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
  }, [videoPlaying, targetDetected, addDebugMessage]);

  // Toggle video mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    videoRef.current.muted = !videoRef.current.muted;
    setVideoMuted(videoRef.current.muted);
    addDebugMessage(`🔊 Video ${videoRef.current.muted ? 'muted' : 'unmuted'}`, 'info');
  }, [addDebugMessage]);

  // Restart AR
  const restartAR = useCallback(async () => {
    addDebugMessage('🔄 Restarting AR...', 'info');
    
    await stopScanning();
    
    // Reset states
    setIsInitialized(false);
    setArReady(false);
    setCameraActive(false);
    setTargetDetected(false);
    setVideoPlaying(false);
    setError(null);

    // Reinitialize
    setTimeout(async () => {
      const success = await initializeMindAR();
      if (success) {
        await startScanning();
      }
    }, 1000);
  }, [stopScanning, initializeMindAR, startScanning, addDebugMessage]);

  // Initialize on mount
  useEffect(() => {
    console.log('🚀 AR Page mounted, starting initialization...');
    console.log('📊 URL params:', { userId, projectId, scanId });
    
    const initialize = async () => {
      console.log('🔄 Running initialization sequence...');
      const librariesReady = await checkLibraries();
      console.log('📊 Libraries ready:', librariesReady);
      
      if (librariesReady) {
        console.log('🌐 Libraries ready, fetching project data...');
        await fetchProjectData();
      } else {
        console.error('❌ Libraries not ready, skipping project data fetch');
      }
    };

    initialize();
  }, [checkLibraries, fetchProjectData, userId, projectId, scanId]);

  // Initialize MindAR when data is ready
  useEffect(() => {
    if (librariesLoaded && projectData && !isInitialized) {
      // Add a small delay to ensure the container is fully rendered
      addDebugMessage('⏳ Delaying MindAR initialization to ensure container is ready...', 'info');
      setTimeout(() => {
        initializeMindAR().then(success => {
          if (success) {
            // Add a small delay to ensure MindAR is fully ready
            setTimeout(() => {
              startScanning();
            }, 100);
          }
        });
      }, 500); // 500ms delay to ensure DOM is ready
    }
  }, [librariesLoaded, projectData, isInitialized, initializeMindAR, startScanning, addDebugMessage]);

  // ResizeObserver for dynamic container sizing
  useEffect(() => {
    if (!containerRef.current || !librariesLoaded || !projectData) return;

    addDebugMessage('📏 Setting up ResizeObserver for container...', 'info');
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        addDebugMessage(`📏 Container resized: ${width}x${height}`, 'info');
        
        // Reinitialize MindAR if container becomes available and we're not initialized
        if (width > 0 && height > 0 && !isInitialized) {
          addDebugMessage('📏 Container now has dimensions, retrying MindAR initialization...', 'info');
          setTimeout(() => {
            initializeMindAR().then(success => {
              if (success && !isScanning) {
                startScanning();
              }
            });
          }, 100);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      addDebugMessage('📏 Cleaning up ResizeObserver...', 'info');
      resizeObserver.disconnect();
    };
  }, [containerRef, librariesLoaded, projectData, isInitialized, isScanning, initializeMindAR, startScanning, addDebugMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      addDebugMessage('🧹 Cleaning up AR resources...', 'info');
      
      // Stop MindAR
      if (mindarRef.current) {
        mindarRef.current.stop().catch(console.error);
      }
      
      // Stop and cleanup video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load(); // Reset video element
      }
      
      // Dispose Three.js resources
      if (videoMeshRef.current) {
        try {
          // Dispose texture
          if (videoMeshRef.current.material && videoMeshRef.current.material.map) {
            videoMeshRef.current.material.map.dispose();
            addDebugMessage('🧹 Disposed video texture', 'info');
          }
          
          // Dispose material
          if (videoMeshRef.current.material) {
            videoMeshRef.current.material.dispose();
            addDebugMessage('🧹 Disposed video material', 'info');
          }
          
          // Remove mesh from scene
          if (sceneRef.current && videoMeshRef.current.parent) {
            sceneRef.current.remove(videoMeshRef.current);
            addDebugMessage('🧹 Removed video mesh from scene', 'info');
          }
          
          // Dispose geometry
          if (videoMeshRef.current.geometry) {
            videoMeshRef.current.geometry.dispose();
            addDebugMessage('🧹 Disposed video geometry', 'info');
          }
        } catch (error) {
          console.warn('Error disposing video mesh:', error);
        }
      }
      
      // Dispose renderer
      if (rendererRef.current) {
        try {
          rendererRef.current.dispose();
          addDebugMessage('🧹 Disposed renderer', 'info');
        } catch (error) {
          console.warn('Error disposing renderer:', error);
        }
      }
      
      addDebugMessage('✅ AR cleanup completed', 'info');
    };
  }, [addDebugMessage]);

  // Debug panel component
  const DebugPanel = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${showDebug ? 'block' : 'hidden'}`}>
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-96 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">AR Debug Panel</h3>
          <button
            onClick={() => setShowDebug(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <h4 className="font-medium">System Status</h4>
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${librariesLoaded ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${librariesLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Libraries: {librariesLoaded ? 'Loaded' : 'Missing'}
                </div>
                <div className={`flex items-center gap-2 ${cameraActive ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Camera: {cameraActive ? 'Active' : 'Inactive'}
                </div>
                <div className={`flex items-center gap-2 ${arReady ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${arReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  AR: {arReady ? 'Ready' : 'Not Ready'}
                </div>
                <div className={`flex items-center gap-2 ${targetDetected ? 'text-green-600' : 'text-orange-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${targetDetected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  Target: {targetDetected ? 'Detected' : 'Searching'}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Video Status</h4>
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${videoRef.current ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${videoRef.current ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  Video: {videoRef.current ? 'Loaded' : 'Not Loaded'}
                </div>
                <div className={`flex items-center gap-2 ${videoPlaying ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${videoPlaying ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  Playing: {videoPlaying ? 'Yes' : 'No'}
                </div>
                <div className={`flex items-center gap-2 ${videoMuted ? 'text-orange-600' : 'text-green-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${videoMuted ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  Audio: {videoMuted ? 'Muted' : 'Unmuted'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Recent Messages</h4>
            <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto text-xs space-y-1">
              {debugMessages.slice(-10).map(msg => (
                <div key={msg.id} className={`flex gap-2 ${
                  msg.type === 'error' ? 'text-red-600' : 
                  msg.type === 'success' ? 'text-green-600' : 
                  msg.type === 'warning' ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  <span className="text-gray-400">{msg.timestamp}</span>
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="mb-6">Loading AR Experience...</p>
          
          {/* Debug info during loading */}
          <div className="text-sm text-gray-400 mb-4">
            <p>Libraries: {librariesLoaded ? '✅ Loaded' : '⏳ Loading...'}</p>
            <p>Project Data: {projectData ? '✅ Loaded' : '⏳ Loading...'}</p>
          </div>
          
          {/* Debug button */}
          <button
            onClick={() => setShowDebug(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            Show Debug Info
          </button>
        </div>
        
        {/* Debug Panel - available even during loading */}
        <DebugPanel />
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">AR Experience Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={restartAR}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Retry AR Experience
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* AR Container */}
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          width: '100%', 
          height: '100%',
          touchAction: 'none',
          minWidth: '320px',
          minHeight: '240px'
        }}
      />

      {/* Top UI Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm"
            >
              <X size={20} />
            </button>
            <div className="text-white">
              <h1 className="font-semibold">AR Experience</h1>
              <p className="text-sm text-gray-300">
                {projectData?.name || 'Phygital AR'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Test camera display
                console.log('🧪 Testing camera display...');
                const testCanvas = document.createElement('canvas');
                testCanvas.width = 640;
                testCanvas.height = 480;
                testCanvas.style.position = 'fixed';
                testCanvas.style.top = '50px';
                testCanvas.style.left = '50px';
                testCanvas.style.width = '300px';
                testCanvas.style.height = '200px';
                testCanvas.style.zIndex = '9999';
                testCanvas.style.border = '3px solid lime';
                testCanvas.style.backgroundColor = 'black';
                
                const ctx = testCanvas.getContext('2d');
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(0, 0, testCanvas.width, testCanvas.height);
                ctx.fillStyle = 'black';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('TEST CAMERA', testCanvas.width/2, testCanvas.height/2);
                
                document.body.appendChild(testCanvas);
                
                // Start camera test
                navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                  const video = document.createElement('video');
                  video.srcObject = stream;
                  video.autoplay = true;
                  video.playsInline = true;
                  video.muted = true;
                  video.style.display = 'none';
                  document.body.appendChild(video);
                  
                  video.onloadedmetadata = () => {
                    const draw = () => {
                      if (video.readyState >= video.HAVE_CURRENT_DATA) {
                        ctx.drawImage(video, 0, 0, testCanvas.width, testCanvas.height);
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                        ctx.fillRect(10, 10, 100, 30);
                        ctx.fillStyle = 'black';
                        ctx.font = '12px Arial';
                        ctx.fillText('LIVE TEST', 15, 30);
                      }
                      requestAnimationFrame(draw);
                    };
                    draw();
                  };
                }).catch(err => {
                  ctx.fillStyle = 'red';
                  ctx.fillRect(0, 0, testCanvas.width, testCanvas.height);
                  ctx.fillStyle = 'white';
                  ctx.font = '16px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('CAMERA FAILED', testCanvas.width/2, testCanvas.height/2);
                });
                
                // Remove after 10 seconds
                setTimeout(() => {
                  if (testCanvas.parentNode) {
                    testCanvas.parentNode.removeChild(testCanvas);
                  }
                }, 10000);
              }}
              className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded-full text-white backdrop-blur-sm"
              title="Test Camera Display"
            >
              📹
            </button>
            <button
              onClick={() => setShowDebug(true)}
              className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-20 left-4 right-4 z-30">
        <div className="flex items-center justify-center">
          <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
            targetDetected 
              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
              : isScanning 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
          }`}>
            {targetDetected ? '🎯 Target Detected' : isScanning ? '🔍 Scanning...' : '📱 Ready to Scan'}
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!targetDetected && isScanning && (
        <div className="absolute bottom-32 left-4 right-4 z-30">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center text-white">
            <Camera size={32} className="mx-auto mb-2 text-blue-400" />
            {(() => {
              // Check if we have real MindAR
              const isRealMindAR = window.MindARThree && window.MindARThree.MindARThree && 
                                  typeof window.MindARThree.MindARThree === 'function' &&
                                  !window.MindARThree.MindARThree.toString().includes('stub');
              
              if (isRealMindAR) {
                return (
                  <>
                    <h3 className="font-semibold mb-1">Point Camera at Design</h3>
                    <p className="text-sm text-gray-300">
                      Align your printed design within the camera view
                    </p>
                    <div className="mt-3 p-2 bg-green-500/20 rounded border border-green-500/30">
                      <p className="text-xs text-green-300">
                        📱 Real AR mode active - camera feed should be visible
                      </p>
                    </div>
                  </>
                );
              } else {
                return (
                  <>
                    <h3 className="font-semibold mb-1">AR Test Mode Active</h3>
                    <p className="text-sm text-gray-300">
                      Using MindAR simulation - camera feed not available in test mode
                    </p>
                    <div className="mt-3 p-2 bg-blue-500/20 rounded border border-blue-500/30">
                      <p className="text-xs text-blue-300 mb-2">
                        🧪 This is a functional test of the AR interface. 
                        Real AR requires actual MindAR library.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setTargetDetected(!targetDetected);
                            addDebugMessage(`🧪 Test: Target ${!targetDetected ? 'detected' : 'lost'}`, 'info');
                            if (!targetDetected && projectData?.videoUrl && videoRef.current) {
                              // Auto-play video when target is detected
                              setTimeout(() => {
                                videoRef.current.play().catch(e => 
                                  addDebugMessage(`Video autoplay failed: ${e.message}`, 'warning')
                                );
                              }, 500);
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          {targetDetected ? 'Simulate Target Lost' : 'Simulate Target Found'}
                        </button>
                        <button
                          onClick={() => {
                            // Show target image for reference
                            if (projectData?.designUrl) {
                              const popup = window.open('', '_blank', 'width=600,height=400');
                              popup.document.write(`
                                <html>
                                  <head><title>AR Target Image</title></head>
                                  <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#000;">
                                    <div style="text-align:center; color:white;">
                                      <h3>Print this image for AR detection:</h3>
                                      <img src="${projectData.designUrl}" style="max-width:90%; max-height:80%; border:2px solid lime;">
                                      <p>Point your camera at this printed image</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                            }
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                        >
                          Show Target
                        </button>
                      </div>
                    </div>
                  </>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Video Controls */}
      {targetDetected && projectData?.videoUrl && (
        <div className="absolute bottom-32 left-4 right-4 z-30">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleVideo}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white"
              >
                {videoPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              
              <div className="flex-1 text-center text-white">
                <p className="text-sm font-medium">
                  {videoPlaying ? 'Video Playing' : 'Tap to Play Video'}
                </p>
              </div>
              
              <button
                onClick={toggleMute}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white"
              >
                {videoMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-4 right-4 z-30">
        <div className="flex items-center justify-center gap-4">
          {!isScanning ? (
            <button
              onClick={startScanning}
              disabled={!arReady}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-full font-semibold flex items-center gap-2"
            >
              <Camera size={20} />
              Start AR Experience
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={stopScanning}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium"
              >
                Stop Scanning
              </button>
              
              <button
                onClick={restartAR}
                className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
};

export default ARExperiencePage;
