/**
 * Layout Component
 * Main layout wrapper with professional navigation
 * Handles responsive design and page transitions
 */

import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import PageTransitionLoader from '../UI/PageTransitionLoader'
import ProfessionalNav from '../Navigation/ProfessionalNav'
import Footer from './Footer'

const Layout = () => {
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)
  const location = useLocation()

  // Check if current page is a landing page (phygitalized or AR experience)
  // Exclude QR creation pages and selection page from being treated as landing pages
  const isQRCreationPage = location.pathname.includes('/phygitalized/qr-link') ||
                           location.pathname.includes('/phygitalized/qr-links') ||
                           location.pathname.includes('/phygitalized/qr-links-video') ||
                           location.pathname.includes('/phygitalized/qr-links-pdf-video') ||
                           location.pathname.includes('/phygitalized/qr-links-ar-video') ||
                           location.pathname.includes('/phygitalized/select')
  
  const isLandingPage = (location.pathname.includes('/phygitalized/') && !isQRCreationPage) || 
                        location.pathname.includes('/ar/') ||
                        location.pathname.includes('/ar-3d/') ||
                        location.pathname.includes('/ar-experience/') ||
                        location.pathname.startsWith('/card/')
  
  // Business card pages should not show navbar
  const isBusinessCardPage = location.pathname.startsWith('/card/')
  
  // Landing pages should show ProfessionalNav (which renders "Powered by" navbar) but NOT footer
  // QR creation pages should show regular navbar and footer
  // Regular pages should show navbar and footer
  // Business card pages should NOT show navbar
  const shouldShowNav = !isBusinessCardPage // Hide navbar for business card pages
  const shouldShowFooter = !isLandingPage || isQRCreationPage // Hide footer on landing pages only

  // Handle page transition with smooth loader
  useEffect(() => {
    // Scroll to top immediately
    window.scrollTo({ top: 0, behavior: 'instant' })

    let showTimer
    let hideTimer
    let loaderShown = false

    // Only show loader if page transition takes longer than 200ms
    showTimer = setTimeout(() => {
      setIsPageTransitioning(true)
      loaderShown = true
      
      // If loader is shown, keep it visible for at least 400ms for smooth experience
      hideTimer = setTimeout(() => {
        setIsPageTransitioning(false)
      }, 400)
    }, 200) // Wait 200ms before showing loader

    // If page loads quickly, cancel the loader
    const quickLoadTimer = setTimeout(() => {
      if (!loaderShown) {
        clearTimeout(showTimer)
      }
    }, 100)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
      clearTimeout(quickLoadTimer)
      // Ensure loader is hidden on cleanup
      setIsPageTransitioning(false)
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-dark-mesh flex flex-col">
      {/* Page Transition Loader */}
      <PageTransitionLoader isLoading={isPageTransitioning} />
      
      {/* Professional Navigation - Always show (ProfessionalNav handles landing page "Powered by" styling) */}
      {shouldShowNav && <ProfessionalNav />}
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer - Show on regular pages and QR creation pages, but NOT on landing pages */}
      {shouldShowFooter && <Footer />}
    </div>
  )
}

export default Layout