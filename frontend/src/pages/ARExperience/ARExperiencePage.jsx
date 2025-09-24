import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const ARExperiencePage = () => {
  const { userId } = useParams();
  const [isScanning, setIsScanning] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [firstInteractionDone, setFirstInteractionDone] = useState(false);
  const [redirectionListenerAdded, setRedirectionListenerAdded] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [socialLinks, setSocialLinks] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [arLoadingProgress, setArLoadingProgress] = useState(0);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  
  // AR variables
  const containerRef = useRef(null);
  const hasAutoStarted = useRef(false);
  const videoRef = useRef(null);
  const playVideoImageRef = useRef(null);
  const refreshButtonRef = useRef(null);
  const socialIconsRef = useRef(null);
  
  // AR objects
  const mindarThreeRef = useRef(null);
  const anchorRef = useRef(null);
  const videoMeshRef = useRef(null);
  const overlayMeshRef = useRef(null);
  const bottomRightOverlayMeshRef = useRef(null);

  useEffect(() => {
    fetchProjectData();
    
    // Load AR libraries dynamically
    loadARLibraries().catch(error => {
      console.error('❌ Failed to load AR libraries in useEffect:', error);
      setError('Failed to initialize AR system. Please refresh the page.');
    });
    
    
    return () => {
      // Cleanup AR resources
      if (mindarThreeRef.current) {
        try {
          // Only call stop if it's a MindAR instance with proper stop method
          if (mindarThreeRef.current.stop && typeof mindarThreeRef.current.stop === 'function') {
            mindarThreeRef.current.stop();
          }
          // Dispose renderer if it exists
          if (mindarThreeRef.current.renderer && mindarThreeRef.current.renderer.dispose) {
            mindarThreeRef.current.renderer.dispose();
            if (containerRef.current && mindarThreeRef.current.renderer.domElement) {
              containerRef.current.removeChild(mindarThreeRef.current.renderer.domElement);
            }
          }
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      }
      
      // Clean up global error handler
      if (window.mindarErrorHandler) {
        window.removeEventListener('unhandledrejection', window.mindarErrorHandler);
        delete window.mindarErrorHandler;
      }
      
      // Clean up camera streams
      const cameraFeeds = document.querySelectorAll('#camera-feed, #camera-feed-fallback');
      cameraFeeds.forEach(video => {
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      });
      
      // Also clean up any videos in the container
      if (containerRef.current) {
        const videos = containerRef.current.querySelectorAll('video');
        videos.forEach(video => {
          if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
          }
        });
      }
    };
  }, [userId]);

  // Auto-start AR experience when both project data and libraries are ready (only once)
  useEffect(() => {
    if (projectData && librariesLoaded && !isScanning && !hasAutoStarted.current) {
      console.log('🚀 Auto-starting AR experience - both project data and libraries are ready');
      hasAutoStarted.current = true; // Mark as started to prevent re-triggering
      handleStartScan();
    }
  }, [projectData, librariesLoaded, isScanning]);

  const loadARLibraries = async () => {
    try {
      // Load es-module-shims first
      if (!window.importShim) {
        const shimsScript = document.createElement('script');
        shimsScript.src = 'https://unpkg.com/es-module-shims@1.7.3/dist/es-module-shims.js';
        shimsScript.async = true;
        document.head.appendChild(shimsScript);
        
        await new Promise((resolve) => {
          shimsScript.onload = resolve;
        });
      }

      // Set up import map for Three.js and MindAR
      if (!document.querySelector('script[type="importmap"]')) {
        const importMap = document.createElement('script');
        importMap.type = 'importmap';
        importMap.textContent = JSON.stringify({
          "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
            "GLTFLoader": "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
            "RoomEnvironment": "https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js",
            "mindar-image-three": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
          }
        });
        document.head.appendChild(importMap);
      }

      // Load Hammer.js for touch support
      if (!window.Hammer) {
        const hammerScript = document.createElement('script');
        hammerScript.src = 'https://hammerjs.github.io/dist/hammer.min.js';
        document.head.appendChild(hammerScript);
        
        await new Promise((resolve) => {
          hammerScript.onload = resolve;
        });
      }

      // Wait for import map to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Load Three.js and MindAR using importShim
      if (!window.THREE) {
        window.THREE = await window.importShim('three');
      }

      if (!window.MindARThree) {
        const mindarModule = await window.importShim('mindar-image-three');
        window.MindARThree = mindarModule.MindARThree;
      }
      
      console.log('✅ AR libraries loaded successfully');
      setLibrariesLoaded(true);
      
    } catch (error) {
      console.error('❌ Error loading AR libraries:', error);
      setError('Failed to load AR libraries. Please refresh the page and try again.');
      setLibrariesLoaded(false);
    }
  };

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const fullUrl = `${apiUrl}/qr/project-data/${userId}`;
      
      console.log('🌐 Fetching project data from:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('✅ Project data fetched successfully:', result.data);
        setProjectData(result.data);
        setSocialLinks(result.data.socialLinks);
      } else {
        console.error('❌ API returned error:', result.message);
        throw new Error(result.message || 'API returned error status');
      }
    } catch (error) {
      console.error('❌ Error fetching project data:', error);
      
      // Determine error type and show appropriate message
      let errorMessage = 'Using demo mode - ';
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage += 'API request timed out';
      } else if (error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('Failed to fetch')) {
        errorMessage += 'Backend server is not running';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      
      // Fallback to mock data with better structure
      const mockProjectData = {
        id: userId,
        username: 'demo_user',
        designUrl: "https://res.cloudinary.com/dzax35hss/image/upload/v1712341263/bharani_newpng_vukiuy.png",
        videoUrl: "https://res.cloudinary.com/dbtfsltkv/video/upload/v1712299085/Untitled_design_1_ongdtf.mp4",
        socialLinks: {
          instagram: "https://www.instagram.com/nerdsandgeeks.pvt.ltd/",
          website: "https://nerdsandgeeks.in/",
          facebook: "https://www.facebook.com/nerdsandgeeks.pvt.ltd/"
        },
        designDimensions: {
          width: 800,
          height: 600,
          aspectRatio: 800 / 600
        },
        qrPosition: { x: 0, y: 0, scale: 1 }
      };
      
      console.log('🔄 Using fallback mock data:', mockProjectData);
      setProjectData(mockProjectData);
      setSocialLinks(mockProjectData.socialLinks);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAR = async () => {
    try {
      if (!projectData) {
        console.error('❌ Project data missing');
        throw new Error('Project data not available');
      }

      if (!librariesLoaded) {
        console.log('⏳ Waiting for AR libraries to load...');
        // Wait for libraries to be loaded
        let attempts = 0;
        const maxAttempts = 100; // Increased timeout
        
        while (attempts < maxAttempts && !librariesLoaded) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!librariesLoaded) {
          throw new Error('AR libraries failed to load within timeout');
        }
      }

      setArLoadingProgress(30);

      // Double-check that libraries are available on window object
      if (!window.THREE || !window.MindARThree) {
        console.error('❌ AR libraries not found on window object');
        throw new Error('AR libraries not properly initialized');
      }
      
      console.log('✅ AR libraries confirmed available');

      setArLoadingProgress(40);

      const THREE = window.THREE;
      const { MindARThree } = window;

      // Ensure container is properly sized and visible
      if (!containerRef.current) {
        throw new Error('AR container not found');
      }

      setArLoadingProgress(50);

      // Set container dimensions explicitly
      containerRef.current.style.width = '100vw';
      containerRef.current.style.height = '100vh';
      containerRef.current.style.position = 'fixed';
      containerRef.current.style.top = '0';
      containerRef.current.style.left = '0';
      containerRef.current.style.zIndex = '1';

      console.log('Container dimensions:', {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
        clientWidth: containerRef.current.clientWidth,
        clientHeight: containerRef.current.clientHeight
      });

      // Convert S3 URLs to use proxy for CORS
      const designUrl = projectData.designUrl.replace(
        'https://phygital-zone.s3.amazonaws.com',
        '/s3-proxy'
      );

      console.log('Using design URL:', designUrl);

      // Test if image loads properly and optimize for MindAR
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('✅ Image loaded successfully:', {
              width: img.width,
              height: img.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              src: img.src,
              complete: img.complete
            });
            
            // Check if image dimensions are suitable for MindAR
            const isOptimalSize = img.naturalWidth >= 512 && img.naturalHeight >= 512 && 
                                 img.naturalWidth <= 2048 && img.naturalHeight <= 2048;
            
            if (!isOptimalSize) {
              console.warn('⚠️ Image dimensions may not be optimal for AR tracking:', {
                current: { width: img.naturalWidth, height: img.naturalHeight },
                recommended: 'Between 512x512 and 2048x2048 pixels'
              });
            }
            
            resolve();
          };
          img.onerror = (error) => {
            console.error('❌ Image failed to load:', error);
            console.error('Failed URL:', designUrl);
            reject(new Error(`Failed to load design image from: ${designUrl}`));
          };
          img.src = designUrl;
        });

        setArLoadingProgress(60);

        // Initialize proper AR experience with image tracking
        console.log('Initializing AR experience with image tracking');
        console.log('📋 MindAR Image Requirements:');
        console.log('- Image should be at least 512x512 pixels');
        console.log('- High contrast and clear features work best');
        console.log('- Avoid heavily compressed images');
        console.log('- PNG or JPG formats are supported');
        
        // Show user-friendly message about AR mode
        setError('AR Mode: Point your camera at the printed design to see the video overlay.');
        
        // Initialize MindAR with optimized settings
        try {
          console.log('🎯 Initializing MindAR with design URL:', designUrl);
          console.log('🔧 Using optimized MindAR settings for better stability');
          
          // Create optimized MindAR configuration
          const mindarConfig = {
            container: containerRef.current,
            imageTargetSrc: designUrl,
            maxTrack: 1,
            // Optimized parameters to reduce buffer errors
            filterMinCF: 0.01,      // Higher value for more stable tracking
            filterBeta: 0.1,        // Higher value for smoother tracking
            warmupTolerance: 0.1,   // More tolerant warmup
            missTolerance: 1.0,     // More tolerant miss detection
            // Additional stability settings
            uiLoading: "no",        // Disable default loading UI
            uiScanning: "no",       // Disable default scanning UI
            uiError: "no"           // Disable default error UI
          };
          
          console.log('🎯 MindAR Configuration:', mindarConfig);
          mindarThreeRef.current = new MindARThree(mindarConfig);

          const { renderer, scene, camera } = mindarThreeRef.current;
          const anchor = mindarThreeRef.current.addAnchor(0);
          anchorRef.current = anchor;
          
          // Set renderer background to transparent so camera feed shows through
          renderer.setClearColor(0x000000, 0);
          
          // Add a simple, visible camera feed for AR mode
          const cameraVideo = document.createElement('video');
          cameraVideo.id = 'camera-feed';
          cameraVideo.style.position = 'fixed';
          cameraVideo.style.top = '0';
          cameraVideo.style.left = '0';
          cameraVideo.style.width = '100vw';
          cameraVideo.style.height = '100vh';
          cameraVideo.style.objectFit = 'cover';
          cameraVideo.style.zIndex = '0'; // Behind AR content but visible
          cameraVideo.autoplay = true;
          cameraVideo.muted = true;
          cameraVideo.playsInline = true;
          cameraVideo.style.backgroundColor = '#000'; // Fallback background
          
          // Add to body instead of container to ensure visibility
          document.body.appendChild(cameraVideo);
          
          setArLoadingProgress(70);

          // Get user media for camera feed
          navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            } 
          })
            .then(stream => {
              cameraVideo.srcObject = stream;
              setCameraActive(true);
              setArLoadingProgress(80);
              console.log('Camera feed added for AR mode - user can see themselves');
              
              // Also add to Three.js scene as texture
              const videoTexture = new THREE.VideoTexture(cameraVideo);
              const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
              const backgroundMaterial = new THREE.MeshBasicMaterial({ 
                map: videoTexture,
                side: THREE.DoubleSide
              });
              const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
              backgroundMesh.position.z = -1;
              scene.add(backgroundMesh);
            })
            .catch(err => {
              console.warn('Could not access camera for AR mode:', err);
              setCameraActive(false);
              // Remove the video element if camera fails
              if (cameraVideo.parentNode) {
                cameraVideo.parentNode.removeChild(cameraVideo);
              }
            });
          
          console.log('✅ MindAR initialized with user design:', designUrl);
          console.log('MindAR instance details:', {
            hasStart: !!mindarThreeRef.current.start,
            hasAddAnchor: !!mindarThreeRef.current.addAnchor,
            hasRenderer: !!mindarThreeRef.current.renderer,
            hasScene: !!mindarThreeRef.current.scene,
            hasCamera: !!mindarThreeRef.current.camera
          });
          
        } catch (mindarError) {
          console.warn('MindAR initialization failed, falling back to basic mode:', mindarError);
          
          // Check if it's a buffer error (common with certain image formats)
          if (mindarError.message && mindarError.message.includes('byte')) {
            console.warn('🔧 Buffer error detected - this usually means the image needs optimization');
            setError('Image Format Issue: Your design image may need optimization. Using basic mode for now.');
          } else {
            setError('Basic Mode: Video will play automatically. AR tracking requires design optimization.');
          }
          
          // Fallback to basic Three.js scene with camera feed
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
          const renderer = new THREE.WebGLRenderer({ alpha: true });
          
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setClearColor(0x000000, 0); // Transparent background
          containerRef.current.appendChild(renderer.domElement);
          
          // Add a simple, visible camera feed for fallback mode
          const cameraVideo = document.createElement('video');
          cameraVideo.id = 'camera-feed-fallback';
          cameraVideo.style.position = 'fixed';
          cameraVideo.style.top = '0';
          cameraVideo.style.left = '0';
          cameraVideo.style.width = '100vw';
          cameraVideo.style.height = '100vh';
          cameraVideo.style.objectFit = 'cover';
          cameraVideo.style.zIndex = '0'; // Behind content but visible
          cameraVideo.autoplay = true;
          cameraVideo.muted = true;
          cameraVideo.playsInline = true;
          cameraVideo.style.backgroundColor = '#000'; // Fallback background
          
          // Add to body instead of container to ensure visibility
          document.body.appendChild(cameraVideo);
          
          // Get user media for camera feed
          navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            } 
          })
            .then(stream => {
              cameraVideo.srcObject = stream;
              setCameraActive(true);
              console.log('Camera feed added for fallback mode - user can see themselves');
              
              // Also add to Three.js scene as texture
              const videoTexture = new THREE.VideoTexture(cameraVideo);
              const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
              const backgroundMaterial = new THREE.MeshBasicMaterial({ 
                map: videoTexture,
                side: THREE.DoubleSide
              });
              const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
              backgroundMesh.position.z = -1;
              scene.add(backgroundMesh);
            })
            .catch(err => {
              console.warn('Could not access camera for fallback mode:', err);
              setCameraActive(false);
              // Remove the video element if camera fails
              if (cameraVideo.parentNode) {
                cameraVideo.parentNode.removeChild(cameraVideo);
              }
            });
          
          mindarThreeRef.current = { renderer, scene, camera };
          
          // Set anchorRef to null for fallback mode
          anchorRef.current = null;
          
          // For fallback mode, we'll show the video immediately
          setFallbackMode(true);
          
          // In fallback mode, start the render loop immediately
          const fallbackAnimate = () => {
            requestAnimationFrame(fallbackAnimate);
            renderer.render(scene, camera);
          };
          fallbackAnimate();
        }
        
        // Add global error handler for unhandled MindAR errors
        const handleUnhandledRejection = (event) => {
          if (event.reason && event.reason.message && event.reason.message.includes('Extra') && event.reason.message.includes('byte')) {
            console.warn('MindAR buffer error detected, switching to fallback mode');
            setFallbackMode(true);
            setError('Basic Mode: Video will play automatically. AR tracking requires design optimization.');
            event.preventDefault(); // Prevent the error from showing in console
          }
        };
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        
        // Store the handler for cleanup
        window.mindarErrorHandler = handleUnhandledRejection;
        
        // Create video element and texture
        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        
        // Convert S3 video URL to use proxy for CORS
        const videoUrl = projectData.videoUrl.replace(
          'https://phygital-zone.s3.amazonaws.com',
          '/s3-proxy'
        );
        
        // Don't set src or load immediately - wait for user interaction
        video.muted = false;
        video.loop = false;
        video.playsInline = true;
        video.autoplay = false; // Explicitly disable autoplay
        video.preload = 'none'; // Don't preload the video
        videoRef.current = video;
        
        console.log('Using video URL:', videoUrl);
        
        // Wait for video to be ready before creating texture
        const createVideoTexture = () => {
          return new Promise((resolve, reject) => {
            console.log('🎬 Starting video texture creation...');
            
            // Only load the video when user starts AR experience
            if (!video.src) {
              video.src = videoUrl;
              video.load();
              console.log('Video source set and loading started');
            }
            
            const checkVideoReady = () => {
              try {
                console.log('Checking video ready state:', {
                  readyState: video.readyState,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  src: video.src,
                  currentTime: video.currentTime,
                  duration: video.duration
                });
                
                if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                  console.log('✅ Video is ready for texture creation!');
                  
                  // Create video texture and mesh
                  const texture = new THREE.VideoTexture(video);
                  texture.colorSpace = THREE.SRGBColorSpace;
                  texture.toneMapped = false;
                  texture.format = THREE.RGBAFormat;
                  texture.needsUpdate = true;
                  
                  // Calculate proper aspect ratio for video
                  const videoAspect = video.videoWidth / video.videoHeight;
                  console.log('Video aspect ratio:', videoAspect);
                  
                  const geometry = new THREE.PlaneGeometry(0.32, 0.44); // Use project dimensions
                  
                  const material = new THREE.MeshBasicMaterial({ 
                    map: texture,
                    transparent: false,
                    side: THREE.DoubleSide,
                    color: 0xffffff,
                  });
                  
                  const videoMesh = new THREE.Mesh(geometry, material);
                  videoMesh.position.set(0, 0, 0);
                  videoMesh.scale.set(3.25, 3.25, 3.25);
                  
                  console.log('Video mesh created with:', {
                    geometry: geometry.parameters,
                    position: videoMesh.position,
                    scale: videoMesh.scale
                  });
                  
                  // Add to anchor if available, otherwise to scene
                  if (anchorRef.current && anchorRef.current.group) {
                    anchorRef.current.group.add(videoMesh);
                    console.log('✅ Video mesh added to AR anchor');
                  } else if (mindarThreeRef.current && mindarThreeRef.current.scene) {
                    mindarThreeRef.current.scene.add(videoMesh);
                    videoMesh.position.z = -2;
                    console.log('✅ Video mesh added to scene (fallback)');
                  } else {
                    console.error('❌ No valid scene or anchor to add video mesh to');
                    reject(new Error('No valid scene or anchor'));
                    return;
                  }
                  
                  videoMeshRef.current = videoMesh;
                  videoMesh.visible = false; // Start hidden until image is detected
                  
                  // Add click handler to start video manually
                  videoMesh.userData = { isVideo: true };
                  
                  console.log('✅ Video mesh created successfully and added to scene');
                  resolve({ texture, videoMesh });
                } else {
                  console.log('⏳ Waiting for video to be ready...');
                  setTimeout(checkVideoReady, 100);
                }
              } catch (error) {
                console.error('❌ Error in checkVideoReady:', error);
                reject(error);
              }
            };
            checkVideoReady();
          });
        };
        
        // Position camera (only if we have a camera reference)
        if (mindarThreeRef.current && mindarThreeRef.current.camera) {
          mindarThreeRef.current.camera.position.z = 0;
        }
        
        // Start render loop with enhanced AR tracking and video control
        let videoTexture = null;
        let lastAnchorVisible = false;
        let videoPlaybackState = {
          wasPlayingBeforePause: false,
          currentTime: 0,
          hasUserInteracted: false
        };
        
        const animate = () => {
          requestAnimationFrame(animate);
          
          // Update video texture if it exists
          if (videoTexture && video.readyState >= 2) {
            videoTexture.needsUpdate = true;
          }
          
          // Enhanced AR tracking logic with smart video control
          try {
            if (fallbackMode || !anchorRef.current) {
              // In fallback mode, show video but don't auto-play
              if (videoMeshRef.current) {
                videoMeshRef.current.visible = true;
              }
              // Only log occasionally to avoid spam
              if (Math.random() < 0.01) {
                console.log('Fallback mode - video ready but waiting for user interaction');
              }
            } else if (anchorRef.current) {
              const anchorVisible = anchorRef.current.visible;
              const videoMeshExists = !!videoMeshRef.current;
              const videoExists = !!video;
              
              // Detect anchor visibility changes
              const anchorVisibilityChanged = anchorVisible !== lastAnchorVisible;
              lastAnchorVisible = anchorVisible;
              
              if (anchorVisible) {
                // 🎯 DESIGN DETECTED - Show video and handle playback
                console.log('🎯 Design detected! Showing video overlay...');
                
                if (videoMeshRef.current) {
                  // Calculate dynamic scale based on physical design dimensions
                  const dynamicScale = calculateDynamicScale();
                  
                  // Apply dynamic scaling to match physical design size
                  videoMeshRef.current.scale.set(
                    dynamicScale.scaleX * 3.25, 
                    dynamicScale.scaleY * 3.25, 
                    1
                  );
                  
                  videoMeshRef.current.visible = true;
                  console.log('✅ Video mesh scaled and made visible');
                }
                
                // Smart video playback control
                if (video && !videoEnded) {
                  if (anchorVisibilityChanged && video.paused) {
                    // Design just became visible - resume video
                    if (videoPlaybackState.wasPlayingBeforePause || !videoPlaybackState.hasUserInteracted) {
                      video.currentTime = videoPlaybackState.currentTime;
                      video.play().then(() => {
                        console.log('🎬 Video resumed - design detected');
                        videoPlaybackState.hasUserInteracted = true;
                      }).catch(e => {
                        console.error('❌ Video resume failed:', e);
                      });
                    }
                  }
                }
              } else {
                // 📱 DESIGN NOT DETECTED - Hide video and pause playback
                if (anchorVisibilityChanged) {
                  console.log('📱 Design lost - hiding video and pausing playback');
                }
                
                if (videoMeshRef.current) {
                  videoMeshRef.current.visible = false; // Hide video until design is detected
                }
                
                // Smart video pause control
                if (video && !video.paused && !videoEnded) {
                  if (anchorVisibilityChanged) {
                    // Design just became invisible - pause video and save state
                    videoPlaybackState.wasPlayingBeforePause = true;
                    videoPlaybackState.currentTime = video.currentTime;
                    video.pause();
                    console.log('⏸️ Video paused - design not detected (saved time:', videoPlaybackState.currentTime, ')');
                  }
                }
                
                // Only log occasionally to avoid spam
                if (Math.random() < 0.005) {
                  console.log('📱 Waiting for design to be detected...');
                }
              }
            } else {
              console.log('No anchor reference available');
            }
          } catch (error) {
            console.error('Error in AR tracking logic:', error);
          }
          
          // Render the scene
          if (mindarThreeRef.current && mindarThreeRef.current.renderer) {
            mindarThreeRef.current.renderer.render(mindarThreeRef.current.scene, mindarThreeRef.current.camera);
          }
        };
        animate();
        
        setArLoadingProgress(85);

        // Create video texture after video is ready
        createVideoTexture().then(({ texture, videoMesh }) => {
          console.log('✅ Video texture and mesh created successfully');
          console.log('Video mesh details:', {
            exists: !!videoMesh,
            visible: videoMesh ? videoMesh.visible : 'no mesh',
            position: videoMesh ? videoMesh.position : 'no mesh',
            scale: videoMesh ? videoMesh.scale : 'no mesh'
          });
          videoTexture = texture; // Store reference for render loop
          setArLoadingProgress(90);
          
          // Start AR tracking
          if (mindarThreeRef.current.start) {
            console.log('🚀 Starting AR tracking...');
            mindarThreeRef.current.start().then(() => {
              console.log('✅ AR tracking started successfully');
              console.log('🎯 Setting AR loading progress to 100% (AR success)');
              setArLoadingProgress(100);
              setError('AR Ready: Point your camera at the printed design to see the video overlay.');
            }).catch(e => {
              console.error('❌ Failed to start AR tracking:', e);
              console.warn('🔄 Switching to fallback mode due to AR start failure');
              setFallbackMode(true);
              console.log('🎯 Setting AR loading progress to 100% (fallback mode)');
              setArLoadingProgress(100);
              console.log('📊 Current arLoadingProgress should now be 100');
              setError('Basic Mode: Video will play automatically. AR tracking requires design optimization.');
            });
          } else {
            console.error('❌ No start method available on MindAR instance');
            setArLoadingProgress(100);
          }
        }).catch(error => {
          console.error('❌ Failed to create video texture:', error);
        });
        
        // Video will be controlled by AR tracking
        console.log("Video ready for AR tracking");
        
        // Add video event listeners for debugging
        video.addEventListener('loadstart', () => console.log('Video load started'));
        video.addEventListener('loadeddata', () => console.log('Video data loaded'));
        video.addEventListener('canplay', () => console.log('Video can play'));
        video.addEventListener('playing', () => console.log('Video is playing'));
        video.addEventListener('error', (e) => console.error('Video error:', e));

      } catch (imageError) {
        console.error('Image loading error:', imageError);
        setError('Failed to load design image for AR tracking. Please ensure your design image is in a supported format (PNG, JPG) and try again.');
        return;
      }

      // Video is already created and added to scene in the basic AR setup above
      // No need for additional video setup here

      // Setup video event listeners
      if (videoRef.current) {
        videoRef.current.addEventListener('ended', () => {
          setVideoEnded(true);
          videoRef.current.pause();
          setTimeout(() => {
            if (refreshButtonRef.current) {
              refreshButtonRef.current.style.display = "block";
            }
          }, 1000);
        });

        // iOS play button handler
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS && playVideoImageRef.current) {
          playVideoImageRef.current.addEventListener('click', () => {
            if (videoRef.current.paused && !videoEnded) {
              videoRef.current.play();
              playVideoImageRef.current.style.display = "none";
              setFirstInteractionDone(true);
            }
          });
        }
      }

      // Basic AR is already running with the render loop
      console.log('Basic AR experience initialized successfully');

    } catch (error) {
      console.error('Error initializing AR:', error);
      setError('Failed to initialize AR experience');
    }
  };

  const calculateDynamicScale = () => {
    if (!anchorRef.current || !projectData) return { scaleX: 1, scaleY: 1 };
    
    // Get the detected anchor dimensions from MindAR
    const anchor = anchorRef.current;
    const anchorMatrix = anchor.group.matrix;
    const scale = anchor.group.scale;
    
    // Calculate the actual detected size in the real world
    const detectedWidth = Math.abs(scale.x);
    const detectedHeight = Math.abs(scale.y);
    
    // Base dimensions from project data (original design dimensions when uploaded)
    const baseWidth = projectData.designDimensions?.width || 0.32;
    const baseHeight = projectData.designDimensions?.height || 0.44;
    
    // Calculate scale factors for both dimensions
    const scaleFactorX = detectedWidth / baseWidth;
    const scaleFactorY = detectedHeight / baseHeight;
    
    // Use individual scale factors to maintain aspect ratio
    // This allows the video to adapt to different physical design sizes
    const finalScaleX = Math.max(0.1, Math.min(10.0, scaleFactorX)); // Clamp between 0.1x and 10x
    const finalScaleY = Math.max(0.1, Math.min(10.0, scaleFactorY)); // Clamp between 0.1x and 10x
    
    console.log('🎯 Dynamic Dimension Mapping:', {
      detectedSize: { width: detectedWidth, height: detectedHeight },
      baseSize: { width: baseWidth, height: baseHeight },
      scaleFactors: { x: scaleFactorX, y: scaleFactorY },
      finalScale: { x: finalScaleX, y: finalScaleY },
      physicalAdaptation: 'Video will adapt to physical design size'
    });
    
    return {
      scaleX: finalScaleX,
      scaleY: finalScaleY
    };
  };

  const handleAnchorVisible = () => {
    // Calculate dynamic scale based on detected dimensions
    const dynamicScale = calculateDynamicScale();
    
    // Apply dynamic scaling to video mesh
    if (videoMeshRef.current) {
      videoMeshRef.current.scale.set(
        dynamicScale.scaleX * 3.25, 
        dynamicScale.scaleY * 3.25, 
        1
      );
    }
    
    if (!overlayMeshRef.current) {
      createOverlayMesh();
    }
    
    if ((videoRef.current.duration - videoRef.current.currentTime <= 5) && 
        !redirectionListenerAdded && !videoEnded) {
      if (!bottomRightOverlayMeshRef.current) {
        createBottomRightOverlayMesh();
        bottomRightOverlayMeshRef.current.visible = true;
      }
      setRedirectionListenerAdded(true);
    }
    
    if (socialIconsRef.current) {
      socialIconsRef.current.style.display = "block";
    }
    
    videoMeshRef.current.visible = true;
    if (overlayMeshRef.current) overlayMeshRef.current.visible = true;
    
    if (videoRef.current.paused && !videoEnded) {
      videoRef.current.play().catch(e => {
        console.log("Auto-play failed due to browser restrictions", e);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS && playVideoImageRef.current) {
          playVideoImageRef.current.style.display = "block";
        }
      });
    }
  };

  const handleAnchorHidden = () => {
    // Hide video and overlays when design is not detected
    if (videoMeshRef.current) {
      videoMeshRef.current.visible = false;
    }
    if (overlayMeshRef.current) {
      overlayMeshRef.current.visible = false;
    }
    if (bottomRightOverlayMeshRef.current) {
      bottomRightOverlayMeshRef.current.visible = false;
    }
    
    // Pause video when camera moves away from design
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      console.log('Video paused - design not detected');
    }
    
    // Hide social icons
    if (socialIconsRef.current) {
      socialIconsRef.current.style.display = "none";
    }
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && playVideoImageRef.current) {
      playVideoImageRef.current.style.display = "none";
    }
  };

  const createOverlayMesh = () => {
    const overlayMaterial = new THREE.MeshBasicMaterial({
      opacity: 0,      
      transparent: true
    });
    const overlayGeometry = new THREE.PlaneGeometry(0.55, 0.22);
    overlayMeshRef.current = new THREE.Mesh(overlayGeometry, overlayMaterial);

    const xOffset = (videoMeshRef.current.geometry.parameters.width * videoMeshRef.current.scale.x) / 2;
    const yOffset = (videoMeshRef.current.geometry.parameters.height * videoMeshRef.current.scale.y) / 2;
    overlayMeshRef.current.position.x = videoMeshRef.current.position.x - xOffset + (overlayMeshRef.current.geometry.parameters.width * overlayMeshRef.current.scale.x) / 2;
    overlayMeshRef.current.position.y = videoMeshRef.current.position.y + yOffset - (overlayMeshRef.current.geometry.parameters.height * overlayMeshRef.current.scale.y) / 2;
    overlayMeshRef.current.position.z = videoMeshRef.current.position.z + 0.01;
      
    anchorRef.current.group.add(overlayMeshRef.current);
    overlayMeshRef.current.visible = true;
  };

  const createBottomRightOverlayMesh = () => {
    const bottomRightOverlayMaterial = new THREE.MeshBasicMaterial({
      opacity: 0,
      transparent: true
    });
    const bottomRightOverlayGeometry = new THREE.PlaneGeometry(1.0, 1.11);
    bottomRightOverlayMeshRef.current = new THREE.Mesh(bottomRightOverlayGeometry, bottomRightOverlayMaterial);
    
    const videoHeightHalf = (videoMeshRef.current.geometry.parameters.height * videoMeshRef.current.scale.y) / 2;
    const overlayHeightHalf = (bottomRightOverlayMeshRef.current.geometry.parameters.height * bottomRightOverlayMeshRef.current.scale.y) / 2;

    bottomRightOverlayMeshRef.current.position.x = videoMeshRef.current.position.x;
    bottomRightOverlayMeshRef.current.position.y = videoMeshRef.current.position.y - videoHeightHalf + overlayHeightHalf;
    bottomRightOverlayMeshRef.current.position.z = videoMeshRef.current.position.z + 0.01;
       
    anchorRef.current.group.add(bottomRightOverlayMeshRef.current);
    bottomRightOverlayMeshRef.current.visible = true;
  };

  const handleStartScan = async () => {
    try {
      setIsScanning(true);
      setError(null);
      setFallbackMode(false); // Reset fallback mode
      setArLoadingProgress(0);
      
      // Small delay to ensure DOM is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      setArLoadingProgress(20);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AR initialization timeout')), 15000); // 15 second timeout
      });
      
      await Promise.race([initializeAR(), timeoutPromise]);
      
      // AR initialization completed successfully
      console.log('🎉 AR initialization completed successfully');
      setArLoadingProgress(100);
      setIsScanning(false); // Make sure scanning state is reset
      
      // Force a small delay to ensure state updates are processed
      setTimeout(() => {
        console.log('🔄 Final state check - arLoadingProgress should be 100, isScanning should be false');
      }, 100);
    } catch (error) {
      console.error('Error starting AR scan:', error);
      if (error.message === 'AR initialization timeout') {
        setError('AR initialization is taking too long. Please try again or check your internet connection.');
      } else {
        setError('Failed to start AR experience. Please try again.');
      }
      setIsScanning(false);
      setArLoadingProgress(0);
    }
  };

  const handleRetry = () => {
    // Reset all states and restart
    setIsScanning(false);
    setError(null);
    setFallbackMode(false);
    setCameraActive(false);
    hasAutoStarted.current = false; // Reset auto-start flag
    
    // Clean up camera feeds
    const cameraFeeds = document.querySelectorAll('#camera-feed, #camera-feed-fallback');
    cameraFeeds.forEach(video => {
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    });
    
    // Clean up existing AR resources
    if (mindarThreeRef.current) {
      try {
        if (mindarThreeRef.current.stop && typeof mindarThreeRef.current.stop === 'function') {
          mindarThreeRef.current.stop();
        }
        if (mindarThreeRef.current.renderer && mindarThreeRef.current.renderer.dispose) {
          mindarThreeRef.current.renderer.dispose();
          if (containerRef.current && mindarThreeRef.current.renderer.domElement) {
            containerRef.current.removeChild(mindarThreeRef.current.renderer.domElement);
          }
        }
      } catch (error) {
        console.warn('Error during retry cleanup:', error);
      }
    }
    
    // Clear refs
    mindarThreeRef.current = null;
    anchorRef.current = null;
    videoMeshRef.current = null;
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleContainerClick = (event) => {
    if (!mindarThreeRef.current) return;

    event.preventDefault();
    
    // Enhanced click handling for both AR and fallback modes
    if (fallbackMode) {
      // In fallback mode, any click plays/pauses the video
      if (videoRef.current) {
        if (videoRef.current.paused) {
          console.log('🎬 Fallback mode: Playing video on click');
          videoRef.current.play().catch(e => console.error('Video play failed:', e));
        } else {
          console.log('⏸️ Fallback mode: Pausing video on click');
          videoRef.current.pause();
        }
        return;
      }
    }

    // AR mode click handling
    const { renderer, camera } = mindarThreeRef.current;

    const mouse = new THREE.Vector2(
      (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
      -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Check for video mesh clicks first
    if (videoMeshRef.current && videoMeshRef.current.visible) {
      const intersectsVideo = raycaster.intersectObject(videoMeshRef.current, true);
      if (intersectsVideo.length > 0 && videoRef.current) {
        if (videoRef.current.paused) {
          console.log('🎬 AR mode: Video clicked - starting playback');
          videoRef.current.play().catch(e => console.error('Video play failed:', e));
        } else {
          console.log('⏸️ AR mode: Video clicked - pausing playback');
          videoRef.current.pause();
        }
        return;
      }
    }

    // Check for overlay clicks
    if (overlayMeshRef.current) {
      const intersectsFirst = raycaster.intersectObject(overlayMeshRef.current, true);
      if (intersectsFirst.length > 0 && projectData) {
        window.open(projectData.socialLinks.website, '_blank');
        return;
      }
    }

    if (bottomRightOverlayMeshRef.current) {
      const intersectsSecond = raycaster.intersectObject(bottomRightOverlayMeshRef.current, true);
      if (intersectsSecond.length > 0 && projectData) {
        window.open(projectData.socialLinks.linkedin || projectData.socialLinks.website, '_blank');
        return;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading AR Experience...</div>
        </div>
      </div>
    );
  }

  if (error && !projectData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-lg mb-4">⚠️ {error}</div>
          
          {error.includes('Backend server is not running') && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <h3 className="text-yellow-400 font-semibold mb-2">Backend Server Issue</h3>
              <p className="text-yellow-300 text-sm mb-2">
                The backend server is not running. To fix this:
              </p>
              <ol className="text-yellow-300 text-sm text-left list-decimal list-inside space-y-1">
                <li>Open terminal in the backend folder</li>
                <li>Run: <code className="bg-gray-800 px-1 rounded">npm start</code></li>
                <li>Wait for "Backend running on port 5000"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
          
          {error.includes('Image Format Issue') && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h3 className="text-blue-400 font-semibold mb-2">Image Optimization Needed</h3>
              <p className="text-blue-300 text-sm">
                Your design image may need optimization for AR tracking. 
                Try using a high-contrast image with clear features.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mr-2"
            >
              Retry
            </button>
            <button 
              onClick={() => setError(null)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Continue with Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white py-3 px-4 sm:py-4 sm:px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-lg sm:text-2xl font-bold text-center">Phygital</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {!isScanning ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  AR Experience Ready
                </h2>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Point your camera at the design to start the AR experience. 
                  Once the design is detected, click on the video to start playback.
                </p>
              </div>
              
              <button
                onClick={handleStartScan}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 sm:py-4 sm:px-10 rounded-full flex items-center gap-3 transition-all duration-300 shadow-lg text-lg sm:text-xl mx-auto"
              >
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Start AR Experience</span>
              </button>

              <div className="mt-8 text-gray-400 text-sm">
                <p>📱 Best experienced on mobile devices</p>
                <p>🎯 Point camera at the printed design to start</p>
                <p>👆 Click on the video to start playback</p>
                <p>⏸️ Video pauses when camera moves away</p>
                {cameraActive ? (
                  <p className="text-green-400 mt-2">📹 Camera is active - you can see yourself</p>
                ) : (
                  <p className="text-yellow-400 mt-2">📹 Camera is starting...</p>
                )}
                {fallbackMode ? (
                  <p className="text-blue-400 mt-2">🔄 Basic Mode: Click on the video to start playback</p>
                ) : (
                  <p className="text-green-400 mt-2">✅ AR Mode: Point camera at printed design, then click video to play</p>
                )}
              </div>

              {/* Retry Button - Show when there's an error */}
              {error && error.includes('Basic Mode') && (
                <div className="mt-6">
                  <button
                    onClick={handleRetry}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-all duration-300 shadow-lg"
                  >
                    Retry AR Experience
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* AR Loading Overlay */}
            {arLoadingProgress < 100 && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-lg font-semibold mb-2">Initializing AR Experience...</div>
                  <div className="w-64 bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${arLoadingProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-300 mb-4">
                    {!librariesLoaded && "Loading AR libraries..."}
                    {librariesLoaded && arLoadingProgress < 20 && "Libraries loaded, preparing AR..."}
                    {librariesLoaded && arLoadingProgress >= 20 && arLoadingProgress < 50 && "Setting up camera..."}
                    {librariesLoaded && arLoadingProgress >= 50 && arLoadingProgress < 80 && "Initializing video..."}
                    {librariesLoaded && arLoadingProgress >= 80 && arLoadingProgress < 100 && "Finalizing setup..."}
                  </div>
                  <button
                    onClick={handleRetry}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* AR Container */}
            <div 
              ref={containerRef}
              className="w-full h-full absolute inset-0"
              style={{
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 1
              }}
              onClick={handleContainerClick}
            />
            
            {/* Enhanced Status Indicator */}
            <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg max-w-xs">
              {cameraActive ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <div className="text-sm font-medium">Camera Active</div>
                    {fallbackMode ? (
                      <div className="text-xs text-yellow-300">Basic Mode - Click video to play</div>
                    ) : (
                      <div className="text-xs text-green-300">AR Mode - Point at design</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Starting Camera...</span>
                </div>
              )}
            </div>
            
            {/* AR Mode Instructions */}
            {cameraActive && !fallbackMode && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-center max-w-sm">
                <div className="text-sm">
                  🎯 <strong>Point your camera at the printed design</strong>
                  <br />
                  <span className="text-xs text-gray-300">Video will appear when design is detected</span>
                </div>
              </div>
            )}
            
            {/* Fallback Mode Instructions */}
            {cameraActive && fallbackMode && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 bg-blue-900 bg-opacity-75 text-white px-4 py-2 rounded-lg text-center max-w-sm">
                <div className="text-sm">
                  📱 <strong>Basic Mode Active</strong>
                  <br />
                  <span className="text-xs text-blue-200">Click anywhere on screen to play video</span>
                </div>
              </div>
            )}
            
            {/* Play Button for iOS */}
            <div 
              ref={playVideoImageRef}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 cursor-pointer rounded-lg hidden"
            >
              <img
                src="https://cdn.glitch.global/eaaf6cb5-b715-4886-8387-ce815a48751c/playicon.png?v=1708949860785"
                alt="Play"
                className="w-full h-full"
              />
            </div>
            
            {/* Refresh Button */}
            <div 
              ref={refreshButtonRef}
              className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-10 w-10 h-10 sm:w-12 sm:h-12 cursor-pointer rounded-lg hidden"
              onClick={handleRefresh}
            >
              <img
                src="https://cdn.glitch.global/fdac14d5-54e7-42ff-ac89-9fc7b19921d4/reset%20btn.png?v=1712132103406"
                alt="Refresh"
                className="w-full h-full"
              />
            </div>
          </>
        )}
      </main>

      {/* Footer with Social Links */}
      <footer className="bg-gray-800 text-white py-3 px-4 sm:py-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center gap-4 sm:gap-6">
            {socialLinks.instagram && (
              <a 
                href={socialLinks.instagram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.281H7.721v8.562h8.558V7.707z"/>
                </svg>
              </a>
            )}
            
            {socialLinks.website && (
              <a 
                href={socialLinks.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </a>
            )}
            
            {socialLinks.facebook && (
              <a 
                href={socialLinks.facebook} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-800 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            )}
          </div>
          <div className="text-center mt-2 sm:mt-3">
            <p className="text-xs sm:text-sm text-gray-300 font-light">
              Developed By NerdsAndGeeks.Pvt Limited
            </p>
          </div>
        </div>
      </footer>

      {/* Hidden social icons for AR overlay */}
      <div 
        ref={socialIconsRef}
        className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-10 hidden"
        style={{ display: 'none' }}
      >
        <div className="flex gap-3 sm:gap-4">
          {socialLinks.instagram && (
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.281H7.721v8.562h8.558V7.707z"/>
                </svg>
              </div>
            </a>
          )}
          
          {socialLinks.website && (
            <a href={socialLinks.website} target="_blank" rel="noopener noreferrer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </a>
          )}
          
          {socialLinks.facebook && (
            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-800 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARExperiencePage;
