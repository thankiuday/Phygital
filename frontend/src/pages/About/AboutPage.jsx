/**
 * Phygital Zone - About Page
 * Where Innovation Meets Emotion
 * Our story, mission, and the movement we're building
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Target, 
  Lightbulb, 
  Heart,
  ArrowRight,
  Sparkles,
  Globe,
  Zap,
  Eye,
  Quote,
  Rocket,
  TrendingUp
} from 'lucide-react'

const AboutPage = () => {
  const coreValues = [
    {
      icon: Heart,
      title: 'Emotion-First Design',
      description: 'We believe technology should move people, not just serve them. Every feature is crafted to create meaningful connections.',
      gradient: 'from-neon-pink to-neon-orange'
    },
    {
      icon: Globe,
      title: 'Accessibility for All',
      description: 'Advanced technology should be simple. We make powerful AR experiences accessible to everyone, everywhere.',
      gradient: 'from-neon-blue to-neon-cyan'
    },
    {
      icon: Sparkles,
      title: 'Innovation with Purpose',
      description: 'We don\'t innovate for the sake of it. Every advancement serves one goal: helping you tell better stories.',
      gradient: 'from-neon-purple to-neon-pink'
    },
    {
      icon: Users,
      title: 'Community-Driven',
      description: 'The Phygital Movement is built by creators, for creators. Your feedback shapes our future.',
      gradient: 'from-neon-green to-neon-cyan'
    }
  ]

  const milestones = [
    {
      icon: Lightbulb,
      year: 'The Beginning',
      title: 'A Vision Takes Shape',
      description: 'Started with a simple question: What if every physical design could tell a digital story?',
      color: 'neon-blue'
    },
    {
      icon: Rocket,
      year: 'The Launch',
      title: 'Phygital Zone Goes Live',
      description: 'Turned vision into reality. Launched the platform that bridges physical and digital worlds.',
      color: 'neon-purple'
    },
    {
      icon: TrendingUp,
      year: 'The Movement',
      title: 'Growing Together',
      description: 'From a tool to a movement. Thousands of creators now bringing their designs to life.',
      color: 'neon-pink'
    }
  ]


  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-neon-purple/10 to-neon-pink/10 animate-gradient"></div>
          <div className="absolute top-20 -left-20 md:left-20 w-64 h-64 md:w-96 md:h-96 bg-neon-blue/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 -right-20 md:right-20 w-64 h-64 md:w-96 md:h-96 bg-neon-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-6 inline-block">
            <span className="px-4 py-2 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-full text-neon-blue text-sm font-medium backdrop-blur-sm">
              About Phygital Zone
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-100 mb-6 leading-tight">
            We're Building More Than <br className="hidden sm:block" />
            <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">A Platform</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            We're building a <span className="text-neon-pink font-semibold">movement</span> where physical and digital worlds merge into experiences that <span className="text-neon-blue font-semibold">move people</span>.
          </p>

          <div className="inline-block px-6 py-3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/50">
            <p className="text-neon-blue font-semibold">
              A Product by Phygital
            </p>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden md:block absolute bottom-10 left-10 animate-float opacity-20">
          <Heart className="w-24 h-24 text-neon-pink" />
        </div>
        <div className="hidden md:block absolute top-10 right-10 animate-float opacity-20" style={{ animationDelay: '1s' }}>
          <Sparkles className="w-20 h-20 text-neon-blue" />
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block p-4 bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 rounded-2xl mb-6">
              <Quote className="w-12 h-12 text-neon-purple" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-6">
              Our Story
            </h2>
          </div>

          <div className="space-y-6 text-base sm:text-lg text-slate-300 leading-relaxed">
            <p>
              Phygital Zone began with a <span className="text-neon-blue font-semibold">simple observation</span>: the world is filled with beautiful designs — posters, business cards, product packaging, art — but they often lack the ability to tell their complete story.
            </p>
            <p>
              We live between <span className="text-neon-purple font-semibold">two worlds</span> — one physical, one digital. Most tools force you to choose. We decided to <span className="text-neon-pink font-semibold">bridge them</span>.
            </p>
            <p>
              What started as a technical solution evolved into something deeper: a platform that helps creators, brands, educators, and dreamers <span className="text-neon-green font-semibold">connect emotionally</span> with their audience.
            </p>
            <p className="text-lg sm:text-xl font-semibold text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              Today, Phygital Zone is more than a tool — it's a movement redefining how we experience the world around us.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="group relative p-10 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-blue/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-neon-cyan/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="mb-6 inline-flex p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl">
                  <Target className="w-10 h-10 text-neon-blue" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">Our Mission</h3>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                  To <span className="text-neon-blue font-semibold">democratize interactive experiences</span> and empower everyone to transform their physical creations into stories that resonate, connect, and inspire.
                </p>
              </div>
            </div>

            <div className="group relative p-10 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-purple/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="mb-6 inline-flex p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl">
                  <Eye className="w-10 h-10 text-neon-purple" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">Our Vision</h3>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                  A world where <span className="text-neon-purple font-semibold">every physical touchpoint</span> becomes a gateway to rich, meaningful digital experiences — making information more engaging, connections deeper, and stories unforgettable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              What Drives Us
            </h2>
            <p className="text-xl text-slate-300">
              The principles that guide every decision we make
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreValues.map((value, index) => {
              const Icon = value.icon
              return (
                <div
                  key={index}
                  className="group relative p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-blue/50 transition-all duration-500 hover:scale-105 hover:shadow-glow-blue"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>
                  
                  <div className="relative z-10 flex items-start gap-6">
                    <div className="flex-shrink-0 p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl group-hover:shadow-glow transition-all duration-300">
                      <Icon className="w-8 h-8 text-neon-blue group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-slate-100 mb-3">
                        {value.title}
                      </h3>
                      <p className="text-slate-400 leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Journey/Milestones */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Our Journey
            </h2>
            <p className="text-xl text-slate-300">
              The path that led us here
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon
              return (
                <div key={index} className="relative text-center group">
                  {/* Connection Line */}
                  {index < milestones.length - 1 && (
                    <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-neon-blue/50 to-transparent"></div>
                  )}
                  
                  <div className="mb-6 mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-neon-blue/30 rounded-2xl group-hover:border-neon-blue group-hover:shadow-glow-blue transition-all duration-300">
                    <Icon className="w-12 h-12 text-neon-blue" />
                  </div>
                  
                  <div className="px-3 py-1 bg-gradient-to-r from-neon-blue to-neon-purple text-white text-sm font-bold rounded-full inline-block mb-4">
                    {milestone.year}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-100 mb-3">
                    {milestone.title}
                  </h3>
                  <p className="text-slate-400">
                    {milestone.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              Growing Together
            </h2>
            <p className="text-xl text-slate-300">
              The movement is gaining momentum
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center group">
              <div className="p-4 sm:p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-blue/50 transition-all duration-300 hover:scale-105">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-neon-blue to-neon-cyan bg-clip-text text-transparent mb-2 sm:mb-3">
                  10K+
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">Active Creators</p>
              </div>
            </div>
            <div className="text-center group">
              <div className="p-4 sm:p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-purple/50 transition-all duration-300 hover:scale-105">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent mb-2 sm:mb-3">
                  50K+
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">Experiences Created</p>
              </div>
            </div>
            <div className="text-center group">
              <div className="p-4 sm:p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-green/50 transition-all duration-300 hover:scale-105">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent mb-2 sm:mb-3">
                  1M+
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">Connections Made</p>
              </div>
            </div>
            <div className="text-center group">
              <div className="p-4 sm:p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-neon-pink/50 transition-all duration-300 hover:scale-105">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-neon-pink to-neon-orange bg-clip-text text-transparent mb-2 sm:mb-3">
                  95%
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium">Love What We Do</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 sm:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-neon-pink/20 animate-gradient"></div>
        <div className="absolute top-10 -left-20 md:left-10 w-64 h-64 md:w-96 md:h-96 bg-neon-blue/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 -right-20 md:right-10 w-64 h-64 md:w-96 md:h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-neon-blue animate-pulse" />
              <span className="text-neon-blue font-semibold">Join the Movement</span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-100 mb-6">
            Be Part of Something <br className="hidden sm:block" />
            <span className="text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              Bigger
            </span>
          </h2>
          
          <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
            Start creating experiences that bridge worlds and move people
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register" className="group px-10 py-5 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-bold text-xl shadow-glow-blue hover:shadow-glow-purple transition-all duration-300 flex items-center gap-3">
              Start Creating Free
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/contact" className="px-10 py-5 bg-slate-800/50 backdrop-blur-sm text-slate-100 rounded-xl font-bold text-xl border-2 border-slate-600/50 hover:border-neon-blue/50 transition-all duration-300">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
