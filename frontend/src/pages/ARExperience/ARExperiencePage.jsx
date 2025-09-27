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

  // Initialize MindAR
  const initializeMindAR = useCallback(async () => {
    // Debug container element in detail
    addDebugMessage('🔍 Checking container element...', 'info');
    addDebugMessage(`📱 containerRef.current:`, containerRef.current, 'info');
    addDebugMessage(`📱 containerRef.current?.offsetWidth:`, containerRef.current?.offsetWidth, 'info');
    addDebugMessage(`📱 containerRef.current?.offsetHeight:`, containerRef.current?.offsetHeight, 'info');
    addDebugMessage(`📱 containerRef.current?.clientWidth:`, containerRef.current?.clientWidth, 'info');
    addDebugMessage(`📱 containerRef.current?.clientHeight:`, containerRef.current?.clientHeight, 'info');
    
    if (!librariesLoaded || !projectData || !containerRef.current) {
      addDebugMessage('❌ MindAR init failed: Missing requirements', 'error');
      addDebugMessage(`📊 Requirements check: libraries=${librariesLoaded}, projectData=${!!projectData}, container=${!!containerRef.current}`, 'info');
      return false;
    }

    try {
      addDebugMessage('🚀 Initializing MindAR...', 'info');
      addDebugMessage('📊 Container element:', containerRef.current, 'info');

      // Determine target image URL
      const targetUrl = projectData.mindTargetUrl || projectData.designUrl;
      if (!targetUrl) {
        throw new Error('No target image available');
      }

      addDebugMessage(`🎯 Using target: ${targetUrl.includes('mind') ? '.mind file' : 'image file'}`, 'info');
      addDebugMessage(`🔗 Target URL: ${targetUrl}`, 'info');

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
        filterMinCF: 0.0001,
        filterBeta: 0.001,
        warmupTolerance: 5,
        missTolerance: 5,
        // Force back camera on mobile
        facingMode: 'environment',
        // Optimize for mobile
        resolution: { width: 640, height: 480 }
      };
      
      addDebugMessage('🔧 MindAR config:', mindarConfig, 'info');
      const mindar = new window.MindARThree.MindARThree(mindarConfig);

      addDebugMessage('✅ MindAR instance created', 'success');
      mindarRef.current = mindar;

      // Get Three.js objects
      const { renderer, scene, camera } = mindar;
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;

      // Create anchor
      const anchor = mindar.addAnchor(0);
      anchorRef.current = anchor;

      // Setup video if available
      if (projectData.videoUrl) {
        await setupVideo(anchor);
      }

      // Setup event listeners
      mindar.onTargetFound = () => {
        addDebugMessage('🎯 Target detected!', 'success');
        setTargetDetected(true);
      };

      mindar.onTargetLost = () => {
        addDebugMessage('🔍 Target lost', 'warning');
        setTargetDetected(false);
        setVideoPlaying(false);
      };

      // Start MindAR
      await mindar.start();
      
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

  // Setup video mesh
  const setupVideo = useCallback(async (anchor) => {
    if (!projectData.videoUrl || !window.THREE) return;

    try {
      addDebugMessage('🎬 Setting up video...', 'info');

      // Create video element
      const video = document.createElement('video');
      video.src = projectData.videoUrl;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      
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

      // Video event listeners
      video.addEventListener('loadedmetadata', () => {
        addDebugMessage('✅ Video metadata loaded', 'success');
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

      video.addEventListener('error', (e) => {
        addDebugMessage(`❌ Video error: ${e.message}`, 'error');
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

      // MindAR should already be running, just update UI state
      addDebugMessage('✅ AR scanning active', 'success');

    } catch (error) {
      addDebugMessage(`❌ Failed to start scanning: ${error.message}`, 'error');
      setError(`Failed to start scanning: ${error.message}`);
      setIsScanning(false);
    }
  }, [isScanning, isInitialized, addDebugMessage]);

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

  // Toggle video playback
  const toggleVideo = useCallback(() => {
    if (!videoRef.current || !targetDetected) return;

    try {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
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
      initializeMindAR().then(success => {
        if (success) {
          startScanning();
        }
      });
    }
  }, [librariesLoaded, projectData, isInitialized, initializeMindAR, startScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mindarRef.current) {
        mindarRef.current.stop().catch(console.error);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);

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
        style={{ touchAction: 'none' }}
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
