/**
 * Phygital Zone - Homepage
 * Where the Physical World Meets Digital Storytelling
 * High-quality emotional design focused on the Phygital Movement
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Sparkles,
  Heart,
  Eye,
  Zap,
  Upload,
  Film,
  Share2,
  BarChart3,
  Users,
  Palette,
  GraduationCap,
  Calendar,
  ArrowRight,
  Quote,
  Check,
  Globe,
  Lightbulb,
  X
} from 'lucide-react'

const HomePage = () => {
  const { isAuthenticated } = useAuth()
  const [selectedAudience, setSelectedAudience] = useState(null)
  const [selectedTestimonial, setSelectedTestimonial] = useState(null)

  // What You Can Do - 4 highlight cards
  const capabilities = [
    {
      icon: Sparkles,
      title: 'Bring Life to Your Designs',
      description: 'Transform static images into living, breathing experiences that captivate and engage.',
      gradient: 'from-neon-blue to-neon-cyan'
    },
    {
      icon: Heart,
      title: 'Tell Stories That Move',
      description: 'Connect with your audience on an emotional level through powerful visual narratives.',
      gradient: 'from-neon-purple to-neon-pink'
    },
    {
      icon: Eye,
      title: 'See the Impact',
      description: 'Track how your stories resonate and watch your connections grow in real-time.',
      gradient: 'from-neon-pink to-neon-orange'
    },
    {
      icon: Zap,
      title: 'Keep It Fresh',
      description: 'Update your digital content anytime while your physical designs stay timeless.',
      gradient: 'from-neon-green to-neon-cyan'
    }
  ]

  // How It Works - Simple 4-step flow
  const steps = [
    {
      number: '01',
      title: 'Upload your design',
      description: 'Share the physical creation you want to bring to life',
      icon: Upload,
      color: 'neon-blue'
    },
    {
      number: '02',
      title: 'Add your digital story',
      description: 'Upload videos, links, and content that tell your story',
      icon: Film,
      color: 'neon-purple'
    },
    {
      number: '03',
      title: 'Publish and share',
      description: 'Get your enhanced design ready to connect with the world',
      icon: Share2,
      color: 'neon-pink'
    },
    {
      number: '04',
      title: 'Track engagement',
      description: 'See how people interact and experience your creation',
      icon: BarChart3,
      color: 'neon-green'
    }
  ]

  // Who It's For - 4 audience blocks
  const audiences = [
    {
      icon: Users,
      title: 'Brands & Businesses',
      value: 'Make your marketing come alive.',
      description: 'Transform campaigns into interactive experiences that customers remember.',
      gradient: 'from-neon-blue/20 to-neon-cyan/20',
      iconColor: 'neon-blue'
    },
    {
      icon: Palette,
      title: 'Creators & Designers',
      value: 'Add emotion and interactivity to your art.',
      description: 'Let your work speak, move, and connect beyond the canvas.',
      gradient: 'from-neon-purple/20 to-neon-pink/20',
      iconColor: 'neon-purple'
    },
    {
      icon: GraduationCap,
      title: 'Students & Educators',
      value: 'Turn projects into living portfolios.',
      description: 'Showcase your work with depth, context, and storytelling.',
      gradient: 'from-neon-pink/20 to-neon-orange/20',
      iconColor: 'neon-pink'
    },
    {
      icon: Calendar,
      title: 'Event Organizers',
      value: 'Keep the event energy alive beyond the day.',
      description: 'Extend the experience long after the moment has passed.',
      gradient: 'from-neon-green/20 to-neon-cyan/20',
      iconColor: 'neon-green'
    }
  ]

  // Testimonials - 3 emotional user stories
  const testimonials = [
    {
      quote: "I was skeptical at first, honestly. But when we added QR codes to our product packaging and people could actually watch behind-the-scenes videos? Game changer. Our customers keep coming back because they feel connected to our brand in a way that wasn't possible before.",
      author: "Sarah Mitchell",
      role: "Marketing Director, GreenLeaf Organics",
      impact: "3x return on campaign investment"
    },
    {
      quote: "As an artist, I've always struggled with showing the full story behind my work. With Phygital, I can attach videos of my creative process to my physical pieces. People at my last gallery opening spent way more time engaging with each piece. It's like my art finally has a voice.",
      author: "Marcus Chen",
      role: "Visual Artist",
      impact: "40% longer gallery visit times"
    },
    {
      quote: "My students used to just turn in static portfolios. Now they create these amazing interactive experiences where you scan a QR code and see their entire project journey - sketches, iterations, final work. It's transformed how they present themselves. Several have landed internships because of it.",
      author: "Dr. Emily Rodriguez",
      role: "Design Professor, State University",
      impact: "85% of students got internship offers"
    }
  ]

  return (
    <div className="min-h-screen">
      {/* 1. Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-neon-purple/10 to-neon-pink/10 animate-gradient"></div>
          <div className="absolute top-20 -left-20 md:left-20 w-64 h-64 md:w-96 md:h-96 bg-neon-blue/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 -right-20 md:right-20 w-64 h-64 md:w-96 md:h-96 bg-neon-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 bg-neon-pink/10 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-8 inline-block">
            <span className="px-4 py-2 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-full text-neon-blue text-sm font-medium backdrop-blur-sm">
              Welcome to the Phygital Movement
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-100 mb-12 leading-tight">
            Where <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">Physical World</span><br />
            Meets <span className="text-gradient bg-gradient-to-r from-neon-pink via-neon-orange to-neon-yellow bg-clip-text text-transparent">Digital Storytelling</span>
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="group px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-semibold text-lg shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="group px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-semibold text-lg shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 flex items-center gap-2">
                  Start Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/about" className="px-8 py-4 bg-slate-800/50 backdrop-blur-sm text-slate-100 rounded-xl font-semibold text-lg border border-slate-600/50 hover:border-neon-blue/50 transition-all duration-300">
                  Explore the Movement
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden md:block absolute bottom-10 left-10 animate-float opacity-20">
          <Globe className="w-32 h-32 text-neon-blue" />
        </div>
        <div className="hidden md:block absolute top-10 right-10 animate-float opacity-20" style={{ animationDelay: '1s' }}>
          <Lightbulb className="w-24 h-24 text-neon-purple" />
        </div>
      </section>

      {/* 2. Why Phygital Exists - Storytelling */}
      <section className="py-20 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 rounded-2xl">
              <Heart className="w-12 h-12 text-neon-purple" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-6">
            Living Between Two Worlds
          </h2>
          <p className="text-xl text-slate-300 leading-relaxed mb-6">
            We live in two worlds — one <span className="text-neon-blue font-semibold">physical</span>, one <span className="text-neon-purple font-semibold">digital</span>. 
          </p>
          <p className="text-xl text-slate-300 leading-relaxed">
            <span className="text-gradient bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent font-semibold">Phygital Zone</span> brings them together so every design, card, or product can <span className="text-slate-300 font-semibold">tell a story</span> that moves, speaks, and connects.
          </p>
        </div>
      </section>

      {/* 3. What You Can Do - 4 Highlight Cards */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              What You Can Do
            </h2>
            <p className="text-xl text-slate-300">
              Transform the way people experience your creations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon
              return (
                <div
                  key={index}
                  className="relative p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${capability.gradient} opacity-5 rounded-2xl`}></div>
                  
                  <div className="relative z-10">
                    <div className="mb-6 inline-flex p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl">
                      <Icon className="w-8 h-8 text-neon-blue" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-3">
                      {capability.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                      {capability.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4. How It Works - Simple Step Flow */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-300">
              Upload your design → Add your story → Publish to the world → Watch your audience connect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative">
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-neon-blue/50 to-transparent"></div>
                  )}
                  
                  <div className="relative text-center group">
                    <div className="mb-6 mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-neon-blue/30 rounded-2xl group-hover:border-neon-blue group-hover:shadow-glow-blue transition-all duration-300">
                      <Icon className="w-10 h-10 text-neon-blue" />
                    </div>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-neon-blue to-neon-purple text-white text-sm font-bold rounded-full">
                      {step.number}
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 5. Who It's For - 4 Audience Blocks */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Who It's For
            </h2>
            <p className="text-xl text-slate-300">
              Built for everyone who creates and connects
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {audiences.map((audience, index) => {
              const Icon = audience.icon
              const isSelected = selectedAudience === index
              return (
                <div
                  key={index}
                  onClick={() => setSelectedAudience(isSelected ? null : index)}
                  className={`relative flex-1 min-w-0 p-6 bg-gradient-to-br ${audience.gradient} backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden cursor-pointer transition-all duration-300 ${
                    isSelected ? 'ring-2 ring-neon-blue shadow-glow-blue' : 'hover:border-neon-blue/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-neon-purple/5 opacity-50"></div>
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`mb-4 p-4 bg-slate-800/50 rounded-xl border border-${audience.iconColor}/30`}>
                      <Icon className={`w-8 h-8 text-${audience.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2">
                      {audience.title}
                    </h3>
                    <p className={`text-base text-${audience.iconColor} font-semibold mb-3`}>
                      {audience.value}
                    </p>
                    <p className="text-sm text-slate-400">
                      {audience.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel for Detailed Description */}
        {selectedAudience !== null && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
              onClick={() => setSelectedAudience(null)}
            />
            
            {/* Side Panel */}
            <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 shadow-dark-large z-50 animate-slide-in-right">
              <div className="h-full overflow-y-auto p-6 md:p-8">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedAudience(null)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Content */}
                {selectedAudience !== null && (() => {
                  const audience = audiences[selectedAudience]
                  const Icon = audience.icon
                  return (
                    <div className="animate-fade-in-up">
                      <div className={`mb-6 inline-flex p-4 bg-gradient-to-br ${audience.gradient} rounded-xl border border-${audience.iconColor}/30`}>
                        <Icon className={`w-10 h-10 text-${audience.iconColor}`} />
                      </div>
                      
                      <h2 className="text-3xl font-bold text-slate-100 mb-4">
                        {audience.title}
                      </h2>
                      
                      <p className={`text-xl text-${audience.iconColor} font-semibold mb-6`}>
                        {audience.value}
                      </p>
                      
                      <div className="space-y-4">
                        <p className="text-slate-300 leading-relaxed text-lg">
                          {audience.description}
                        </p>
                        
                        {/* Additional detailed content */}
                        <div className="pt-6 border-t border-slate-700/50">
                          <h3 className="text-lg font-semibold text-slate-200 mb-3">
                            Why This Matters
                          </h3>
                          <p className="text-slate-400 leading-relaxed">
                            {audience.title === 'Brands & Businesses' && 
                              'Elevate your marketing campaigns with interactive experiences that create lasting impressions and drive meaningful engagement with your audience.'}
                            {audience.title === 'Creators & Designers' && 
                              'Transform your artistic vision into immersive experiences that go beyond traditional boundaries, allowing your work to connect with audiences on a deeper level.'}
                            {audience.title === 'Students & Educators' && 
                              'Enhance learning experiences by bringing projects and portfolios to life with rich, interactive content that showcases knowledge and creativity in compelling ways.'}
                            {audience.title === 'Event Organizers' && 
                              'Extend the impact of your events beyond the moment, creating lasting connections and memories that continue to engage participants long after the event ends.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </>
        )}
      </section>

      {/* 6. The Phygital Movement - Emotional Section */}
      <section id="movement" className="relative py-32 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-neon-purple/10 to-neon-pink/10 animate-gradient"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-neon-blue animate-pulse" />
              <span className="text-neon-blue font-semibold">The Phygital Movement</span>
            </div>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-100 mb-8 leading-tight">
            More Than Technology <br />
            <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              A Cultural Shift
            </span>
          </h2>

          <p className="text-xl sm:text-2xl text-slate-300 mb-6 leading-relaxed">
            Phygital is not a tool — it's a <span className="text-neon-blue font-semibold">movement</span> redefining connection, creativity, and experience.
          </p>

          <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Where physical and digital storytelling merge into something greater than either alone. Where every touchpoint becomes a gateway to deeper engagement. Where static becomes dynamic, and presence becomes experience.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient bg-gradient-to-r from-neon-blue to-neon-cyan bg-clip-text text-transparent mb-2">
                Connection
              </div>
              <div className="text-slate-400 text-sm">Bridge worlds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent mb-2">
                Creativity
              </div>
              <div className="text-slate-400 text-sm">Unlock possibilities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient bg-gradient-to-r from-neon-cyan to-neon-orange bg-clip-text text-transparent mb-2">
                Experience
              </div>
              <div className="text-slate-400 text-sm">Create impact</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Testimonials - Emotional User Stories */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Real Stories, Real Impact
            </h2>
            <p className="text-xl text-slate-300">
              Real people sharing their experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => {
              const isSelected = selectedTestimonial === index
              return (
                <div
                  key={index}
                  onClick={() => setSelectedTestimonial(isSelected ? null : index)}
                  className={`group relative p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 transition-all duration-500 cursor-pointer ${
                    isSelected 
                      ? 'ring-2 ring-neon-blue shadow-glow-blue border-neon-blue/50' 
                      : 'hover:border-neon-blue/50 hover:scale-105'
                  }`}
                >
                  <div className="absolute top-6 left-6 opacity-20 group-hover:opacity-30 transition-opacity duration-300">
                    <Quote className="w-16 h-16 text-neon-blue" />
                  </div>

                  <div className="relative z-10">
                    <p className="text-base text-slate-300 mb-8 leading-relaxed">
                      "{testimonial.quote}"
                    </p>

                    <div className="border-t border-slate-700/50 pt-6">
                      <p className="font-bold text-slate-100 text-lg mb-1">
                        {testimonial.author}
                      </p>
                      <p className="text-slate-400 text-sm mb-3">
                        {testimonial.role}
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-neon-green/20 to-neon-cyan/20 border border-neon-green/30 rounded-full">
                        <Check className="w-4 h-4 text-neon-green" />
                        <span className="text-neon-green text-sm font-semibold">
                          {testimonial.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel for Detailed Testimonial */}
        {selectedTestimonial !== null && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
              onClick={() => setSelectedTestimonial(null)}
            />
            
            {/* Side Panel */}
            <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 shadow-dark-large z-50 animate-slide-in-right">
              <div className="h-full overflow-y-auto p-6 md:p-8">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedTestimonial(null)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Content */}
                {selectedTestimonial !== null && (() => {
                  const testimonial = testimonials[selectedTestimonial]
                  return (
                    <div className="animate-fade-in-up">
                      <div className="mb-6 inline-flex p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-neon-blue/30">
                        <Quote className="w-10 h-10 text-neon-blue" />
                      </div>
                      
                      <div className="mb-6">
                        <p className="text-2xl font-bold text-slate-100 mb-2">
                          {testimonial.author}
                        </p>
                        <p className="text-slate-400 text-base">
                          {testimonial.role}
                        </p>
                      </div>
                      
                      <div className="mb-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                        <p className="text-slate-300 leading-relaxed text-lg italic">
                          "{testimonial.quote}"
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-neon-green/10 to-neon-cyan/10 rounded-xl border border-neon-green/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5 text-neon-green" />
                            <h3 className="text-lg font-semibold text-slate-200">
                              Impact
                            </h3>
                          </div>
                          <p className="text-neon-green font-semibold">
                            {testimonial.impact}
                          </p>
                        </div>
                        
                        {/* Additional detailed content */}
                        <div className="pt-6 border-t border-slate-700/50">
                          <h3 className="text-lg font-semibold text-slate-200 mb-3">
                            Their Story
                          </h3>
                          <p className="text-slate-400 leading-relaxed">
                            {testimonial.author === 'Sarah Mitchell' && 
                              'Sarah and her team at GreenLeaf Organics were looking for ways to make their organic products stand out in a crowded market. They started using Phygital to add QR codes that link to farm-to-table stories, recipe videos, and sustainability information. Customers loved being able to learn about where their food comes from, and the engagement metrics speak for themselves.'}
                            {testimonial.author === 'Marcus Chen' && 
                              'Marcus has been creating art for over a decade, but always felt something was missing when people viewed his work in galleries. The static pieces couldn\'t convey the hours of experimentation, the emotional journey, or the techniques behind each creation. With Phygital, he now attaches process videos, audio commentary, and even interactive elements that let viewers experience his art in entirely new ways.'}
                            {testimonial.author === 'Dr. Emily Rodriguez' && 
                              'Dr. Rodriguez noticed that her design students were struggling to showcase their creative process in traditional portfolios. Static images and written descriptions weren\'t enough. After introducing Phygital to her curriculum, students began creating comprehensive project presentations that included time-lapse videos of their work, voice-over explanations, and interactive prototypes. The results have been remarkable - students are more confident, and employers are impressed by the depth of their presentations.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </>
        )}
      </section>

      {/* 8. Final CTA - Join the Movement */}
      <section className="relative py-20 sm:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-neon-pink/20 animate-gradient"></div>
        <div className="absolute top-10 -left-20 md:left-10 w-64 h-64 md:w-96 md:h-96 bg-neon-blue/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 -right-20 md:right-10 w-64 h-64 md:w-96 md:h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-100 mb-6">
            Join the <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">Phygital Movement</span>
          </h2>
          
          <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
            Be part of the future where every design tells a story
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="group px-10 py-5 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-bold text-xl shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 flex items-center gap-3">
                Start Creating Now
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="group px-10 py-5 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-bold text-xl shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 flex items-center gap-3">
                  Start Free
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/contact" className="px-10 py-5 bg-slate-800/50 backdrop-blur-sm text-slate-100 rounded-xl font-bold text-xl border-2 border-slate-600/50 hover:border-neon-blue/50 transition-all duration-300">
                  Contact Us
                </Link>
              </>
            )}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-neon-green" />
              <span className="text-sm sm:text-base">Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-neon-green" />
              <span className="text-sm sm:text-base">No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-neon-green" />
              <span className="text-sm sm:text-base">Unlimited creativity</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
