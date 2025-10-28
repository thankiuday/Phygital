/**
 * About Us Page Component
 * Information about the company, mission, and team
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Target, 
  Lightbulb, 
  Heart,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

const AboutPage = () => {
  const values = [
    {
      icon: Target,
      title: 'Innovation',
      description: 'We constantly push the boundaries of what\'s possible with AR technology and QR code integration.'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Building a global community of creators who bridge the physical and digital worlds.'
    },
    {
      icon: Heart,
      title: 'Accessibility',
      description: 'Making advanced AR technology accessible to everyone, regardless of technical expertise.'
    },
    {
      icon: Lightbulb,
      title: 'Creativity',
      description: 'Empowering creators to bring their visions to life through cutting-edge technology.'
    }
  ]

  const team = [
    {
      name: 'Uday Thanki',
      role: 'Full Stack Developer',
      description: 'Innovative MERN stack developer passionate about building scalable web applications and delivering seamless user experiences through modern technologies.',
      image: '🧑‍💻'
    }
  ]

  return (
    <div className="min-h-screen bg-dark-mesh">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
              About <span className="text-gradient-fire">Phygital</span>
            </h1>
            <p className="text-base sm:text-lg text-neon-blue font-semibold mb-3">
              A Product by MetaDigi Labs LLC
            </p>
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl">
              We're revolutionizing how people connect physical and digital experiences through innovative AR technology and QR code solutions.
            </p>
          </div>
        </div>

        {/* Mission Section */}
        <section className="mb-12 sm:mb-16">
          <div className="card-elevated">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
                Our Mission
              </h2>
              <p className="text-lg text-slate-300 max-w-4xl mx-auto">
                To democratize AR technology and make it accessible to creators, businesses, and individuals worldwide. 
                We believe that the future lies in seamlessly blending physical and digital experiences.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-neon-blue/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-neon-blue" />
                </div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">Our Vision</h3>
                <p className="text-slate-300">
                  A world where every physical object can seamlessly connect to rich digital experiences, 
                  making information and interaction more engaging and accessible.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-neon-purple/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-neon-purple" />
                </div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">Our Values</h3>
                <p className="text-slate-300">
                  We prioritize innovation, accessibility, and user experience in everything we do. 
                  Our technology should empower, not complicate.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-12 sm:mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
              What We Stand For
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Our core values guide everything we do and every decision we make.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <div key={index} className="card text-center group hover:scale-105 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow-blue transition-all duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-12 sm:mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              The brilliant mind behind Phygital's innovative solutions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 max-w-lg mx-auto">
            {team.map((member, index) => (
              <div key={index} className="card-elevated text-center group hover:scale-105 transition-all duration-300 hover:border-neon-blue/50 border border-slate-600/50">
                <div className="text-7xl mb-6">{member.image}</div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">
                  {member.name}
                </h3>
                <p className="text-base text-neon-blue font-semibold mb-4">
                  {member.role}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-12 sm:mb-16">
          <div className="card-elevated">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
                Our Impact
              </h2>
              <p className="text-lg text-slate-300">
                Numbers that reflect our growing community and impact.
              </p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-neon-blue mb-2">10K+</div>
                <p className="text-sm text-slate-300">Active Users</p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-neon-purple mb-2">50K+</div>
                <p className="text-sm text-slate-300">QR Codes Generated</p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-neon-green mb-2">1M+</div>
                <p className="text-sm text-slate-300">Scans Tracked</p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-neon-pink mb-2">95%</div>
                <p className="text-sm text-slate-300">User Satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="card-elevated">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
              Ready to Join Our Journey?
            </h2>
            <p className="text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
              Start creating amazing phygital experiences today and be part of the future of digital interaction.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="btn-secondary inline-flex items-center justify-center gap-2"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AboutPage
