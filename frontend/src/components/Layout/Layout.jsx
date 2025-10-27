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

const Layout = () => {
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)
  const location = useLocation()

  // Handle page transition with minimum 1-second loader
  useEffect(() => {
    // Scroll to top immediately
    window.scrollTo({ top: 0, behavior: 'instant' })

    // Show loader immediately
    setIsPageTransitioning(true)

    // Set minimum 1-second display time
    const minLoaderTime = 1000 // 1 second minimum
    const startTime = Date.now()

    // Hide loader after minimum time has passed
    const timer = setTimeout(() => {
      const elapsed = Date.now() - startTime
      if (elapsed >= minLoaderTime) {
        setIsPageTransitioning(false)
      } else {
        // If less than 1 second has passed, wait for the remaining time
        setTimeout(() => {
          setIsPageTransitioning(false)
        }, minLoaderTime - elapsed)
      }
    }, minLoaderTime)

    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-dark-mesh">
      {/* Page Transition Loader */}
      <PageTransitionLoader isLoading={isPageTransitioning} />
      
      {/* Professional Navigation */}
      <ProfessionalNav />
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout