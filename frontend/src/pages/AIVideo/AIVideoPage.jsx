/**
 * AI Video Feature Page
 * Showcases upcoming AI-powered video generation feature
 */

import React, { useState } from 'react'
import { 
  Sparkles, 
  Video, 
  Mic, 
  Image as ImageIcon, 
  Wand2,
  CheckCircle,
  ArrowRight,
  Upload,
  Type,
  Zap,
  Star,
  Clock,
  Users,
  TrendingUp,
  Brain,
  MessageSquare,
  FileText,
  Loader2,
  PartyPopper
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const AIVideoPage = () => {
  const [hoveredFeature, setHoveredFeature] = useState(null)
  const [activeStep, setActiveStep] = useState(0)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleNotifyMe = async (e) => {
    e.preventDefault()
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      toast.error('Please enter a valid email address', {
        icon: '⚠️',
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #ef4444',
        },
      })
      return
    }

    // Simulate submission with animation
    setIsSubmitting(true)
    
    // Wait for 1.5 seconds to simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      
      // Show success toast with custom styling
      toast.success(
        <div className="flex items-center gap-2">
          <PartyPopper className="w-5 h-5" />
          <span>You're on the list! We'll notify you when we launch.</span>
        </div>,
        {
          duration: 5000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #10b981',
            padding: '16px',
          },
        }
      )
      
      // Clear email after 2 seconds
      setTimeout(() => {
        setEmail('')
        setIsSubmitted(false)
      }, 2000)
    }, 1500)
  }

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Generation',
      description: 'Advanced AI technology that brings your images to life with realistic speech and lip-sync',
      color: 'from-neon-blue to-neon-cyan'
    },
    {
      icon: Mic,
      title: 'Natural Voice Synthesis',
      description: 'Convert any text to natural-sounding speech in multiple languages and accents',
      color: 'from-neon-purple to-neon-pink'
    },
    {
      icon: Wand2,
      title: 'Perfect Lip Sync',
      description: 'Our AI ensures perfect lip synchronization with the generated audio',
      color: 'from-neon-pink to-neon-orange'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Generate professional-quality videos in minutes, not hours',
      color: 'from-neon-cyan to-neon-blue'
    }
  ]

  const steps = [
    {
      number: '01',
      title: 'Upload Your Image',
      description: 'Choose a high-quality photo where the face is clearly visible',
      icon: ImageIcon,
      color: 'neon-blue'
    },
    {
      number: '02',
      title: 'Write Your Script',
      description: 'Type or paste the text you want your AI avatar to speak',
      icon: Type,
      color: 'neon-purple'
    },
    {
      number: '03',
      title: 'AI Magic',
      description: 'Our AI processes your image and text to create a realistic video',
      icon: Sparkles,
      color: 'neon-pink'
    },
    {
      number: '04',
      title: 'Download & Share',
      description: 'Get your video and share it anywhere you want',
      icon: Video,
      color: 'neon-cyan'
    }
  ]

  const useCases = [
    {
      icon: Users,
      title: 'Marketing & Ads',
      description: 'Create personalized video advertisements at scale'
    },
    {
      icon: MessageSquare,
      title: 'Content Creation',
      description: 'Generate engaging video content for social media'
    },
    {
      icon: FileText,
      title: 'Education',
      description: 'Transform written lessons into interactive video tutorials'
    },
    {
      icon: TrendingUp,
      title: 'Business Presentations',
      description: 'Make your presentations more engaging with AI presenters'
    }
  ]

  const stats = [
    { value: '10x', label: 'Faster Production', icon: Clock },
    { value: '90%', label: 'Cost Reduction', icon: TrendingUp },
    { value: '50+', label: 'Languages', icon: MessageSquare },
    { value: '4K', label: 'Quality Output', icon: Video }
  ]

  return (
    <div className="min-h-screen bg-dark-mesh">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-48 -left-48 bg-neon-purple/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-neon-blue/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute w-96 h-96 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neon-pink/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 relative z-10">
          <div className="text-center">
            {/* Coming Soon Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30 rounded-full mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-neon-purple animate-pulse" />
              <span className="text-sm font-semibold text-gradient">Coming Soon</span>
              <Star className="w-4 h-4 text-neon-pink animate-pulse" />
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-100 mb-6 animate-fade-in">
              Create AI-Powered
              <br />
              <span className="text-gradient-fire animate-gradient bg-size-200">
                Video Avatars
              </span>
            </h1>

            <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Transform any image into a lifelike AI avatar that speaks your message. 
              <br className="hidden sm:block" />
              Powered by cutting-edge AI technology.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={index} className="card-glass p-4 rounded-xl border border-slate-600/30 hover:border-neon-blue/50 transition-all duration-300 hover:scale-105">
                    <Icon className="w-6 h-6 text-neon-blue mx-auto mb-2" />
                    <div className="text-2xl sm:text-3xl font-bold text-gradient mb-1">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-slate-400">{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Powerful <span className="text-gradient">AI Features</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
              Revolutionary technology that brings your content to life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="card-glass p-6 sm:p-8 rounded-2xl border border-slate-600/30 hover:border-neon-blue/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-3 group-hover:text-gradient transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24 bg-slate-900/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
              Create stunning AI videos in just 4 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = activeStep === index
              return (
                <div
                  key={index}
                  className={`relative group cursor-pointer`}
                  onMouseEnter={() => setActiveStep(index)}
                >
                  {/* Connection Line (hidden on mobile) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-24 left-1/2 w-full h-0.5 bg-gradient-to-r from-slate-600 to-transparent"></div>
                  )}

                  <div className={`card-glass p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isActive 
                      ? `border-${step.color} shadow-glow-${step.color} scale-105` 
                      : 'border-slate-600/30 hover:border-slate-500'
                  }`}>
                    {/* Step Number */}
                    <div className={`text-6xl font-bold mb-4 bg-gradient-to-br from-${step.color} to-neon-pink bg-clip-text text-transparent`}>
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${step.color} to-neon-pink p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-slate-100 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Perfect For <span className="text-gradient">Every Industry</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
              Endless possibilities across various use cases
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon
              return (
                <div
                  key={index}
                  className="card-glass p-6 rounded-xl border border-slate-600/30 hover:border-neon-purple/50 transition-all duration-300 hover:scale-105 group text-center"
                >
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink p-0.5 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {useCase.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-elevated p-8 sm:p-12 rounded-3xl relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-neon-pink/20 to-neon-orange/20 animate-gradient bg-size-200"></div>
            
            <div className="relative z-10">
              <Sparkles className="w-16 h-16 text-neon-purple mx-auto mb-6 animate-pulse" />
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-6">
                Be The First To <span className="text-gradient-fire">Experience</span>
              </h2>

              <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Join our exclusive waitlist and get early access to the most advanced 
                AI video generation technology.
              </p>

              <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={isSubmitting || isSubmitted}
                  className={`input w-full sm:w-96 px-6 py-4 text-lg transition-all duration-300 ${
                    isSubmitted ? 'bg-green-900/20 border-neon-green' : ''
                  }`}
                />
                <button 
                  type="submit"
                  disabled={isSubmitting || isSubmitted}
                  className={`px-8 py-4 text-lg flex items-center gap-2 w-full sm:w-auto rounded-xl font-semibold transition-all duration-300 ${
                    isSubmitted 
                      ? 'bg-gradient-to-r from-neon-green to-neon-cyan text-white shadow-glow-green' 
                      : 'btn-primary'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : isSubmitted ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Joined!</span>
                    </>
                  ) : (
                    <>
                      <span>Notify Me</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-sm text-slate-400 mt-6">
                {isSubmitted ? (
                  <span className="text-neon-green font-semibold animate-pulse">
                    ✨ Success! Check your email for confirmation.
                  </span>
                ) : (
                  "No spam, ever. We'll only notify you when we launch."
                )}
              </p>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-neon-green" />
                  <span className="text-sm">Early Access</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-neon-green" />
                  <span className="text-sm">Special Pricing</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-neon-green" />
                  <span className="text-sm">Premium Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Already a member? */}
          <div className="mt-8 text-slate-400">
            Already a member?{' '}
            <Link to="/dashboard" className="text-neon-blue hover:text-neon-cyan font-semibold">
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AIVideoPage

