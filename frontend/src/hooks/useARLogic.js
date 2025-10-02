/**
 * AR Logic Hook
 * Handles all AR initialization and management logic
 */

import { useRef, useCallback, useEffect } from 'react';
import { validateImageForMindAR, processImageForAR, fetchMindFile, base64ToUint8Array, isValidMindBuffer, throttle } from '../utils/arUtils';

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
        setVideoPlaying(true);
        addDebugMessage('▶️ Video started playing', 'success');
      });

      video.addEventListener('pause', () => {
        setVideoPlaying(false);
        addDebugMessage('⏸️ Video paused', 'info');
      });

      video.addEventListener('ended', () => {
        setVideoPlaying(false);
        addDebugMessage('🔚 Video ended', 'info');
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

    try {
      addDebugMessage('🚀 Initializing MindAR...', 'info');

      let targetUrl = projectData.designUrl;
      let targetType = 'image file';
      let mindBuffer = null;
      
      // Check if we have a composite design (design + QR code) - this is what we should use for AR tracking
      if (projectData.compositeDesignUrl) {
        targetUrl = projectData.compositeDesignUrl;
        addDebugMessage('🎯 Using composite design (design + QR code) for AR tracking', 'info');
      } else if (projectData.mindTargetUrl) {
        targetUrl = projectData.mindTargetUrl;
        targetType = '.mind file';
        addDebugMessage('🎯 Using .mind file for AR tracking', 'info');
      } else if (projectData.designUrl) {
        addDebugMessage('⚠️ Using original design image - QR code may not be embedded', 'warning');
        addDebugMessage('💡 Consider using composite design for better AR tracking', 'info');
      }
      
      if (!targetUrl) {
        throw new Error('No target image available');
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
          // Fetch .mind file as binary buffer
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
        facingMode: 'environment',
        resolution: { 
          width: Math.min(containerRef.current.offsetWidth, 480),
          height: Math.min(containerRef.current.offsetHeight, 360) 
        }
      };

      // Add specific configuration based on target type
      if (targetType === '.mind file' && mindBuffer) {
        // For .mind files, we can use the buffer directly
        mindarConfig.imageTargetSrc = mindBuffer;
        addDebugMessage('🔧 Using .mind buffer for MindAR', 'info');
      } else {
        // For image files, we need to ensure MindAR processes them correctly
        // The issue might be that MindAR is trying to process the image as a .mind file
        mindarConfig.imageTargetSrc = targetUrl;
        addDebugMessage('🔧 Using image URL for MindAR', 'info');
        addDebugMessage('⚠️ Note: Image files are processed by MindAR internally', 'info');
        
        // Add specific image processing hints
        if (targetUrl.includes('.png') || targetUrl.includes('.jpg') || targetUrl.includes('.jpeg')) {
          addDebugMessage('🖼️ Detected image format - MindAR will handle conversion', 'info');
        }
        
        // Try to use a different approach for image files
        // Some versions of MindAR require specific handling for images
        try {
          // Check if we can pre-process the image to avoid the buffer error
          addDebugMessage('🔧 Attempting to pre-process image for MindAR compatibility...', 'info');
          
          // Create a temporary image element to validate the image
          const testImg = new Image();
          testImg.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            testImg.onload = () => {
              addDebugMessage(`✅ Image validation successful: ${testImg.naturalWidth}x${testImg.naturalHeight}`, 'success');
              resolve();
            };
            testImg.onerror = () => {
              reject(new Error('Image validation failed'));
            };
            testImg.src = targetUrl;
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
        // For image files, try a different approach to avoid the buffer error
        if (targetType === 'image file') {
          addDebugMessage('🔧 Creating MindAR instance for image file...', 'info');
          
          // Try to create MindAR with a more specific configuration for images
          const imageConfig = {
            ...mindarConfig,
            // Remove any buffer-related properties
            imageTargetSrc: targetUrl
          };
          
          // Add specific image processing options
          if (window.MindARThree && window.MindARThree.MindARThree) {
            mindar = new window.MindARThree.MindARThree(imageConfig);
            mindarRef.current = mindar;
            addDebugMessage('✅ MindAR instance created successfully for image', 'success');
          } else {
            throw new Error('MindARThree not available');
          }
        } else {
          mindar = new window.MindARThree.MindARThree(mindarConfig);
          mindarRef.current = mindar;
          addDebugMessage('✅ MindAR instance created successfully', 'success');
        }
      } catch (mindarError) {
        addDebugMessage(`❌ MindAR creation failed: ${mindarError.message}`, 'error');
        
        // If it's a buffer error, try with a different approach
        if (mindarError.message.includes('Extra') && mindarError.message.includes('byte')) {
          addDebugMessage('🔄 Buffer error detected - trying alternative approach...', 'warning');
          addDebugMessage(`🔍 Error details: ${mindarError.message}`, 'info');
          
          if (targetType === '.mind file' && mindBuffer) {
            // For .mind files, try to validate and fix the buffer
            addDebugMessage('🔧 Attempting to fix .mind buffer...', 'info');
            
            try {
              // Check if buffer is valid
              if (!isValidMindBuffer(mindBuffer)) {
                throw new Error('Invalid .mind buffer format');
              }
              
              // Try with a fresh buffer copy
              const freshBuffer = new Uint8Array(mindBuffer);
              const fallbackConfig = {
                ...mindarConfig,
                imageTargetSrc: freshBuffer
              };
              
              mindar = new window.MindARThree.MindARThree(fallbackConfig);
              mindarRef.current = mindar;
              addDebugMessage('✅ MindAR instance created with fresh .mind buffer', 'success');
            } catch (bufferError) {
              addDebugMessage(`❌ .mind buffer fix failed: ${bufferError.message}`, 'error');
              throw new Error(`MindAR .mind file corrupted: ${mindarError.message}`);
            }
          } else {
            // For image files, the issue is that MindAR requires a .mind file, not a PNG
            addDebugMessage('❌ Buffer error: MindAR requires a .mind file, not an image file', 'error');
            addDebugMessage('📋 A .mind file is a pre-compiled AR target that MindAR uses for tracking', 'info');
            addDebugMessage('🔧 To fix this: Generate a .mind file from your image using MindAR CLI', 'info');
            addDebugMessage('💡 Run: npx @hiukim/mind-ar-js-cli image-target --input image.png', 'info');
            
            throw new Error(
              'MindAR requires a .mind file for AR tracking. ' +
              'Please generate a .mind file from your image using the MindAR CLI tool. ' +
              'Run: npx @hiukim/mind-ar-js-cli image-target --input your-image.png'
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

      if (projectData.videoUrl) {
        await setupVideo(anchor);
      }

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
      
      // Clean up any blob URLs that might have been created
      // Note: This is a best-effort cleanup as we don't track blob URLs
      // The browser will clean them up when the page unloads
      
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
