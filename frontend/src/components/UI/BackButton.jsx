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
  variant = 'default' 
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

  const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
  
  const variantClasses = {
    default: "bg-slate-800/80 backdrop-blur-sm text-slate-200 border border-slate-600 hover:bg-slate-700 hover:border-slate-500",
    ghost: "bg-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/50",
    primary: "bg-button-gradient text-white hover:shadow-glow",
    secondary: "bg-slate-700/80 text-slate-200 border border-slate-600 hover:bg-slate-600"
  }

  return (
    <button
      onClick={handleBack}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-label={`Go back${to ? ` to ${to}` : ''}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {text}
    </button>
  )
}

export default BackButton

