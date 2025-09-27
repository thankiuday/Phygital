import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import * as THREE from "three";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import toast from "react-hot-toast";

export default function ScanPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [arData, setArData] = useState(null);
  const containerRef = useRef(null);
  const mindarThreeRef = useRef(null);

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

  useEffect(() => {
    if (!arData || !containerRef.current) return;

    const startAR = async () => {
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
          imageTargetSrc: arData.mindFileUrl,
        });

        mindarThreeRef.current = mindarThree;

        const { renderer, scene, camera } = mindarThree;

        // Add anchor for the video
        const anchor = mindarThree.addAnchor(0);

        // Create video element
        const video = document.createElement("video");
        video.src = arData.videoUrl;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          video.onloadeddata = resolve;
          video.onerror = reject;
          video.load();
        });

        // Try to play the video
        try {
          await video.play();
          console.log('Video started playing');
        } catch (playError) {
          console.warn('Autoplay failed, user interaction required:', playError);
          // Show play button or wait for user interaction
        }

        // Create video texture
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Create plane geometry for video (16:9 aspect ratio)
        const geometry = new THREE.PlaneGeometry(1, 0.75);
        const material = new THREE.MeshBasicMaterial({ 
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(geometry, material);

        // Position the video plane
        plane.position.set(0, 0, 0);
        plane.rotation.set(0, Math.PI, 0); // Flip to face camera

        anchor.group.add(plane);

        // Start MindAR
        await mindarThree.start();
        console.log('MindAR started successfully');

        // Animation loop
        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });

        // Add click handler to start video if autoplay failed
        const startVideo = () => {
          video.play().catch(console.warn);
        };
        
        containerRef.current.addEventListener('click', startVideo);
        
        // Cleanup function
        return () => {
          if (containerRef.current) {
            containerRef.current.removeEventListener('click', startVideo);
          }
          if (mindarThreeRef.current) {
            mindarThreeRef.current.stop();
          }
        };

      } catch (err) {
        console.error('AR initialization error:', err);
        setError(`Failed to start AR: ${err.message}`);
        toast.error(`AR failed to start: ${err.message}`);
      }
    };

    startAR();

    // Cleanup on unmount
    return () => {
      if (mindarThreeRef.current) {
        mindarThreeRef.current.stop();
        mindarThreeRef.current = null;
      }
    };
  }, [arData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-mesh flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-300 mt-4">Loading AR experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-mesh flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 bg-slate-800 rounded-lg shadow-lg text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">AR Experience Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* AR Container */}
      <div 
        ref={containerRef}
        className="w-full h-screen relative"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1
        }}
      />
      
      {/* Overlay UI */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <h2 className="text-lg font-semibold">AR Experience</h2>
              <p className="text-sm opacity-75">Point camera at your image</p>
            </div>
            <button 
              onClick={() => window.history.back()}
              className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="text-center text-white">
            <p className="text-sm opacity-75 mb-2">
              Tap to start video if it doesn't play automatically
            </p>
            {arData?.socialLinks && (
              <div className="flex justify-center space-x-4">
                {arData.socialLinks.instagram && (
                  <a 
                    href={arData.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {arData.socialLinks.facebook && (
                  <a 
                    href={arData.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {arData.socialLinks.linkedin && (
                  <a 
                    href={arData.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
