/**
 * AR Logic Hook
 * Handles all AR initialization and management logic
 */

import { useRef, useCallback, useEffect } from 'react';
import { validateImageForMindAR, processImageForAR, throttle } from '../utils/arUtils';

export const useARLogic = ({
  librariesLoaded,
  projectData,
  isInitialized,
  isScanning,
  videoPlaying,
  targetDetected,
  setError,
  setCameraActive,
  setArReady,
  setTargetDetected,
  setVideoPlaying,
  setIsInitialized,
  setIsScanning,
  addDebugMessage,
  resetARState
}) => {
  // Refs
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const mindarRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const anchorRef = useRef(null);
  const videoMeshRef = useRef(null);

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
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.controls = false;
      
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      
      videoRef.current = video;

      const texture = new window.THREE.VideoTexture(video);
      texture.minFilter = window.THREE.LinearFilter;
      texture.magFilter = window.THREE.LinearFilter;

      const aspectRatio = projectData.designDimensions 
        ? projectData.designDimensions.width / projectData.designDimensions.height 
        : 1;
      
      const geometry = new window.THREE.PlaneGeometry(aspectRatio, 1);
      const material = new window.THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.9
      });

      const videoMesh = new window.THREE.Mesh(geometry, material);
      videoMesh.position.set(0, 0, 0);
      videoMesh.rotation.x = 0;
      
      videoMeshRef.current = videoMesh;
      anchor.group.add(videoMesh);

      // Video event listeners
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

      addDebugMessage('✅ Video mesh created successfully', 'success');

    } catch (error) {
      addDebugMessage(`❌ Video setup failed: ${error.message}`, 'error');
    }
  }, [projectData, addDebugMessage, throttledSetVideoPlaying]);

  // Initialize MindAR
  const initializeMindAR = useCallback(async (retryCount = 0, maxRetries = 3) => {
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    
    // Prevent multiple initializations
    if (mindarRef.current) {
      addDebugMessage('⚠️ MindAR already initialized, skipping...', 'warning');
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

    try {
      addDebugMessage('🚀 Initializing MindAR...', 'info');

      let targetUrl = projectData.designUrl;
      let targetType = 'image file';
      
      if (!targetUrl && projectData.mindTargetUrl) {
        targetUrl = projectData.mindTargetUrl;
        targetType = '.mind file';
      }
      
      if (!targetUrl) {
        throw new Error('No target image available');
      }

      addDebugMessage(`🎯 Using target: ${targetType}`, 'info');
      addDebugMessage(`🔗 Target URL: ${targetUrl}`, 'info');
      
      if (targetType === 'image file') {
        try {
          await validateImageForMindAR(targetUrl, addDebugMessage);
          targetUrl = await processImageForAR(targetUrl, addDebugMessage);
        } catch (validationError) {
          addDebugMessage(`❌ Image validation failed: ${validationError.message}`, 'error');
          throw new Error(`Image validation failed: ${validationError.message}`);
        }
      }

      // Create MindAR instance
      addDebugMessage('🔧 Creating MindAR instance...', 'info');
      
      const mindarConfig = {
        container: containerRef.current,
        imageTargetSrc: targetUrl,
        maxTrack: 1,
        filterMinCF: 0.00005,
        filterBeta: 0.002,
        warmupTolerance: 20,
        missTolerance: 20,
        facingMode: 'environment',
        resolution: { 
          width: Math.min(containerRef.current.offsetWidth, 480),
          height: Math.min(containerRef.current.offsetHeight, 360) 
        }
      };
      
      const mindar = new window.MindARThree.MindARThree(mindarConfig);
      mindarRef.current = mindar;

      const { renderer, scene, camera } = mindar;
      
      if (!renderer || !scene || !camera) {
        throw new Error('MindAR objects are undefined');
      }
      
      if (renderer.outputEncoding !== undefined) {
        delete renderer.outputEncoding;
      }
      renderer.outputColorSpace = window.THREE.SRGBColorSpace;
      
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      
      addDebugMessage('✅ MindAR objects validated and assigned', 'success');

      const anchor = mindar.addAnchor(0);
      anchorRef.current = anchor;

      if (projectData.videoUrl) {
        await setupVideo(anchor);
      }

      mindar.onTargetFound = () => {
        addDebugMessage('🎯 Target detected!', 'success');
        throttledSetTargetDetected(true);
      };

      mindar.onTargetLost = () => {
        addDebugMessage('🔍 Target lost', 'warning');
        throttledSetTargetDetected(false);
        throttledSetVideoPlaying(false);
      };

      // Start MindAR
      addDebugMessage('🚀 Starting MindAR...', 'info');
      
      // Request camera permission explicitly before starting MindAR
      try {
        addDebugMessage('📷 Requesting camera permission...', 'info');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        // Stop the test stream as MindAR will handle the camera
        stream.getTracks().forEach(track => track.stop());
        addDebugMessage('✅ Camera permission granted', 'success');
      } catch (permissionError) {
        addDebugMessage(`❌ Camera permission denied: ${permissionError.message}`, 'error');
        throw new Error(`Camera access denied: ${permissionError.message}`);
      }
      
      await mindar.start();
      addDebugMessage('✅ MindAR started successfully', 'success');
      
      setCameraActive(true);
      setArReady(true);
      setIsInitialized(true);
      
      return true;

    } catch (error) {
      addDebugMessage(`❌ MindAR initialization failed: ${error.message}`, 'error');
      setError(`AR initialization failed: ${error.message}`);
      return false;
    }
  }, [librariesLoaded, projectData, addDebugMessage, setError, setCameraActive, setArReady, setIsInitialized, setupVideo, throttledSetTargetDetected, throttledSetVideoPlaying]);

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
        addDebugMessage('⏸️ Video paused by user', 'info');
      } else {
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          try {
            await playPromise;
            addDebugMessage('▶️ Video started by user', 'success');
          } catch (playError) {
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
    addDebugMessage(`🔊 Video ${videoRef.current.muted ? 'muted' : 'unmuted'}`, 'info');
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
      
      // Clear other refs
      sceneRef.current = null;
      cameraRef.current = null;
      anchorRef.current = null;
      
      addDebugMessage('✅ AR cleanup completed', 'info');
    } catch (error) {
      addDebugMessage(`❌ Cleanup error: ${error.message}`, 'error');
    }
  }, [addDebugMessage]);

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
