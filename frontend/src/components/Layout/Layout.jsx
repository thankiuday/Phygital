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
  const isLandingPage = location.pathname.includes('/phygitalized/') || 
                        location.pathname.includes('/ar/') ||
                        location.pathname.includes('/ar-3d/') ||
                        location.pathname.includes('/ar-experience/')

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
      
      {/* Professional Navigation */}
      <ProfessionalNav />
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer - Hidden on landing pages */}
      {!isLandingPage && <Footer />}
    </div>
  )
}

export default Layout