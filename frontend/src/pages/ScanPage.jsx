import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import toast from "react-hot-toast";

export default function ScanPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [arData, setArData] = useState(null);
  const [showStartButton, setShowStartButton] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const containerRef = useRef(null);
  const mindarThreeRef = useRef(null);
  const videoRef = useRef(null);
  const overlayMeshRef = useRef(null);
  const bottomRightOverlayMeshRef = useRef(null);

  // Mobile detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /android/i.test(navigator.userAgent);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching AR experience for ID:', id);
        
        const res = await fetch(`/api/ar-experience/${id}`);
        const response = await res.json();
        
        if (!res.ok) {
          throw new Error(response.message || 'Failed to fetch AR experience');
        }
        
        console.log('AR experience data:', response.data);
        setArData(response.data);
        
      } catch (err) {
        console.error('Error fetching AR experience:', err);
        setError(err.message);
        toast.error(`Failed to load AR experience: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const createOverlayMeshes = (anchor, videoMesh, THREE) => {
    // Create top overlay mesh for social links
    const overlayMaterial = new THREE.MeshBasicMaterial({
      opacity: 0,
      transparent: true
    });
    const overlayGeometry = new THREE.PlaneGeometry(0.55, 0.22);
    const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);

    const xOffset = (videoMesh.geometry.parameters.width * videoMesh.scale.x) / 2;
    const yOffset = (videoMesh.geometry.parameters.height * videoMesh.scale.y) / 2;
    overlayMesh.position.x = videoMesh.position.x - xOffset + (overlayMesh.geometry.parameters.width * overlayMesh.scale.x) / 2;
    overlayMesh.position.y = videoMesh.position.y + yOffset - (overlayMesh.geometry.parameters.height * overlayMesh.scale.y) / 2;
    overlayMesh.position.z = videoMesh.position.z + 0.01;
    
    anchor.group.add(overlayMesh);
    overlayMeshRef.current = overlayMesh;

    // Create bottom right overlay mesh (if needed for interactions)
    const bottomRightOverlayMaterial = new THREE.MeshBasicMaterial({
      opacity: 0,
      transparent: true
    });
    const bottomRightOverlayGeometry = new THREE.PlaneGeometry(1.0, 1.11);
    const bottomRightOverlayMesh = new THREE.Mesh(bottomRightOverlayGeometry, bottomRightOverlayMaterial);
    
    const videoHeightHalf = (videoMesh.geometry.parameters.height * videoMesh.scale.y) / 2;
    const overlayHeightHalf = (bottomRightOverlayMesh.geometry.parameters.height * bottomRightOverlayMesh.scale.y) / 2;

    bottomRightOverlayMesh.position.x = videoMesh.position.x;
    bottomRightOverlayMesh.position.y = videoMesh.position.y - videoHeightHalf + overlayHeightHalf;
    bottomRightOverlayMesh.position.z = videoMesh.position.z + 0.01;
       
    anchor.group.add(bottomRightOverlayMesh);
    bottomRightOverlayMeshRef.current = bottomRightOverlayMesh;
  };

  const startAR = async () => {
    if (!arData || !containerRef.current) return;

    try {
      console.log('Starting AR with data:', arData);
      
      // Wait for MindAR to be available
      if (!window.MindARThree) {
        console.error('MindARThree not available');
        setError('AR library not loaded. Please refresh the page.');
        return;
      }

      const mindarThree = new window.MindARThree({
        container: containerRef.current,
        filterMinCF: 0.0001,
        filterBeta: 0.001,
        imageTargetSrc: arData.mindFileUrl,
      });

      mindarThreeRef.current = mindarThree;

      const { renderer, scene, camera } = mindarThree;
      const anchor = mindarThree.addAnchor(0);

      // Create video element
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = arData.videoUrl;
      video.load();
      video.muted = false;
      video.loop = false;
      video.playsInline = true;
      videoRef.current = video;

      // Create video texture with proper configuration
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.toneMapped = false;
      texture.format = THREE.RGBAFormat;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Create plane geometry with specific dimensions
      const geometry = new THREE.PlaneGeometry(0.32, 0.44);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        alphaTest: 0.01,
      });
      const videoMesh = new THREE.Mesh(geometry, material);
      videoMesh.position.set(0, 0, 0);
      videoMesh.scale.set(3.25, 3.25, 3.25);
      videoMesh.visible = false;

      anchor.group.add(videoMesh);

      // Create overlay meshes for interactions
      createOverlayMeshes(anchor, videoMesh, THREE);

      // Start MindAR
      await mindarThree.start();
      console.log('MindAR started successfully');

      // Animation loop
      renderer.setAnimationLoop(() => {
        if (anchor.visible) {
          // Show video mesh when target is visible
          if (!overlayMeshRef.current) {
            createOverlayMeshes(anchor, videoMesh, THREE);
          }
          
          videoMesh.visible = true;
          if (overlayMeshRef.current) overlayMeshRef.current.visible = true;
          if (bottomRightOverlayMeshRef.current) bottomRightOverlayMeshRef.current.visible = true;
          
          // Try to play video
          if (video.paused) {
            video.play().catch(e => {
              console.log("Auto-play failed due to browser restrictions", e);
              if (isIOS) {
                setShowPlayButton(true);
              }
            });
          }

          if (isIOS) {
            setShowPlayButton(video.paused);
          }
        } else {
          // Hide video mesh when target is not visible
          videoMesh.visible = false;
          if (overlayMeshRef.current) overlayMeshRef.current.visible = false;
          if (bottomRightOverlayMeshRef.current) bottomRightOverlayMeshRef.current.visible = false;
          
          if (!video.paused) {
            video.pause();
          }
          if (isIOS) setShowPlayButton(false);
        }
        
        renderer.render(scene, camera);
      });

      // Add click handlers for interactions
      const handleContainerClick = (event) => {
        if (!overlayMeshRef.current || !bottomRightOverlayMeshRef.current) return;

        const mouse = new THREE.Vector2(
          (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
          -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersectsFirst = raycaster.intersectObject(overlayMeshRef.current, true);
        const intersectsSecond = raycaster.intersectObject(bottomRightOverlayMeshRef.current, true);

        if (intersectsFirst.length > 0) {
          // Handle top overlay click (e.g., website)
          if (arData.socialLinks?.website) {
            window.open(arData.socialLinks.website, '_blank');
          }
        } else if (intersectsSecond.length > 0) {
          // Handle bottom right overlay click (e.g., LinkedIn)
          if (arData.socialLinks?.linkedin) {
            window.open(arData.socialLinks.linkedin, '_blank');
          }
        }
      };

      containerRef.current.addEventListener('click', handleContainerClick);

      // Handle video end
      video.addEventListener('ended', () => {
        video.pause();
        console.log("Video has ended");
        // Could show refresh button or restart option
      });

      // Cleanup function
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('click', handleContainerClick);
        }
      };

    } catch (err) {
      console.error('AR initialization error:', err);
      setError(`Failed to start AR: ${err.message}`);
      toast.error(`AR failed to start: ${err.message}`);
    }
  };

  const handleStartClick = () => {
    setShowStartButton(false);
    startAR();
  };

  const handlePlayClick = () => {
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play();
      setShowPlayButton(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white mt-4">Loading AR experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-4">AR Experience Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background image if available */}
      {arData?.backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${arData.backgroundImage})` }}
        />
      )}
      
      {/* AR Container */}
      <div 
        ref={containerRef}
        className="w-full h-screen absolute top-0 left-0"
        style={{ 
          width: '100vw',
          height: '100vh',
          zIndex: 1
        }}
      />
      
      {/* Start Button */}
      {showStartButton && arData && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <button 
            onClick={handleStartClick}
            className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:bg-gray-100 transition-colors flex items-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4-4-4-4m6 8l4-4-4-4" />
            </svg>
            <span>SCAN NOW</span>
          </button>
        </div>
      )}

      {/* Play Button for iOS */}
      {showPlayButton && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <button 
            onClick={handlePlayClick}
            className="w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Social Icons */}
      {arData?.socialLinks && (
        <div className="absolute bottom-8 right-1/2 transform translate-x-1/2 z-10">
          <div className="flex space-x-4">
            {arData.socialLinks.instagram && (
              <a 
                href={arData.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}
            {arData.socialLinks.facebook && (
              <a 
                href={arData.socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            )}
            {arData.socialLinks.linkedin && (
              <a 
                href={arData.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!showStartButton && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
            <h2 className="text-lg font-semibold">AR Experience</h2>
            <p className="text-sm opacity-75">Point camera at your image</p>
          </div>
        </div>
      )}
    </div>
  );
}
