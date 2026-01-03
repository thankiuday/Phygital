/**
 * QR Redirect Page
 * Branded redirect page for QR-link campaigns
 * Displays "Powered by Phygital.zone" for 1 second before redirecting to target URL
 */

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { phygitalizedAPI, analyticsAPI } from '../../utils/api'
import { getUserLocation, reverseGeocode } from '../../utils/geolocation'
import { getDeviceInfo } from '../../utils/deviceInfo'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import PhygitalizedFooter from '../../components/Phygitalized/PhygitalizedFooter'

const QRRedirectPage = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [targetUrl, setTargetUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(1)
  const [isUpgradedCampaign, setIsUpgradedCampaign] = useState(false)
  const [landingPagePath, setLandingPagePath] = useState(null)
  const userIdRef = useRef(null)
  const scanTrackedRef = useRef(false)
  const pageViewTrackedRef = useRef(false)

  useEffect(() => {
    const fetchTargetUrl = async () => {
      try {
        setLoading(true)
        
        // Fetch campaign data from backend
        const response = await phygitalizedAPI.getPublicCampaign(projectId)
        
        if (response.data?.success && response.data?.data) {
          const campaignData = response.data.data
          
          // Store userId for analytics tracking
          userIdRef.current = campaignData.userId
          
          // Check campaign type to see if it was upgraded from qr-link
          const campaignType = campaignData.campaignType || campaignData.type
          
          console.log('🔍 QRRedirectPage: Checking campaign type:', {
            projectId,
            campaignType,
            isUpgraded: campaignType && campaignType !== 'qr-link'
          })
          
          // If campaign was upgraded (any type other than qr-link), redirect to landing page
          if (campaignType && campaignType !== 'qr-link') {
            // Determine the landing page path based on campaign type
            let path = null
            switch (campaignType) {
              case 'qr-links':
                path = `/phygitalized/links/${projectId}`
                break
              case 'qr-links-video':
                path = `/phygitalized/video/${projectId}`
                break
              case 'qr-links-pdf-video':
                path = `/phygitalized/pdf-video/${projectId}`
                break
              case 'qr-links-ar-video':
                if (campaignData.userId) {
                  path = `/ar/user/${campaignData.userId}/project/${projectId}`
                }
                break
            }
            
            if (path) {
              console.log('✅ QRRedirectPage: Campaign upgraded, redirecting to landing page:', {
                campaignType,
                path
              })
              setIsUpgradedCampaign(true)
              setLandingPagePath(path)
              setTargetUrl('landing-page') // Set a flag value to trigger redirect effect
              setLoading(false)
              
              // Track analytics immediately after data is loaded
              trackQRLinkAnalytics(campaignData.userId, projectId)
              return
            } else {
              console.warn('⚠️ QRRedirectPage: Could not determine landing page path for campaign type:', campaignType)
            }
          }
          
          // Original behavior for qr-link campaigns: extract target URL
          const url = campaignData.phygitalizedData?.targetUrl || campaignData.phygitalizedData?.url
          
          if (!url) {
            setError('No target URL found for this campaign')
            setLoading(false)
            return
          }
          
          // Ensure URL has protocol
          const finalUrl = url.startsWith('http://') || url.startsWith('https://') 
            ? url 
            : `https://${url}`
          
          setTargetUrl(finalUrl)
          setLoading(false)
          
          // Track analytics immediately after data is loaded
          trackQRLinkAnalytics(campaignData.userId, projectId)
        } else {
          setError('Campaign not found')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching campaign data:', err)
        setError('Failed to load campaign data')
        setLoading(false)
      }
    }

    if (projectId) {
      fetchTargetUrl()
    } else {
      setError('Invalid campaign ID')
      setLoading(false)
    }
  }, [projectId])

  // Track analytics for QR link campaigns
  const trackQRLinkAnalytics = async (userId, projectId) => {
    if (!userId || !projectId) return

    // Track scan event immediately (non-blocking)
    if (!scanTrackedRef.current) {
      scanTrackedRef.current = true
      
      try {
        // Get device info
        const deviceInfo = getDeviceInfo()
        
        // Track scan with device info (location will be added asynchronously if available)
        const scanData = {
          location: {}, // Will be populated if location is available
          deviceType: deviceInfo.type,
          browser: deviceInfo.browser,
          os: deviceInfo.os
        }
        
        // Track scan immediately
        await analyticsAPI.trackScan(userId, scanData, projectId)
        console.log('✅ QR link scan tracked:', { userId, projectId })
        
        // Attempt to get location asynchronously (non-blocking)
        // If location is available, we could track another scan event with location
        // But for simplicity, we'll track it as part of the initial scan
        // The backend will handle location if it's in the scanData
        getUserLocation()
          .then(async (coords) => {
            if (coords) {
              try {
                // Reverse geocode to get address details
                const address = await reverseGeocode(coords.latitude, coords.longitude)
                const locationData = {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  village: address.village,
                  city: address.city,
                  state: address.state,
                  country: address.country
                }
                
                // Track another scan event with location data
                // Note: The backend deduplication middleware will prevent duplicate counts
                const scanDataWithLocation = {
                  location: locationData,
                  deviceType: deviceInfo.type,
                  browser: deviceInfo.browser,
                  os: deviceInfo.os
                }
                
                await analyticsAPI.trackScan(userId, scanDataWithLocation, projectId)
                console.log('✅ QR link scan with location tracked:', { userId, projectId, location: locationData })
              } catch (geocodeError) {
                console.warn('⚠️ Failed to reverse geocode location:', geocodeError)
              }
            }
          })
          .catch((locationError) => {
            // Location permission denied or unavailable - this is expected and normal
            console.log('ℹ️ Location not available for QR link scan:', locationError.message)
          })
      } catch (error) {
        console.error('❌ Failed to track QR link scan:', error)
      }
    }

    // Track page view
    if (!pageViewTrackedRef.current) {
      pageViewTrackedRef.current = true
      try {
        await analyticsAPI.trackPageView(userId, projectId)
        console.log('✅ QR link page view tracked:', { userId, projectId })
      } catch (error) {
        console.error('❌ Failed to track QR link page view:', error)
      }
    }
  }

  useEffect(() => {
    // Start countdown and redirect when target URL is available
    if (targetUrl && !loading) {
      // Countdown from 1 second
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 0.1) {
            clearInterval(countdownInterval)
            return 0
          }
          return prev - 0.1
        })
      }, 100)

      // Redirect after 1 second
      const redirectTimer = setTimeout(() => {
        if (isUpgradedCampaign && landingPagePath) {
          // Redirect to phygitalized landing page for upgraded campaigns
          console.log('🔀 QRRedirectPage: Redirecting to landing page for upgraded campaign:', landingPagePath)
          navigate(landingPagePath)
        } else {
          // Redirect to original target URL for qr-link campaigns
          window.location.href = targetUrl
        }
      }, 1000)

      return () => {
        clearTimeout(redirectTimer)
        clearInterval(countdownInterval)
      }
    }
  }, [targetUrl, loading, isUpgradedCampaign, landingPagePath, navigate, projectId])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-slate-300 mt-4 text-sm">Loading...</p>
          </div>
        </div>
        <PhygitalizedFooter />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Oops!</h1>
              <p className="text-slate-300">{error}</p>
            </div>
            <p className="text-sm text-slate-400">
              Please check the QR code and try again.
            </p>
          </div>
        </div>
        <PhygitalizedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {/* Loading Spinner */}
          <div className="mb-6">
            <LoadingSpinner size="lg" />
          </div>

          {/* Branding Text */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              Powered by Phygital.zone
            </h1>
            <p className="text-sm text-slate-400">
              Redirecting you in {countdown.toFixed(1)}s...
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-8 w-full max-w-xs mx-auto">
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink transition-all duration-100 ease-linear"
                style={{ width: `${(1 - countdown) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <PhygitalizedFooter />
    </div>
  )
}

export default QRRedirectPage

