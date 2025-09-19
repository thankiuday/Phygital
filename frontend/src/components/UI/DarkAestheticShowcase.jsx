import React from 'react'
import { 
  Sun, 
  Moon, 
  Star, 
  Zap, 
  Heart, 
  Sparkles,
  Download,
  Upload,
  Settings,
  User,
  QrCode,
  BarChart3,
  Clock,
  Shield,
  Rocket,
  Palette,
  Layers,
  Globe,
  Smartphone
} from 'lucide-react'

const DarkAestheticShowcase = () => {
  return (
    <div className="min-h-screen bg-dark-mesh">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-neon-purple/10 to-neon-pink/10 animate-gradient"></div>
        <div className="relative container-modern section-padding text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="heading-1 text-gradient mb-6 animate-fade-in-up">
              🌙 Dark Aesthetic Design System
            </h1>
            <p className="text-body text-slate-300 mb-8 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              Experience our unified dark theme with neon accents, glassmorphism effects, and sophisticated cyberpunk aesthetics.
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
              <button className="btn-primary">
                <Rocket className="w-4 h-4 mr-2" />
                Get Started
              </button>
              <button className="btn-secondary">
                <Palette className="w-4 h-4 mr-2" />
                View Components
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Color Palette Section */}
      <div className="container-modern section-padding">
        <div className="text-center mb-12">
          <h2 className="heading-2 text-gradient-aurora mb-4">Color Palette</h2>
          <p className="text-body text-slate-300">Unified neon color system for consistent aesthetics</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
          {[
            { name: 'Neon Blue', color: 'bg-neon-blue', text: 'text-neon-blue' },
            { name: 'Neon Purple', color: 'bg-neon-purple', text: 'text-neon-purple' },
            { name: 'Neon Pink', color: 'bg-neon-pink', text: 'text-neon-pink' },
            { name: 'Neon Green', color: 'bg-neon-green', text: 'text-neon-green' },
            { name: 'Neon Cyan', color: 'bg-neon-cyan', text: 'text-neon-cyan' },
            { name: 'Neon Orange', color: 'bg-neon-orange', text: 'text-neon-orange' },
          ].map((color, index) => (
            <div key={index} className="card-neon text-center group hover:scale-105 transition-all duration-300">
              <div className={`w-16 h-16 ${color.color} rounded-xl mx-auto mb-4 shadow-glow`}></div>
              <h3 className={`text-sm font-semibold ${color.text}`}>{color.name}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Component Showcase */}
      <div className="container-modern section-padding">
        <div className="text-center mb-12">
          <h2 className="heading-2 text-gradient-ocean mb-4">Component System</h2>
          <p className="text-body text-slate-300">Modern dark components with neon accents</p>
        </div>

        {/* Buttons */}
        <div className="card-elevated mb-12">
          <h3 className="heading-3 text-slate-100 mb-8 text-center">Button Variants</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="btn-primary">
              <Zap className="w-4 h-4 mr-2" />
              Primary
            </button>
            <button className="btn-secondary">
              <Settings className="w-4 h-4 mr-2" />
              Secondary
            </button>
            <button className="btn-accent">
              <Heart className="w-4 h-4 mr-2" />
              Accent
            </button>
            <button className="btn-success">
              <Download className="w-4 h-4 mr-2" />
              Success
            </button>
            <button className="btn-warning">
              <Star className="w-4 h-4 mr-2" />
              Warning
            </button>
            <button className="btn-danger">
              <Shield className="w-4 h-4 mr-2" />
              Danger
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="card group hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-neon-blue-gradient rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform duration-300">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h3 className="heading-4 text-slate-100">Standard Card</h3>
            </div>
            <p className="text-body-sm text-slate-300">
              Clean card design with subtle glassmorphism effects.
            </p>
          </div>

          <div className="card-elevated group hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-accent-gradient rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="heading-4 text-slate-100">Elevated Card</h3>
            </div>
            <p className="text-body-sm text-slate-300">
              Enhanced card with stronger shadows and depth.
            </p>
          </div>

          <div className="card-neon group hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-neon-green-gradient rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform duration-300">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="heading-4 text-slate-100">Neon Card</h3>
            </div>
            <p className="text-body-sm text-slate-300">
              Special card with neon glow effects.
            </p>
          </div>
        </div>

        {/* Form Elements */}
        <div className="card-elevated mb-12">
          <h3 className="heading-3 text-slate-100 mb-8 text-center">Form Elements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="label">Email Address</label>
              <input 
                type="email" 
                className="input" 
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input 
                type="password" 
                className="input" 
                placeholder="Enter your password"
              />
            </div>
            <div>
              <label className="label">Error State</label>
              <input 
                type="text" 
                className="input input-error" 
                placeholder="This field has an error"
              />
            </div>
            <div>
              <label className="label">Success State</label>
              <input 
                type="text" 
                className="input input-success" 
                placeholder="This field is valid"
              />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="card-elevated mb-12">
          <h3 className="heading-3 text-slate-100 mb-8 text-center">Badge System</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <span className="badge-primary">Primary</span>
            <span className="badge-success">Success</span>
            <span className="badge-warning">Warning</span>
            <span className="badge-error">Error</span>
            <span className="badge-neon">Neon</span>
            <span className="badge-cyan">Cyan</span>
            <span className="badge-orange">Orange</span>
            <span className="badge-ghost">Ghost</span>
          </div>
        </div>

        {/* Glass Effects */}
        <div className="relative overflow-hidden rounded-3xl p-12 bg-gradient-to-br from-slate-800 to-slate-900 mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-neon-pink/20 animate-gradient"></div>
          <div className="relative z-10 text-center">
            <h2 className="heading-2 text-gradient-cyber mb-6">
              Glassmorphism Effects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-effect p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  Subtle Glass
                </h3>
                <p className="text-slate-300">
                  Light transparency with backdrop blur
                </p>
              </div>
              <div className="glass-effect-strong p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  Strong Glass
                </h3>
                <p className="text-slate-300">
                  More opacity with enhanced blur
                </p>
              </div>
              <div className="glass-effect-neon p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  Neon Glass
                </h3>
                <p className="text-slate-300">
                  Glass effect with neon glow
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Preview */}
        <div className="card-elevated mb-12">
          <h3 className="heading-3 text-slate-100 mb-8 text-center">Navigation Elements</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="navbar-link px-4 py-2 rounded-lg">
              <Home className="w-4 h-4 mr-2 inline" />
              Home
            </div>
            <div className="navbar-link navbar-link-active px-4 py-2 rounded-lg">
              <Upload className="w-4 h-4 mr-2 inline" />
              Upload
            </div>
            <div className="navbar-link px-4 py-2 rounded-lg">
              <QrCode className="w-4 h-4 mr-2 inline" />
              QR Code
            </div>
            <div className="navbar-link px-4 py-2 rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              Analytics
            </div>
            <div className="navbar-link px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4 mr-2 inline" />
              History
            </div>
          </div>
        </div>

        {/* Loading States */}
        <div className="card-elevated mb-12">
          <h3 className="heading-3 text-slate-100 mb-8 text-center">Loading States</h3>
          <div className="flex flex-wrap gap-8 justify-center items-center">
            <div className="text-center">
              <div className="loading-spinner mx-auto mb-2"></div>
              <p className="text-sm text-slate-300">Small Spinner</p>
            </div>
            <div className="text-center">
              <div className="loading-spinner-lg mx-auto mb-2"></div>
              <p className="text-sm text-slate-300">Large Spinner</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-neon-blue rounded-full animate-pulse mx-auto mb-2"></div>
              <p className="text-sm text-slate-300">Pulse</p>
            </div>
          </div>
        </div>

        {/* Text Gradients */}
        <div className="text-center mb-12">
          <h2 className="heading-2 text-gradient mb-4">Text Gradients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card text-center">
              <h3 className="text-gradient text-xl font-bold mb-2">Aurora Gradient</h3>
              <p className="text-slate-300">Beautiful neon color transitions</p>
            </div>
            <div className="card text-center">
              <h3 className="text-gradient-ocean text-xl font-bold mb-2">Ocean Gradient</h3>
              <p className="text-slate-300">Cool blue to purple flow</p>
            </div>
            <div className="card text-center">
              <h3 className="text-gradient-cyber text-xl font-bold mb-2">Cyber Gradient</h3>
              <p className="text-slate-300">Futuristic tech vibes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-neon-purple/10 to-neon-pink/10"></div>
        <div className="relative container-modern section-padding text-center">
          <h2 className="heading-2 text-gradient-fire mb-4">Ready to Experience Dark Mode?</h2>
          <p className="text-body text-slate-300 mb-8 max-w-2xl mx-auto">
            Our unified dark aesthetic provides a cohesive, modern experience across all stages and sections of your application.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="btn-primary">
              <Smartphone className="w-4 h-4 mr-2" />
              View Mobile
            </button>
            <button className="btn-accent">
              <Globe className="w-4 h-4 mr-2" />
              Explore Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DarkAestheticShowcase


