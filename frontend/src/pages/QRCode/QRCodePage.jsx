/**
 * QR Code Page Component
 * Displays and manages user's QR codes for all designs
 * Shows list of designs and allows viewing QR codes with various options
 */

import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { qrAPI, downloadFile, historyAPI, uploadAPI } from '../../utils/api'
import BackButton from '../../components/UI/BackButton'
import { 
  QrCode, 
  Download, 
  Share2, 
  Copy, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Eye,
  Image,
  Calendar,
  FileText,
  ArrowLeft,
  Grid,
  List,
  Layers
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'

const QRCodePage = () => {
  const { user, isSetupComplete } = useAuth()
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'

  const personalizedUrl = selectedProject 
    ? `${window.location.origin}/user/${user?.username}?project=${selectedProject.id}`
    : `${window.location.origin}/user/${user?.username}`

  // Load user's projects
  const loadProjects = async (showToast = false) => {
    try {
      setIsLoadingProjects(true)
      console.log('Loading user projects...')
      
      // Get user's projects
      const response = await uploadAPI.getProjects()
      console.log('Full API response:', response)
      console.log('Response data:', response.data)
      console.log('Response data.data:', response.data.data)
      
      const projectsData = response.data.data.projects || []
      
      console.log('All projects loaded:', projectsData)
      console.log('Projects count:', projectsData.length)
      
      // For now, show all projects - we can add filtering later if needed
      const projectsList = projectsData.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        hasQRCode: true, // Assume all projects can have QR codes
        lastGenerated: new Date(project.updatedAt) // Use updatedAt as fallback
      }))
      
      console.log('Projects list for display:', projectsList)
      setProjects(projectsList)
      
      if (showToast && projectsList.length > 0) {
        toast.success(`Loaded ${projectsList.length} project${projectsList.length !== 1 ? 's' : ''}`)
      }
      
    } catch (error) {
      console.error('Failed to load projects:', error)
      console.log('Error details:', error.response?.data || error.message)
      
      // Fallback: Check if user has projects in their user object
      if (user?.projects && user.projects.length > 0) {
        console.log('Using fallback: projects from user object:', user.projects)
        const fallbackProjects = user.projects.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
          hasQRCode: true,
          lastGenerated: new Date(project.updatedAt)
        }))
        setProjects(fallbackProjects)
      } else {
        if (showToast) {
          toast.error('Failed to load projects')
        }
        setProjects([])
      }
    } finally {
      setIsLoadingProjects(false)
    }
  }

  // Generate QR code for selected project
  const generateQRCode = async (project = null) => {
    if (!user?._id) return

    try {
      setIsLoading(true)
      const response = project 
        ? await qrAPI.getProjectQR(project.id, 'png', 300)
        : await qrAPI.getMyQR('png', 300)
      
      const blob = new Blob([response.data], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      setQrCodeUrl(url)
    } catch (error) {
      toast.error('Failed to generate QR code')
    } finally {
      setIsLoading(false)
    }
  }

  // Select a project and generate its QR code
  const selectProject = async (project) => {
    setSelectedProject(project)
    await generateQRCode(project)
  }

  // Go back to project list
  const goBackToList = () => {
    setSelectedProject(null)
    setQrCodeUrl('')
  }

  // Download QR code
  const downloadQRCode = async (size = 300) => {
    if (!user?._id) return

    try {
      const response = selectedProject 
        ? await qrAPI.downloadProjectQR(selectedProject.id, 'png', size)
        : await qrAPI.downloadQR(user._id, 'png', size)
      
      const filename = selectedProject 
        ? `qr-${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}.png`
        : `qr-${user.username}.png`
      downloadFile(response.data, filename)
      toast.success('QR code downloaded!')
    } catch (error) {
      toast.error('Failed to download QR code')
    }
  }

  // Download high resolution QR code
  const downloadHighResQR = async () => {
    await downloadQRCode(600)
  }

  // Copy URL to clipboard
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(personalizedUrl)
      setCopied(true)
      toast.success('URL copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy URL')
    }
  }

  // Share URL
  const shareUrl = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Phygital Page',
          text: 'Check out my interactive design!',
          url: personalizedUrl
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyUrl()
    }
  }

  useEffect(() => {
    if (isSetupComplete()) {
      loadProjects()
    }
  }, [isSetupComplete, user])

  // Also load projects when component mounts, regardless of setup status
  useEffect(() => {
    loadProjects()
  }, [])

  // Listen for focus events to refresh data when user navigates back to this page
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to ensure any pending updates are processed
      setTimeout(() => {
        loadProjects()
      }, 100)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Handle navigation from project creation flow
  useEffect(() => {
    // Check if user came from project creation (via URL state or search params)
    const shouldRefresh = location.state?.refreshProjects || 
                         new URLSearchParams(location.search).get('refresh') === 'true'
    
    if (shouldRefresh) {
      console.log('Detected navigation from project creation, refreshing projects...')
      // Small delay to ensure backend has processed the new project
      setTimeout(() => {
        loadProjects(true)
      }, 500)
    }
  }, [location])

  if (!isSetupComplete()) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-neon-yellow mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-4">
            Complete Your Setup First
          </h2>
          <p className="text-slate-300 mb-6">
            Please upload your design and video before generating your QR code.
          </p>
          <a
            href="/upload"
            className="btn-primary"
          >
            Go to Upload
          </a>
        </div>
      </div>
    )
  }

  // If a project is selected, show QR code view
  if (selectedProject) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back button */}
        <div className="mb-8">
          <button
            onClick={goBackToList}
            className="flex items-center text-slate-300 hover:text-slate-100 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Project List
          </button>
          
          <h1 className="text-3xl font-bold text-slate-100">
            QR Code for {selectedProject.name}
          </h1>
          <p className="text-slate-300 mt-2">
            Share this QR code to connect your physical design to your digital content
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Display */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                QR Code Preview
              </h2>
              <p className="text-slate-300">
                This QR code links to your personalized page
              </p>
            </div>

            <div className="text-center">
              {isLoading ? (
                <div className="py-12">
                  <LoadingSpinner size="lg" />
                  <p className="text-slate-300 mt-4">Generating QR code...</p>
                </div>
              ) : qrCodeUrl ? (
                <div className="space-y-4">
                  <div className="inline-block p-4 bg-slate-800/50 rounded-lg shadow-dark-large border border-slate-600/30">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-slate-300">
                    Scan this QR code to visit your personalized page
                  </p>
                </div>
              ) : (
                <div className="py-12">
                  <QrCode className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                  <p className="text-slate-300">QR code not generated yet</p>
                  <button
                    onClick={() => generateQRCode(selectedProject)}
                    className="btn-primary mt-4"
                  >
                    Generate QR Code
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Composite Design Display */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-neon-purple" />
                Composite Design
              </h2>
              <p className="text-slate-300">
                Your design with QR code overlay
              </p>
            </div>

            <div className="text-center">
              {user?.uploadedFiles?.compositeDesign?.url ? (
                <div className="space-y-4">
                  <div className="inline-block p-4 bg-slate-800/50 rounded-lg shadow-dark-large border border-slate-600/30">
                    <img
                      src={user.uploadedFiles.compositeDesign.url}
                      alt="Composite Design"
                      className="max-w-full h-auto max-h-96 rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-slate-300">
                    This is your final design ready for printing
                  </p>
                  <div className="flex space-x-2 justify-center">
                    <button
                      onClick={() => window.open(user.uploadedFiles.compositeDesign.url, '_blank')}
                      className="btn-secondary flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Full Size
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          console.log('=== FRESH COMPOSITE DOWNLOAD DEBUG ===');
                          console.log('User data:', user);
                          console.log('Design URL:', user.uploadedFiles.design.url);
                          console.log('QR Position:', user.qrPosition);
                          
                          // Create a fresh composite image instead of using the S3 one
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          
                          // Load the original design image
                          const designImg = document.createElement('img');
                          designImg.crossOrigin = 'anonymous';
                          
                          designImg.onload = async () => {
                            try {
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
                                const qrResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/qr/generate/${user._id}?format=png&size=300`);
                                if (qrResponse.ok) {
                                  const qrBlob = await qrResponse.blob();
                                  const qrImg = document.createElement('img');
                                  qrImg.onload = () => {
                                    // Draw QR code on the composite
                                    ctx.drawImage(qrImg, actualQrX, actualQrY, actualQrWidth, actualQrHeight);
                                    
                                // Convert to blob and download
                                canvas.toBlob((blob) => {
                                  console.log('Canvas converted to blob:', {
                                    size: blob.size,
                                    type: blob.type
                                  });
                                  const filename = `composite-design-${selectedProject?.name || 'design'}.png`;
                                  downloadFile(blob, filename);
                                  toast.success('Fresh composite design downloaded!');
                                }, 'image/png', 1.0);
                                  };
                                  qrImg.src = URL.createObjectURL(qrBlob);
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
                                  const filename = `composite-design-${selectedProject?.name || 'design'}.png`;
                                  downloadFile(blob, filename);
                                  toast.success('Composite design downloaded (with placeholder QR)!');
                                }, 'image/png', 1.0);
                              }
                            } catch (canvasError) {
                              console.error('Canvas generation failed:', canvasError);
                              toast.error('Failed to generate composite image');
                            }
                          };
                          
                          designImg.onerror = () => {
                            console.error('Failed to load design image');
                            toast.error('Failed to load design image');
                          };
                          
                          // Load the design image
                          designImg.src = user.uploadedFiles.design.url;
                          
                        } catch (error) {
                          console.error('Download preparation failed:', error);
                          toast.error(`Download failed: ${error.message}`);
                        }
                      }}
                      className="btn-primary flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12">
                  <Layers className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                  <p className="text-slate-300 mb-4">No composite design available</p>
                  <p className="text-sm text-slate-400">
                    Complete your design setup to generate the composite image
                  </p>
                  <a
                    href="/upload"
                    className="btn-primary mt-4 inline-block"
                  >
                    Go to Upload
                  </a>
                </div>
              )}
            </div>
          </div>

        {/* URL and Actions */}
        <div className="space-y-6">
          {/* Personalized URL */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                Your Personalized URL
              </h2>
              <p className="text-slate-300">
                This is where your QR code will redirect users
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <ExternalLink className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-mono text-slate-200 flex-1 truncate">
                  {personalizedUrl}
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={copyUrl}
                  className="flex-1 btn-secondary flex items-center justify-center"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </>
                  )}
                </button>
                <button
                  onClick={shareUrl}
                  className="flex-1 btn-secondary flex items-center justify-center"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Download Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                Download Options
              </h2>
              <p className="text-slate-300">
                Download your QR code in different formats
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => downloadQRCode(300)}
                disabled={!qrCodeUrl}
                className="w-full btn-primary flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PNG (300x300)
              </button>

              <button
                onClick={downloadHighResQR}
                disabled={!qrCodeUrl}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download High-Res (600x600)
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                How to Use
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-neon-blue/20 text-neon-blue rounded-full flex items-center justify-center text-sm font-medium border border-neon-blue/30">
                  1
                </div>
                <p className="text-sm text-slate-300">
                  Download your QR code image
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-neon-purple/20 text-neon-purple rounded-full flex items-center justify-center text-sm font-medium border border-neon-purple/30">
                  2
                </div>
                <p className="text-sm text-slate-300">
                  Add it to your design at the position you set
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center text-sm font-medium border border-neon-green/30">
                  3
                </div>
                <p className="text-sm text-slate-300">
                  Print your design and share it with your audience
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-neon-orange/20 text-neon-orange rounded-full flex items-center justify-center text-sm font-medium border border-neon-orange/30">
                  4
                </div>
                <p className="text-sm text-slate-300">
                  Track engagement through your analytics dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  }

  // Main design list view
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Mobile Back Button - Top Left */}
        <div className="flex justify-start mb-4 sm:hidden">
          <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm" />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">
              Your Project QR Codes
            </h1>
            <p className="text-slate-300 mt-2">
              Select a project to view and download its QR code
            </p>
          </div>
          {/* Desktop Back Button */}
          <BackButton to="/dashboard" variant="ghost" className="hidden sm:flex" />
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-300">View:</span>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Grid className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-sm text-slate-300">
          {projects.length} project{projects.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-900/20 border border-neon-yellow/30 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-neon-yellow mb-2">🐛 Debug Info</h3>
          <div className="text-xs text-slate-300 space-y-1">
            <p>User has design: {user?.uploadedFiles?.design?.url ? 'Yes' : 'No'}</p>
            <p>User has QR position: {user?.qrPosition ? 'Yes' : 'No'}</p>
            <p>User has social links: {user?.socialLinks && Object.values(user.socialLinks).some(link => link) ? 'Yes' : 'No'}</p>
            <p>User has projects: {user?.projects ? `${user.projects.length} projects` : 'No projects'}</p>
            <p>Projects loaded: {projects.length}</p>
            <p>Is setup complete: {isSetupComplete() ? 'Yes' : 'No'}</p>
            <p>User object keys: {user ? Object.keys(user).join(', ') : 'No user'}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingProjects ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="text-slate-300 ml-4">Loading your projects...</p>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Image className="mx-auto h-16 w-16 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            No Projects Found
          </h3>
          <p className="text-slate-300 mb-6">
            You haven't completed any projects yet. Create and complete a project to generate QR codes for your designs!
          </p>
          <div className="space-y-3">
            <a
              href="/upload"
              className="btn-primary"
            >
              Create Your First Project
            </a>
            <div className="space-y-3">
              <button
                onClick={() => loadProjects(true)}
                className="btn-secondary"
              >
                Refresh Project List
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log('Testing API call...')
                    const response = await uploadAPI.getProjects()
                    console.log('API test response:', response)
                    toast.success('API call successful - check console')
                  } catch (error) {
                    console.error('API test error:', error)
                    toast.error('API call failed - check console')
                  }
                }}
                className="btn-secondary"
              >
                Test API Call
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Project List/Grid */
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {projects.map((project) => (
            <div
              key={project.id}
              className={`card-glass rounded-lg shadow-dark-large border border-slate-600/30 hover:border-neon-blue/30 transition-all duration-200 cursor-pointer ${
                viewMode === 'list' ? 'p-6' : 'p-6'
              }`}
              onClick={() => selectProject(project)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-button-gradient rounded-lg flex items-center justify-center mr-4 shadow-glow-purple">
                    <QrCode className="w-6 h-6 text-slate-100" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{project.name}</h3>
                    <p className="text-sm text-slate-300">{project.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded-full border border-neon-green/30">
                    {project.status}
                  </span>
                  <Eye className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              
              <div className="flex items-center text-sm text-slate-400 mb-4">
                <Calendar className="w-4 h-4 mr-2" />
                Created: {project.createdAt.toLocaleDateString()}
              </div>
              
              {project.lastGenerated && (
                <div className="flex items-center text-sm text-slate-400 mb-4">
                  <QrCode className="w-4 h-4 mr-2" />
                  Last QR generated: {project.lastGenerated.toLocaleDateString()}
                </div>
              )}

              {/* Composite Design Preview */}
              {user?.uploadedFiles?.compositeDesign?.url && (
                <div className="mb-4">
                  <div className="flex items-center text-sm text-slate-400 mb-2">
                    <Layers className="w-4 h-4 mr-2" />
                    Composite Design
                  </div>
                  <div className="relative">
                    <img
                      src={user.uploadedFiles.compositeDesign.url}
                      alt="Composite Design Preview"
                      className="w-full h-32 object-cover rounded-lg border border-slate-600/30"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    selectProject(project)
                  }}
                  className="flex-1 btn-primary text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  View QR Code
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Quick download
                    downloadQRCode(300)
                  }}
                  className="flex-1 bg-slate-700 text-slate-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Quick Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default QRCodePage
