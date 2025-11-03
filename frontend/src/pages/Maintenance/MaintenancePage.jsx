/**
 * Phygital Zone - Maintenance Page
 * Displayed when the website is under maintenance
 */

import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Wrench, 
  Clock, 
  Sparkles,
  Mail,
  Heart,
  Zap,
  RefreshCw,
  Code,
  Cpu,
  Phone
} from 'lucide-react'
import { getMaintenanceConfig } from '../../config/maintenance'

const MaintenancePage = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const config = getMaintenanceConfig()

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Get expected return time from config
  const expectedReturn = config.expectedReturn

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden py-8 sm:py-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-64 h-64 sm:w-96 sm:h-96 -top-32 sm:-top-48 -left-32 sm:-left-48 bg-neon-purple/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-64 h-64 sm:w-96 sm:h-96 -bottom-32 sm:-bottom-48 -right-32 sm:-right-48 bg-neon-blue/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-64 h-64 sm:w-96 sm:h-96 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neon-pink/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating Elements - Hidden on mobile */}
      <div className="hidden lg:block absolute top-20 left-20 animate-float opacity-20">
        <Code className="w-24 h-24 xl:w-32 xl:h-32 text-neon-blue" />
      </div>
      <div className="hidden lg:block absolute bottom-20 right-20 animate-float opacity-20" style={{ animationDelay: '1.5s' }}>
        <Cpu className="w-20 h-20 xl:w-24 xl:h-24 text-neon-purple" />
      </div>
      <div className="hidden lg:block absolute top-40 right-40 animate-float opacity-20" style={{ animationDelay: '0.5s' }}>
        <Zap className="w-16 h-16 xl:w-20 xl:h-20 text-neon-pink" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        {/* Logo/Icon Section */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="inline-block relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-br from-neon-blue to-neon-purple p-1 animate-pulse">
              <div className="w-full h-full bg-slate-900 rounded-2xl sm:rounded-3xl flex items-center justify-center">
                <Settings className="w-12 h-12 sm:w-16 sm:h-16 text-white animate-spin-slow" />
              </div>
            </div>
            {/* Decorative glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/30 to-neon-purple/30 rounded-2xl sm:rounded-3xl blur-3xl -z-10 animate-glow-pulse"></div>
            {/* Sparkles around settings icon */}
            <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 text-neon-pink animate-sparkle-1" />
            <Sparkles className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 text-neon-cyan animate-sparkle-2" />
            <Sparkles className="absolute top-0 left-0 w-4 h-4 sm:w-5 sm:h-5 text-neon-orange animate-sparkle-3" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-neon-orange/20 to-neon-pink/20 border border-neon-orange/30 rounded-full mb-6 sm:mb-8 animate-fade-in backdrop-blur-sm">
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-neon-orange animate-spin" />
          <span className="text-sm sm:text-base text-neon-orange font-semibold">Under Maintenance</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-100 mb-4 sm:mb-6 px-2 animate-fade-in leading-tight" style={{ animationDelay: '0.1s' }}>
          We're Making Things
          <br className="hidden sm:block" />
          <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
            Even Better
          </span>
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-12 px-4 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {config.MESSAGE}
        </p>

        {/* Time Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto mb-8 sm:mb-12 px-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {/* Current Time */}
          <div className="card-glass p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-600/30 hover:border-neon-blue/50 transition-all duration-300">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-neon-blue mx-auto mb-2 sm:mb-3" />
            <div className="text-xs sm:text-sm text-slate-400 mb-2">Current Time</div>
            <div className="text-xl sm:text-2xl font-bold text-gradient bg-gradient-to-r from-neon-blue to-neon-cyan bg-clip-text text-transparent">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-slate-500 mt-1 leading-tight">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Expected Return */}
          <div className="card-glass p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-600/30 hover:border-neon-purple/50 transition-all duration-300">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-neon-purple mx-auto mb-2 sm:mb-3 animate-pulse" />
            <div className="text-xs sm:text-sm text-slate-400 mb-2">Expected Return</div>
            <div className="text-xl sm:text-2xl font-bold text-gradient bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
              {formatTime(expectedReturn)}
            </div>
            <div className="text-xs text-slate-500 mt-1 leading-tight">
              Approximately 2 hours
            </div>
          </div>
        </div>

        {/* What We're Doing */}
        <div className="card-elevated p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-600/50 max-w-2xl mx-auto mb-8 sm:mb-12 px-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-4 sm:mb-6 flex items-center justify-center gap-2 sm:gap-3">
            <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-neon-blue" />
            What We're Working On
          </h2>
          <div className="space-y-3 sm:space-y-4 text-left">
            {config.TASKS.map((task, index) => {
              const colors = ['bg-neon-blue', 'bg-neon-purple', 'bg-neon-pink', 'bg-neon-cyan']
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${colors[index % colors.length]} mt-2 flex-shrink-0`}></div>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{task}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-8 sm:mb-12 px-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={handleRefresh}
            className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-bold text-base sm:text-lg shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 sm:gap-3 mx-auto"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-180 transition-transform duration-500" />
            Check If We're Back
          </button>
        </div>

        {/* Contact Section */}
        <div className="animate-fade-in px-4" style={{ animationDelay: '0.6s' }}>
          <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6">
            Need urgent assistance? Contact us:
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <a 
              href={`mailto:${config.CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-neon-blue hover:text-neon-cyan transition-colors duration-300 font-semibold text-base sm:text-lg"
            >
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="break-all">{config.CONTACT_EMAIL}</span>
            </a>
            {config.CONTACT_PHONE && (
              <>
                <span className="hidden sm:inline text-slate-600">•</span>
                <a 
                  href={`tel:+17049667158`}
                  className="inline-flex items-center gap-2 text-neon-green hover:text-neon-cyan transition-colors duration-300 font-semibold text-base sm:text-lg"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  {config.CONTACT_PHONE}
                </a>
              </>
            )}
          </div>
        </div>

        {/* Footer Message */}
        <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-slate-500 animate-fade-in px-4" style={{ animationDelay: '0.8s' }}>
          <span>Made with</span>
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-neon-pink animate-pulse" />
          <span>by the Phygital Zone Team</span>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        @keyframes glow-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        .animate-glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }

        @keyframes sparkle-1 {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(180deg);
          }
        }

        .animate-sparkle-1 {
          animation: sparkle-1 2s ease-in-out infinite;
        }

        @keyframes sparkle-2 {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.3) rotate(-180deg);
          }
        }

        .animate-sparkle-2 {
          animation: sparkle-2 2.5s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        @keyframes sparkle-3 {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.4) rotate(360deg);
          }
        }

        .animate-sparkle-3 {
          animation: sparkle-3 3s ease-in-out infinite;
          animation-delay: 1s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default MaintenancePage

