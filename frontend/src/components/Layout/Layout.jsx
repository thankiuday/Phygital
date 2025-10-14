/**
 * Layout Component
 * Main layout wrapper with navigation and footer
 * Handles responsive design and navigation state
 */

import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Menu, 
  X, 
  Home, 
  Upload, 
  QrCode, 
  BarChart3, 
  User, 
  LogOut,
  Settings,
  FolderKanban
} from 'lucide-react'

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const navigation = [
    { name: 'Home', href: '/', icon: Home, public: true, authOnly: false },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, public: false, authOnly: true },
    { name: 'Upload', href: '/upload', icon: Upload, public: false, authOnly: true },
    { name: 'Projects', href: '/projects', icon: FolderKanban, public: false, authOnly: true },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, public: false, authOnly: true },
    { name: 'Profile', href: '/profile', icon: User, public: false, authOnly: true },
  ]

  const filteredNavigation = navigation.filter(item => {
    // If authenticated, show only authenticated-only items (hide public items like Home)
    if (isAuthenticated) {
      return item.authOnly
    }
    // If not authenticated, show only public items
    return item.public
  })

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-dark-mesh">
      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur-sm shadow-dark-large border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="group flex items-center space-x-3 hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-button-gradient rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
                  <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gradient group-hover:text-gradient-aurora transition-all duration-300">
                  Phygital
                </span>
              </Link>
            </div>

            {/* Clean Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                const isUpload = item.name === 'Upload'
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group relative flex items-center transition-all duration-200 ${
                      isUpload && active
                        ? 'px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-button-gradient hover:shadow-glow-lg transform hover:scale-105'
                        : isUpload && !active
                          ? 'px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-neon-blue hover:bg-slate-800/50'
                          : active
                            ? 'px-3 py-2 rounded-lg text-sm font-medium text-neon-blue bg-slate-800/50'
                            : 'px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-neon-blue hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-2 ${
                      isUpload && active
                        ? 'text-white' 
                        : active 
                          ? 'text-neon-blue' 
                          : 'text-slate-400 group-hover:text-neon-blue'
                    }`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Clean User Menu */}
            <div className="hidden md:flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800">
                    <div className="w-8 h-8 bg-accent-gradient rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden lg:block">
                      <span className="text-sm font-medium text-slate-100">
                        {user?.username}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 text-sm font-medium text-slate-300 hover:text-neon-red hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    <span className="hidden lg:inline">Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-neon-purple transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-medium text-white bg-accent-gradient hover:shadow-glow-accent rounded-lg transition-all duration-200"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl text-slate-300 hover:text-neon-purple hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-neon-purple focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-300 transform hover:scale-110 touch-manipulation"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 rotate-180 transition-transform duration-300" />
                ) : (
                  <Menu className="w-6 h-6 transition-transform duration-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-3 pt-3 pb-4 space-y-1 bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700 shadow-dark-large">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group relative flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 touch-manipulation ${
                      active
                        ? 'text-white bg-button-gradient shadow-glow'
                        : 'text-slate-300 hover:text-neon-purple hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 relative z-20 ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-neon-purple'
                    }`} />
                    <span className="relative z-20">{item.name}</span>
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse relative z-20" />
                    )}
                    
                    {/* Background for hover state */}
                    {!active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                    )}
                  </Link>
                )
              })}
              
              {isAuthenticated && (
                <div className="border-t border-slate-700 pt-3 mt-3 space-y-2">
                  <div className="flex items-center space-x-3 px-3 py-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent-gradient rounded-full flex items-center justify-center">
                      <span className="text-white text-sm sm:text-lg font-semibold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base font-medium text-slate-100">
                        {user?.username}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400">Welcome back!</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="group relative flex items-center space-x-3 w-full px-3 py-3 text-sm font-medium text-slate-300 hover:text-neon-red hover:bg-red-900/20 rounded-xl transition-all duration-300 transform hover:scale-105 touch-manipulation"
                  >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform duration-300 relative z-20" />
                    <span className="relative z-20">Logout</span>
                    <div className="absolute inset-0 bg-red-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                  </button>
                </div>
              )}
              
              {!isAuthenticated && (
                <div className="border-t border-slate-700 pt-3 mt-3 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-3 text-sm font-medium text-slate-300 hover:text-neon-purple hover:bg-slate-800/50 rounded-xl transition-all duration-300 transform hover:scale-105 touch-manipulation"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-3 text-sm font-medium text-white bg-accent-gradient hover:shadow-glow-accent rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 text-center touch-manipulation"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Brand */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-button-gradient rounded-lg flex items-center justify-center">
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-gradient">Phygital</span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md">
                Transform your physical designs into interactive digital experiences. 
                Bridge the gap between physical and digital worlds with QR codes and videos.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider mb-3 sm:mb-4">
                Quick Links
              </h3>
              <ul className="space-y-1 sm:space-y-2">
                <li>
                  <Link to="/" className="text-xs sm:text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200">
                    Home
                  </Link>
                </li>
                {isAuthenticated && (
                  <>
                    <li>
                      <Link to="/dashboard" className="text-xs sm:text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200">
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link to="/upload" className="text-xs sm:text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200">
                        Upload
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-wider mb-3 sm:mb-4">
                Support
              </h3>
              <ul className="space-y-1 sm:space-y-2">
                <li>
                  <a href="#" className="text-xs sm:text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-xs sm:text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-xs sm:text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 lg:mt-8 pt-4 sm:pt-6 lg:pt-8 border-t border-slate-700">
            <p className="text-center text-xs sm:text-sm text-slate-400">
              © 2024 Phygital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
