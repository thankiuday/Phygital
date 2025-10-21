/**
 * 404 Not Found Page Component
 * Displays when a route is not found
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-mesh px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-bold text-neon-blue mb-4">404</h1>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-4">
            Page Not Found
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mb-8">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-button-gradient hover:shadow-glow transition-all duration-200"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-slate-600 text-sm sm:text-base font-medium rounded-md text-slate-300 bg-slate-800/50 hover:bg-slate-700/50 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
