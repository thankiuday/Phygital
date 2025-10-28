/**
 * User Page Component
 * Personalized page that displays when QR codes are scanned
 * Shows user's design, video, and social links
 */

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { userAPI, analyticsAPI } from '../../utils/api'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ExternalLink,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Globe
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import ProjectDisabledScreen from '../../components/AR/ProjectDisabledScreen'
import toast from 'react-hot-toast'

const UserPage = () => {
  const { username } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project') // Get projectId from URL query params
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoViewTracked, setVideoViewTracked] = useState(false) // Track if we've already counted this video view
  const [isProjectDisabled, setIsProjectDisabled] = useState(false)
  const [disabledProjectName, setDisabledProjectName] = useState('')
  const videoRef = useRef(null)

  useEffect(() => {
    if (username) {
      fetchUserData()
    }
  }, [username])

  useEffect(() => {
    // Track page view and QR scan with projectId
    if (userData?._id) {
      // Create a unique session key based on userId, projectId, and timestamp (rounded to nearest minute)
      // NOTE: QR scan tracking is now handled in useProjectData.js hook
      // This prevents double-counting when users navigate between UserPage and AR experience
      
      // Track page view only
      analyticsAPI.trackPageView(userData._id, projectId);
    }
  }, [userData, projectId])

  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      const response = await userAPI.getUser(username)
      const user = response.data.data.user
      
      // If projectId is provided, check if that project is disabled
      if (projectId && user.projects) {
        const project = user.projects.find(p => p.id === projectId)
        if (project && project.isEnabled === false) {
          console.log('🚫 Project is disabled:', project.name)
          setIsProjectDisabled(true)
          setDisabledProjectName(project.name)
          setIsLoading(false)
          return
        }
      }
      
      setUserData(user)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      toast.error('User not found')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }

  const handleVideoProgress = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setVideoProgress(progress)
      
      // NOTE: Video view tracking is now handled in useARLogic.js hook
      // This prevents double-counting when users watch videos in AR experience
    }
  }

  const handleVideoEnd = () => {
    setIsVideoPlaying(false)
    setVideoProgress(0)
    setVideoViewTracked(false) // Reset so replay counts as a new view
  }

  const handleSocialLinkClick = (platform, url) => {
    try {
      if (userData?._id && url) {
        // Use sessionStorage for deduplication (prevents double-tracking in React Strict Mode)
        const sessionMinute = Math.floor(Date.now() / 60000);
        const clickSessionKey = `linkclick_${userData._id}_${projectId || 'user'}_${platform}_${sessionMinute}`;
        const alreadyTrackedClick = sessionStorage.getItem(clickSessionKey);
        
        if (!alreadyTrackedClick) {
          // Set the key BEFORE tracking to prevent race conditions in React Strict Mode
          sessionStorage.setItem(clickSessionKey, 'true');
          console.log('🔗 Social link clicked:', { platform, url, userId: userData._id, projectId });
          
          analyticsAPI.trackLinkClick(userData._id, platform, url, projectId).then(() => {
            console.log('✅ Link click tracked successfully:', { platform });
          }).catch((err) => {
            console.warn('⚠️ Link click tracking failed:', err);
            // Remove the key if tracking failed so it can be retried
            sessionStorage.removeItem(clickSessionKey);
          });
        } else {
          console.log('ℹ️ Link click already tracked in this minute, skipping duplicate:', { platform, url });
        }
      }
    } catch (err) {
      console.error('❌ Error tracking link click:', err);
    }
    
    // Always open the link regardless of tracking
    window.open(url, '_blank')
  }

  const getSocialIcon = (platform) => {
    switch (platform) {
      case 'instagram':
        return Instagram
      case 'facebook':
        return Facebook
      case 'twitter':
        return Twitter
      case 'linkedin':
        return Linkedin
      case 'website':
        return Globe
      default:
        return ExternalLink
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-mesh">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show disabled screen if project is disabled
  if (isProjectDisabled) {
    return <ProjectDisabledScreen projectName={disabledProjectName} />
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-mesh">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">
            User Not Found
          </h1>
          <p className="text-slate-400">
            The user you're looking for doesn't exist or hasn't completed their setup.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-mesh">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-sm shadow-dark-large">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-button-gradient rounded-lg flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-gradient">Phygital</span>
            </div>
            <div className="text-sm text-slate-400">
              @{userData.username}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Design Image */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-slate-800/80 rounded-lg shadow-sm overflow-hidden">
              {userData.uploadedFiles?.design?.url ? (
                <img
                  src={userData.uploadedFiles.design.url}
                  alt="Design"
                  className="w-full h-auto max-h-[400px] sm:max-h-[500px] object-contain"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center bg-slate-700">
                  <p className="text-slate-400 text-sm sm:text-base">No design uploaded</p>
                </div>
              )}
            </div>

            {/* Video Player */}
            {userData.uploadedFiles?.video?.url && (
              <div className="bg-slate-800/80 rounded-lg shadow-sm overflow-hidden">
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={userData.uploadedFiles.video.url}
                    className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain"
                    onTimeUpdate={handleVideoProgress}
                    onEnded={handleVideoEnd}
                    muted={isMuted}
                    playsInline
                    preload="metadata"
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={handleVideoPlay}
                        className="bg-slate-800/80 bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 sm:p-3 shadow-lg transition-all duration-200 touch-manipulation"
                      >
                        {isVideoPlaying ? (
                          <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-slate-100" />
                        ) : (
                          <Play className="h-5 w-5 sm:h-6 sm:w-6 text-slate-100 ml-0.5 sm:ml-1" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Video Controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 sm:p-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <button
                        onClick={handleVideoPlay}
                        className="text-white hover:text-gray-300 transition-colors duration-200 touch-manipulation p-1"
                      >
                        {isVideoPlaying ? (
                          <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                      
                      <div className="flex-1 bg-gray-600 rounded-full h-1">
                        <div 
                          className="bg-slate-800/80 h-1 rounded-full transition-all duration-200"
                          style={{ width: `${videoProgress}%` }}
                        ></div>
                      </div>
                      
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-white hover:text-gray-300 transition-colors duration-200 touch-manipulation p-1"
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Info and Social Links */}
          <div className="space-y-4 sm:space-y-6">
            {/* User Info */}
            <div className="bg-slate-800/80 rounded-lg shadow-sm p-4 sm:p-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
                {userData.username}
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4">
                Interactive digital experience powered by Phygital
              </p>
              
              <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-primary-600">
                    {userData.analytics?.totalScans || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">Scans</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {userData.analytics?.videoViews || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">Views</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">
                    {userData.analytics?.linkClicks || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">Clicks</p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            {Object.values(userData.socialLinks || {}).some(link => link) && (
              <div className="bg-slate-800/80 rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-slate-100 mb-3 sm:mb-4">
                  Connect With Me
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {Object.entries(userData.socialLinks || {}).map(([platform, url]) => {
                    if (!url) return null
                    
                    const Icon = getSocialIcon(platform)
                    return (
                      <button
                        key={platform}
                        onClick={() => handleSocialLinkClick(platform, url)}
                        className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group touch-manipulation"
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-primary-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-slate-400 group-hover:text-primary-600 capitalize">
                          {platform}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg shadow-sm p-4 sm:p-6 text-white">
              <h2 className="text-base sm:text-lg font-semibold mb-2">
                Create Your Own Phygital Experience
              </h2>
              <p className="text-primary-100 mb-3 sm:mb-4 text-sm sm:text-base">
                Transform your physical designs into interactive digital experiences
              </p>
              <a
                href="/register"
                className="inline-flex items-center px-3 sm:px-4 py-2 bg-slate-800/80 text-primary-600 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200 touch-manipulation text-sm sm:text-base"
              >
                Get Started Free
                <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/80 border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-primary-600 to-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">P</span>
              </div>
              <span className="text-sm font-medium text-slate-100">Phygital</span>
            </div>
            <p className="text-sm text-slate-400">
              Powered by Phygital Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default UserPage
