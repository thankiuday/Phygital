import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../../components/UI/BackButton';

const QRScanPage = () => {
  const { userId } = useParams();
  const [projectData, setProjectData] = useState(null);
  const [socialLinks, setSocialLinks] = useState({});
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanningStatus, setScanningStatus] = useState('idle'); // 'idle', 'checking', 'ready', 'error'

  useEffect(() => {
    fetchProjectData();
    checkCameraAvailability();
  }, [userId]);

  const checkCameraAvailability = async () => {
    try {
      setScanningStatus('checking');
      setCameraError(null);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this device');
      }
      
      // Request camera permission and test stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      // Test if camera is working
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          // Camera is working
          setCameraReady(true);
          setScanningStatus('ready');
          resolve();
        };
        video.onerror = () => {
          reject(new Error('Camera stream failed to load'));
        };
        video.play();
        
        // Timeout after 5 seconds
        setTimeout(() => {
          reject(new Error('Camera initialization timeout'));
        }, 5000);
      });
      
      // Clean up test stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Camera check failed:', error);
      setCameraError(error.message);
      setScanningStatus('error');
      setCameraReady(false);
    }
  };

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/qr/project-data/${userId}`);
      const result = await response.json();
      
      if (result.status === 'success') {
        setProjectData(result.data);
        setSocialLinks(result.data.socialLinks);
      } else {
        console.error('Error fetching project data:', result.message);
        // Fallback to mock data for development
        const mockProjectData = {
          id: userId,
          designUrl: "https://res.cloudinary.com/dzax35hss/image/upload/v1712341263/bharani_newpng_vukiuy.png",
          videoUrl: "https://res.cloudinary.com/dbtfsltkv/video/upload/v1712299085/Untitled_design_1_ongdtf.mp4",
          socialLinks: {
            instagram: "https://www.instagram.com/nerdsandgeeks.pvt.ltd/",
            website: "https://nerdsandgeeks.in/",
            facebook: "https://www.facebook.com/nerdsandgeeks.pvt.ltd/"
          },
          designDimensions: {
            width: 0.32,
            height: 0.44
          }
        };
        
        setProjectData(mockProjectData);
        setSocialLinks(mockProjectData.socialLinks);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      // Fallback to mock data for development
        const mockProjectData = {
          id: userId,
        designUrl: "https://res.cloudinary.com/dzax35hss/image/upload/v1712341263/bharani_newpng_vukiuy.png",
        videoUrl: "https://res.cloudinary.com/dbtfsltkv/video/upload/v1712299085/Untitled_design_1_ongdtf.mp4",
        socialLinks: {
          instagram: "https://www.instagram.com/nerdsandgeeks.pvt.ltd/",
          website: "https://nerdsandgeeks.in/",
          facebook: "https://www.facebook.com/nerdsandgeeks.pvt.ltd/"
        },
        designDimensions: {
          width: 0.32,
          height: 0.44
        }
      };
      
      setProjectData(mockProjectData);
      setSocialLinks(mockProjectData.socialLinks);
    }
  };

  const handleOpenARExperience = () => {
    // Navigate to the React AR experience page
    window.location.href = `/ar/${userId}`;
  };

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white py-3 px-4 sm:py-4 sm:px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg sm:text-2xl font-bold">Phygital</h1>
          <BackButton to="/" variant="ghost" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              AR Experience Ready
            </h2>
            <p className="text-gray-300 mb-6">
              Click the button below to open the AR experience in a new tab
            </p>
          </div>
          
          <button
            onClick={handleOpenARExperience}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 sm:py-4 sm:px-10 rounded-full flex items-center gap-3 transition-all duration-300 shadow-lg text-lg sm:text-xl mx-auto"
          >
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Open AR Experience</span>
          </button>

          <div className="mt-8 text-gray-400 text-sm">
            <p>📱 Best experienced on mobile devices</p>
            <p>🎯 Point your camera at the design to start</p>
            
            {/* Camera Status Indicator */}
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                {scanningStatus === 'checking' && (
                  <>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-400">Checking Camera...</span>
                  </>
                )}
                {scanningStatus === 'ready' && cameraReady && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400">Camera Ready for Scanning</span>
                  </>
                )}
                {scanningStatus === 'error' && (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-400">Camera Not Available</span>
                  </>
                )}
              </div>
              
              {cameraError && (
                <p className="text-red-400 text-xs mt-1">
                  Error: {cameraError}
                </p>
              )}
              
              {scanningStatus === 'ready' && (
                <p className="text-green-400 text-xs mt-1">
                  ✅ Camera is ready to scan your design
                </p>
              )}
              
              {scanningStatus === 'error' && (
                <button
                  onClick={checkCameraAvailability}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  Retry Camera Check
                </button>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default QRScanPage;
