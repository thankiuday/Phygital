/**
 * Back Button Component
 * Reusable back button with consistent styling and navigation
 * Supports both browser history and custom navigation
 */

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const BackButton = ({ 
  to = null, 
  text = 'Back', 
  className = '',
  variant = 'default',
  iconOnlyOnMobile = true,
  floating = false,
  hasNavBar = false // New prop to indicate if page has navigation bar
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    if (to) {
      navigate(to)
    } else if (location.key !== 'default') {
      // If there's browser history, go back
      navigate(-1)
    } else {
      // Fallback to home page
      navigate('/')
    }
  }

  const baseClasses = "inline-flex items-center gap-2 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
  
  const variantClasses = {
    default: "bg-slate-800/80 backdrop-blur-md text-slate-200 border border-slate-600/40 hover:bg-slate-700/80 hover:border-slate-500/50 shadow-lg",
    ghost: "bg-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/40",
    primary: "bg-button-gradient text-white hover:shadow-glow",
    secondary: "bg-slate-700/80 text-slate-200 border border-slate-600 hover:bg-slate-600",
    floating: "bg-slate-900/70 backdrop-blur-xl text-white border border-slate-700/50 shadow-xl hover:bg-slate-800/70"
  }

  const paddingClasses = iconOnlyOnMobile
    ? "px-3 py-2 sm:px-4 sm:py-2"
    : "px-4 py-2"

  // Adjust top position based on whether page has navigation bar
  // Navigation bar is typically 64px (h-16), so we add some spacing
  const topPosition = hasNavBar ? 'top-20' : 'top-3'
  
  const layoutClasses = floating
    ? `hidden sm:flex fixed left-3 ${topPosition} sm:static sm:left-auto sm:top-auto z-50`
    : ""

  return (
    <button
      onClick={handleBack}
      className={`${baseClasses} ${paddingClasses} ${variantClasses[variant]} ${layoutClasses} ${className}`}
      aria-label={`Go back${to ? ` to ${to}` : ''}`}
    >
      <ArrowLeft className="h-5 w-5" />
      <span className={`${iconOnlyOnMobile ? 'hidden sm:inline' : ''}`}>{text}</span>
    </button>
  )
}

export default BackButton



