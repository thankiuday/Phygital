/**
 * Upload Page Component
 * Handles file uploads for design images and videos
 * Includes drag-and-drop functionality and progress tracking
 */

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../../contexts/AuthContext'
import { uploadAPI, qrAPI, downloadFile, arExperienceAPI } from '../../utils/api'
import BackButton from '../../components/UI/BackButton'
import { 
  Upload, 
  Image, 
  Video, 
  X, 
  CheckCircle, 
  AlertCircle,
  QrCode,
  Share2,
  MapPin,
  Download,
  Eye
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import QRPositioningOverlay from '../../components/QRPositioning/QRPositioningOverlay'
import toast from 'react-hot-toast'

const UploadPage = () => {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('design')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [qrPosition, setQrPosition] = useState({
    x: user?.qrPosition?.x || 0,
    y: user?.qrPosition?.y || 0,
    width: user?.qrPosition?.width || 100,
    height: user?.qrPosition?.height || 100
  })
  const [socialLinks, setSocialLinks] = useState({
    instagram: user?.socialLinks?.instagram || '',
    facebook: user?.socialLinks?.facebook || '',
    twitter: user?.socialLinks?.twitter || '',
    linkedin: user?.socialLinks?.linkedin || '',
    website: user?.socialLinks?.website || ''
  })
  const [finalDesignPreview, setFinalDesignPreview] = useState(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [captureCompositeFunction, setCaptureCompositeFunction] = useState(null)
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [isCreatingAR, setIsCreatingAR] = useState(false)
  const [arExperienceId, setArExperienceId] = useState(null)

  // Design upload handler
  const onDesignDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append('design', file)

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await uploadAPI.uploadDesign(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      updateUser(response.data.data.user)
      
      // Show different messages based on AR readiness
      if (response.data.data.arReady) {
        toast.success('Design uploaded successfully! AR target generated 🎯')
      } else if (response.data.data.mindTarget) {
        toast.success('Design uploaded successfully! AR target processing... ⚙️')
      } else {
        toast.success('Design uploaded successfully! AR will use image fallback 📷')
      }
      
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 1000)
    } catch (error) {
      setUploadProgress(0)
      setIsUploading(false)
      toast.error('Failed to upload design')
    }
  }, [updateUser])

  // Fetch QR image blob for overlay/composite
  useEffect(() => {
    const fetchQR = async () => {
      try {
        if (!user?._id) return
        // Try primary endpoint
        let res = await qrAPI.getMyQR('png', 300)
        let blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'image/png' })
        let url = URL.createObjectURL(blob)
        console.log('[QR Overlay] Loaded QR from my-qr endpoint')
        setQrImageUrl(url)
      } catch (err) {
        console.warn('Failed to fetch QR via my-qr, trying generate...', err)
        try {
          const res2 = await qrAPI.generateQR(user._id, 'png', 300)
          const blob2 = res2.data instanceof Blob ? res2.data : new Blob([res2.data], { type: 'image/png' })
          const url2 = URL.createObjectURL(blob2)
          console.log('[QR Overlay] Loaded QR from generate endpoint')
          setQrImageUrl(url2)
        } catch (err2) {
          console.error('Failed to fetch QR for overlay', err2)
        }
      }
    }
    fetchQR()
    return () => {
      if (qrImageUrl) {
        console.log('[QR Overlay] Revoking QR object URL')
        URL.revokeObjectURL(qrImageUrl)
      }
    }
  }, [user?._id])

  // Video upload handler
  const onVideoDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append('video', file)

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 5
        })
      }, 300)

      const response = await uploadAPI.uploadVideo(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      updateUser(response.data.data.user)
      toast.success('Video uploaded successfully!')
      
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 1000)
    } catch (error) {
      setUploadProgress(0)
      setIsUploading(false)
      toast.error('Failed to upload video')
    }
  }, [updateUser])

  // Design dropzone
  const {
    getRootProps: getDesignRootProps,
    getInputProps: getDesignInputProps,
    isDragActive: isDesignDragActive
  } = useDropzone({
    onDrop: onDesignDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: isUploading
  })

  // Video dropzone
  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoDragActive
  } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    disabled: isUploading
  })

  // Handle QR position change
  const handleQrPositionChange = useCallback((newPosition) => {
    setQrPosition(prev => ({ ...prev, ...newPosition }))
  }, [])

  // Handle QR size change
  const handleQrSizeChange = useCallback((newSize) => {
    setQrPosition(prev => ({ ...prev, ...newSize }))
  }, [])

  // Save QR position with composite image
  const saveQRPosition = async () => {
    try {
      console.log('=== SAVE COMPOSITE DESIGN DEBUG ===');
      console.log('🚀 SAVE BUTTON CLICKED - NEW API SHOULD BE CALLED');
      console.log('Capture function available:', !!captureCompositeFunction);
      console.log('QR Position:', qrPosition);
      
      if (!captureCompositeFunction) {
        console.log('ERROR: Composite image capture not ready');
        toast.error('Composite image capture not ready. Please wait a moment and try again.');
        return;
      }

      // Show loading state
      const loadingToast = toast.loading('Saving composite design...');

      // Capture the composite image
      console.log('Capturing composite image...');
      const compositeImageData = await captureCompositeFunction();
      console.log('Composite image captured, sending to API...');

      // Save composite design with image data
      const response = await uploadAPI.saveCompositeDesign(compositeImageData, qrPosition);
      console.log('API Response:', response);

      // Try to compile and save .mind on the client as a fallback (if server failed to generate)
      try {
        const mindTargetUrlFromServer = response.data?.data?.user?.uploadedFiles?.mindTarget?.url;
        if (!mindTargetUrlFromServer) {
          const mindarModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js');
          const { Compiler } = mindarModule;
          const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = response.data?.data?.user?.uploadedFiles?.compositeDesign?.url || compositeImageData;
          });
          const compiler = new Compiler();
          await compiler.compileImageTargets([img], () => {});
          const buf = await compiler.exportData();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          await uploadAPI.saveMindTarget(`data:application/octet-stream;base64,${base64}`);
          console.log('Client-side .mind generated and saved');
        }
      } catch (mindErr) {
        console.warn('Client-side .mind generation failed:', mindErr);
      }

      toast.dismiss(loadingToast);
      toast.success('Composite design saved successfully!');
    } catch (error) {
      console.error('Save composite design error:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to save composite design: ${error.message}`);
    }
  }

  // Save social links
  const saveSocialLinks = async () => {
    try {
      await uploadAPI.updateSocialLinks(socialLinks)
      toast.success('Social links updated!')
    } catch (error) {
      toast.error('Failed to update social links')
    }
  }

  // Generate preview of final design
  const generatePreview = async () => {
    try {
      setIsGeneratingPreview(true)
      const response = await uploadAPI.previewFinalDesign()
      setFinalDesignPreview(response.data.data.preview)
      toast.success('Preview generated!')
    } catch (error) {
      toast.error('Failed to generate preview')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // Download final design
  const downloadFinalDesign = async () => {
    try {
      setIsDownloading(true)
      
      console.log('=== DOWNLOAD FINAL DESIGN DEBUG ===');
      console.log('User data:', user);
      console.log('Design URL:', user.uploadedFiles?.design?.url);
      console.log('QR Position:', user.qrPosition);
      
      // Create a fresh composite image instead of using the backend
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load the original design image
      const designImg = document.createElement('img');
      designImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        designImg.onload = resolve;
        designImg.onerror = reject;
        designImg.src = user.uploadedFiles.design.url;
      });
      
      console.log('Design image loaded:', {
        naturalWidth: designImg.naturalWidth,
        naturalHeight: designImg.naturalHeight
      });
      
      // Set canvas to image dimensions
      canvas.width = designImg.naturalWidth;
      canvas.height = designImg.naturalHeight;
      
      console.log('Canvas dimensions set:', {
        width: canvas.width,
        height: canvas.height
      });
      
      // Draw the design image
      ctx.drawImage(designImg, 0, 0);
      console.log('Design image drawn to canvas');
      
      // Get QR position from user data
      const qrPos = user.qrPosition || { x: 100, y: 100, width: 100, height: 100 };
      
      // Calculate actual QR position on full-size image
      const actualQrX = (qrPos.x / 800) * designImg.naturalWidth; // Assuming 800px display width
      const actualQrY = (qrPos.y / 600) * designImg.naturalHeight; // Assuming 600px display height
      const actualQrWidth = (qrPos.width / 800) * designImg.naturalWidth;
      const actualQrHeight = (qrPos.height / 600) * designImg.naturalHeight;
      
      console.log('QR position calculation:', {
        qrPos,
        actualQr: { x: actualQrX, y: actualQrY, width: actualQrWidth, height: actualQrHeight }
      });
      
      // Try to load and draw the QR code
      try {
        const qrResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/qr/generate/${user._id}?format=png&size=300`);
        if (qrResponse.ok) {
          const qrBlob = await qrResponse.blob();
          const qrImg = document.createElement('img');
          
          await new Promise((resolve, reject) => {
            qrImg.onload = resolve;
            qrImg.onerror = reject;
            qrImg.src = URL.createObjectURL(qrBlob);
          });
          
          // Draw QR code on the composite
          ctx.drawImage(qrImg, actualQrX, actualQrY, actualQrWidth, actualQrHeight);
          
          // Convert to blob and download
          canvas.toBlob((blob) => {
            console.log('Canvas converted to blob:', {
              size: blob.size,
              type: blob.type
            });
            const filename = `phygital-design-${user.username}.png`;
            
            // Use the downloadFile utility
            downloadFile(blob, filename);
            
            toast.success('Fresh composite design downloaded!');
            setIsDownloading(false);
          }, 'image/png', 1.0);
        } else {
          throw new Error('QR generation failed');
        }
      } catch (qrError) {
        console.warn('QR loading failed, using placeholder:', qrError);
        // Draw placeholder QR
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight);
        ctx.fillStyle = 'rgba(59, 130, 246, 1)';
        ctx.font = `${Math.max(12, actualQrWidth / 8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('QR CODE', actualQrX + actualQrWidth / 2, actualQrY + actualQrHeight / 2);
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          const filename = `phygital-design-${user.username}.png`;
          
          // Use the downloadFile utility
          downloadFile(blob, filename);
          
          toast.success('Composite design downloaded (with placeholder QR)!');
          setIsDownloading(false);
        }, 'image/png', 1.0);
      }
      
    } catch (error) {
      console.error('Download preparation failed:', error);
      toast.error(`Download failed: ${error.message}`);
      setIsDownloading(false);
    }
  }

  // Create AR experience
  const createARExperience = async () => {
    try {
      setIsCreatingAR(true);
      const loadingToast = toast.loading('Creating AR experience...');
      
      const response = await uploadAPI.createARExperience();
      console.log('AR Experience created:', response.data);
      
      const { arExperienceId, qrData } = response.data.data;
      setArExperienceId(arExperienceId);
      
      toast.dismiss(loadingToast);
      toast.success('AR experience created successfully!');
      
      // Generate QR code for the AR experience
      if (qrData) {
        try {
          const qrResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/qr/generate-data?data=${encodeURIComponent(qrData)}&format=png&size=200`);
          if (qrResponse.ok) {
            const qrBlob = await qrResponse.blob();
            setQrImageUrl(URL.createObjectURL(qrBlob));
          }
        } catch (qrError) {
          console.warn('Failed to generate QR code:', qrError);
        }
      }
      
    } catch (error) {
      console.error('Create AR experience error:', error);
      toast.error(`Failed to create AR experience: ${error.message}`);
    } finally {
      setIsCreatingAR(false);
    }
  };

  const tabs = [
    { id: 'design', name: 'Design', icon: Image },
    { id: 'video', name: 'Video', icon: Video },
    { id: 'qr', name: 'QR Position', icon: QrCode },
    { id: 'social', name: 'Social Links', icon: Share2 },
    { id: 'ar', name: 'AR Experience', icon: QrCode },
    { id: 'final', name: 'Final Design', icon: Download }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Mobile Back Button - Top Left */}
        <div className="flex justify-start mb-4 sm:hidden">
          <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm" />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Upload Your Content
            </h1>
            <p className="text-gray-600 mt-2">
              Upload your design, video, and configure your QR code settings
            </p>
          </div>
          {/* Desktop Back Button */}
          <BackButton to="/dashboard" variant="ghost" className="hidden sm:flex" />
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Uploading...
            </span>
            <span className="text-sm font-medium text-gray-700">
              {uploadProgress}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="card">
        {/* Design Upload */}
        {activeTab === 'design' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Upload Design Image
            </h2>
            <p className="text-gray-600 mb-6">
              Upload your design image (poster, business card, etc.)
            </p>

            {user?.uploadedFiles?.design?.url ? (
              <div className="mb-6">
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Design uploaded successfully
                    </p>
                    <p className="text-xs text-green-600">
                      {user.uploadedFiles.design.originalName}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <img
                    src={user.uploadedFiles.design.url}
                    alt="Uploaded design"
                    className="max-w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            ) : (
              <div
                {...getDesignRootProps()}
                className={`upload-zone ${isDesignDragActive ? 'active' : ''}`}
              >
                <input {...getDesignInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDesignDragActive
                    ? 'Drop your design here'
                    : 'Drag & drop your design image here'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  or click to browse files
                </p>
                <p className="text-xs text-gray-500">
                  Supports: JPEG, PNG, GIF, WebP (max 50MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Video Upload */}
        {activeTab === 'video' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Upload Video
            </h2>
            <p className="text-gray-600 mb-6">
              Upload an explanatory video for your design
            </p>

            {user?.uploadedFiles?.video?.url ? (
              <div className="mb-6">
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Video uploaded successfully
                    </p>
                    <p className="text-xs text-green-600">
                      {user.uploadedFiles.video.originalName}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <video
                    src={user.uploadedFiles.video.url}
                    controls
                    className="max-w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            ) : (
              <div
                {...getVideoRootProps()}
                className={`upload-zone ${isVideoDragActive ? 'active' : ''}`}
              >
                <input {...getVideoInputProps()} />
                <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isVideoDragActive
                    ? 'Drop your video here'
                    : 'Drag & drop your video here'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  or click to browse files
                </p>
                <p className="text-xs text-gray-500">
                  Supports: MP4, MOV, AVI, WebM (max 50MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* QR Position */}
        {activeTab === 'qr' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              QR Code Position
            </h2>
            <p className="text-gray-600 mb-6">
              Set where the QR code should be placed on your design
            </p>

            {user?.uploadedFiles?.design?.url ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Interactive QR Code Positioning
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Drag the QR code overlay to move it, or use the resize handles to change its size.
                  </p>
                  
                <QRPositioningOverlay
                  imageUrl={user.uploadedFiles.design.url}
                  qrPosition={qrPosition}
                  onPositionChange={handleQrPositionChange}
                  onSizeChange={handleQrSizeChange}
                  onCaptureComposite={setCaptureCompositeFunction}
                  qrImageUrl={qrImageUrl}
                  imageWidth={400}
                  imageHeight={300}
                />
                </div>

                {/* Manual Input Controls (Optional) */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Manual Position Controls
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">X Position</label>
                      <input
                        type="number"
                        value={qrPosition.x}
                        onChange={(e) => setQrPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Y Position</label>
                      <input
                        type="number"
                        value={qrPosition.y}
                        onChange={(e) => setQrPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Width</label>
                      <input
                        type="number"
                        value={qrPosition.width}
                        onChange={(e) => setQrPosition(prev => ({ ...prev, width: parseInt(e.target.value) || 100 }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Height</label>
                      <input
                        type="number"
                        value={qrPosition.height}
                        onChange={(e) => setQrPosition(prev => ({ ...prev, height: parseInt(e.target.value) || 100 }))}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={saveQRPosition}
                  className="btn-primary"
                  disabled={!captureCompositeFunction}
                >
                  {captureCompositeFunction ? 'Save Composite Design' : 'Loading...'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Please upload a design image first to set QR code position
                </p>
              </div>
            )}
          </div>
        )}

        {/* Social Links */}
        {activeTab === 'social' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Social Media Links
            </h2>
            <p className="text-gray-600 mb-6">
              Add your social media profiles to your personalized page
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Instagram</label>
                <input
                  type="url"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="https://instagram.com/yourusername"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Facebook</label>
                <input
                  type="url"
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, facebook: e.target.value }))}
                  placeholder="https://facebook.com/yourpage"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Twitter</label>
                <input
                  type="url"
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                  placeholder="https://twitter.com/yourusername"
                  className="input"
                />
              </div>
              <div>
                <label className="label">LinkedIn</label>
                <input
                  type="url"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  type="url"
                  value={socialLinks.website}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="input"
                />
              </div>
            </div>

            <button
              onClick={saveSocialLinks}
              className="btn-primary mt-6"
            >
              Save Social Links
            </button>
          </div>
        )}

        {/* AR Experience */}
        {activeTab === 'ar' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Create AR Experience
            </h2>
            <p className="text-gray-600 mb-6">
              Generate an AR experience that overlays your video on the tracked image
            </p>

            {user?.uploadedFiles?.design?.url && user?.uploadedFiles?.video?.url && user?.qrPosition ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Ready to create AR experience</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    All required files are uploaded and QR position is set
                  </p>
                </div>

                {!arExperienceId ? (
                  <div className="text-center">
                    <button
                      onClick={createARExperience}
                      disabled={isCreatingAR}
                      className="btn-primary flex items-center justify-center mx-auto"
                    >
                      {isCreatingAR ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Creating AR Experience...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Create AR Experience
                        </>
                      )}
                    </button>
                    <p className="text-gray-500 text-sm mt-2">
                      This will generate a .mind file and create a QR code for AR scanning
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-blue-800 font-medium">AR Experience Created!</span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        Experience ID: {arExperienceId}
                      </p>
                    </div>

                    {qrImageUrl && (
                      <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Your AR QR Code</h3>
                        <div className="inline-block p-4 bg-white border rounded-lg shadow-sm">
                          <img
                            src={qrImageUrl}
                            alt="AR Experience QR Code"
                            className="w-48 h-48 mx-auto"
                          />
                        </div>
                        <p className="text-gray-600 text-sm mt-2">
                          Scan this QR code to view your AR experience
                        </p>
                        <div className="mt-4">
                          <a
                            href={`/scan/${arExperienceId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary inline-flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview AR Experience
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 font-medium">Requirements not met</span>
                </div>
                <ul className="text-yellow-700 text-sm mt-2 space-y-1">
                  {!user?.uploadedFiles?.design?.url && <li>• Upload a design image</li>}
                  {!user?.uploadedFiles?.video?.url && <li>• Upload a video</li>}
                  {!user?.qrPosition && <li>• Set QR code position</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Final Design */}
        {activeTab === 'final' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Download Final Design
            </h2>
            <p className="text-gray-600 mb-6">
              Generate and download your design with the QR code overlaid
            </p>

            {user?.uploadedFiles?.design?.url && user?.qrPosition ? (
              <div className="space-y-6">
                {/* Preview Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Preview
                    </h3>
                    <button
                      onClick={generatePreview}
                      disabled={isGeneratingPreview}
                      className="btn-secondary flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
                    </button>
                  </div>
                  
                  {finalDesignPreview ? (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img
                        src={finalDesignPreview}
                        alt="Final design with QR code"
                        className="max-w-full h-auto rounded-lg shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">
                        Click "Generate Preview" to see your final design with QR code
                      </p>
                    </div>
                  )}
                </div>

                {/* Download Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Download
                      </h3>
                      <p className="text-sm text-gray-600">
                        Download your final design as a PNG file
                      </p>
                    </div>
                    <button
                      onClick={downloadFinalDesign}
                      disabled={isDownloading}
                      className="btn-primary flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isDownloading ? 'Downloading...' : 'Download Design'}
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Ready to download!
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Your design will be downloaded as "phygital-design-{user.username}.png"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">
                  Complete the setup first
                </p>
                <p className="text-sm text-gray-500">
                  Upload a design and set QR code position to generate your final design
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadPage
