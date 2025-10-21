/**
 * Home Page Component
 * Landing page with hero section, features, and call-to-action
 * Showcases the Phygital platform capabilities
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  QrCode, 
  Upload, 
  BarChart3, 
  Smartphone, 
  Video, 
  Share2,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react'

const HomePage = () => {
  const { isAuthenticated } = useAuth()

  const features = [
    {
      icon: Upload,
      title: 'Easy Upload',
      description: 'Upload your design images and videos with our intuitive interface. Support for all major formats.',
      color: 'neon-blue'
    },
    {
      icon: QrCode,
      title: 'QR Generation',
      description: 'Automatically generate unique QR codes that link to your personalized digital experience.',
      color: 'neon-purple'
    },
    {
      icon: Video,
      title: 'Video Integration',
      description: 'Embed videos that play when users scan your QR codes, creating engaging interactions.',
      color: 'neon-pink'
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Track scans, views, and engagement with detailed analytics and insights.',
      color: 'neon-green'
    },
    {
      icon: Smartphone,
      title: 'Mobile Optimized',
      description: 'Responsive design that works perfectly on all devices and screen sizes.',
      color: 'neon-cyan'
    },
    {
      icon: Share2,
      title: 'Social Integration',
      description: 'Connect your social media profiles and drive traffic to your digital presence.',
      color: 'neon-orange'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Marketing Manager',
      company: 'TechCorp',
      content: 'Phygital has revolutionized our marketing campaigns. The QR codes make our print materials interactive and engaging.',
      rating: 5
    },
    {
      name: 'Mike Chen',
      role: 'Event Coordinator',
      company: 'EventPro',
      content: 'The analytics feature helps us understand how people interact with our event materials. Highly recommended!',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Small Business Owner',
      company: 'Local Cafe',
      content: 'Easy to use and affordable. Our customers love scanning the QR codes to see our menu videos.',
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-hero-gradient overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/30 via-neon-purple/30 to-neon-pink/30 animate-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-transparent to-neon-orange/20"></div>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-100 mb-4 sm:mb-6 leading-tight">
              Bridge Physical to{' '}
              <span className="text-gradient-fire animate-pulse-glow">
                Digital
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              Transform your physical designs into interactive digital experiences. 
              Create QR codes that connect your posters, business cards, and marketing materials to engaging video content.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-primary w-full sm:w-auto"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary w-full sm:w-auto"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 sm:top-20 left-4 sm:left-10 animate-float animate-shine">
          <QrCode className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-neon-blue opacity-60 drop-shadow-glow-blue" />
        </div>
        <div className="absolute top-20 sm:top-40 right-4 sm:right-20 animate-float animate-shine" style={{ animationDelay: '1s' }}>
          <Video className="h-6 w-6 sm:h-8 sm:w-8 lg:h-12 lg:w-12 text-neon-purple opacity-60 drop-shadow-glow-purple" />
        </div>
        <div className="absolute bottom-20 sm:bottom-20 left-4 sm:left-20 animate-float animate-shine hidden sm:block" style={{ animationDelay: '2s' }}>
          <Smartphone className="h-7 w-7 sm:h-10 sm:w-10 lg:h-14 lg:w-14 text-neon-pink opacity-60 drop-shadow-glow-pink" />
        </div>
        {/* Mobile-specific smartphone icon positioning */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-float animate-shine sm:hidden" style={{ animationDelay: '2s' }}>
          <Smartphone className="h-6 w-6 text-neon-pink opacity-40 drop-shadow-glow-pink" />
        </div>
        <div className="absolute top-1/2 left-1/4 animate-float animate-shine" style={{ animationDelay: '3s' }}>
          <BarChart3 className="h-5 w-5 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-neon-green opacity-50 drop-shadow-glow-green" />
        </div>
        <div className="absolute top-1/3 right-1/3 animate-float animate-shine" style={{ animationDelay: '4s' }}>
          <Share2 className="h-4 w-4 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-neon-orange opacity-50 drop-shadow-glow-orange" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-slate-800/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 mb-4">
              Everything you need to go digital
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto px-4">
              Our platform provides all the tools you need to create engaging physical-to-digital experiences.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className={`card text-center group hover:scale-105 transition-all duration-300 border border-slate-600/30 hover:border-${feature.color}/50 hover:shadow-glow-${feature.color.split('-')[1]}`}>
                  <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-${feature.color}/30 rounded-lg mb-3 sm:mb-4 group-hover:bg-${feature.color}/50 transition-colors duration-300 shadow-glow-${feature.color.split('-')[1]}`}>
                    <Icon className={`h-6 w-6 sm:h-8 sm:w-8 text-${feature.color}`} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-slate-900/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 mb-4">
              How it works
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 px-4">
              Complete your project in 5 simple levels
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-button-gradient text-white rounded-full text-lg sm:text-xl font-bold mb-3 shadow-glow group-hover:shadow-glow-blue transition-all duration-300">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2">
                Design
              </h3>
              <p className="text-sm sm:text-base text-slate-300">
                Upload your design image (JPG/JPEG format, max 20MB)
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-accent-gradient text-white rounded-full text-lg sm:text-xl font-bold mb-3 shadow-glow-accent group-hover:shadow-glow-purple transition-all duration-300">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2">
                QR Position
              </h3>
              <p className="text-sm sm:text-base text-slate-300">
                Position your QR code on the design where you want it
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-warning-gradient text-white rounded-full text-lg sm:text-xl font-bold mb-3 shadow-glow-yellow group-hover:shadow-glow-yellow transition-all duration-300">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2">
                Video
              </h3>
              <p className="text-sm sm:text-base text-slate-300">
                Add your explanatory video (MP4 format, max 50MB)
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-success-gradient text-white rounded-full text-lg sm:text-xl font-bold mb-3 shadow-glow-green group-hover:shadow-glow-green transition-all duration-300">
                4
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2">
                Social Links
              </h3>
              <p className="text-sm sm:text-base text-slate-300">
                Connect your social media profiles and website
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-error-gradient text-white rounded-full text-lg sm:text-xl font-bold mb-3 shadow-glow-red group-hover:shadow-glow-red transition-all duration-300">
                5
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2">
                Final Design
              </h3>
              <p className="text-sm sm:text-base text-slate-300">
                Download your complete design with QR code
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-800/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
              What our users say
            </h2>
            <p className="text-xl text-slate-300">
              Join thousands of satisfied customers who are transforming their marketing
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card border border-slate-600/30 hover:border-neon-blue/30 hover:shadow-glow-blue transition-all duration-300">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-neon-yellow fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-slate-100">{testimonial.name}</p>
                  <p className="text-sm text-slate-400">{testimonial.role} at {testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-neon-blue/40 via-neon-purple/40 to-neon-pink/40 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-transparent to-neon-orange/20"></div>
        <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
            Ready to transform your marketing?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using Phygital to create engaging physical-to-digital experiences.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="btn-primary"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          )}
        </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
