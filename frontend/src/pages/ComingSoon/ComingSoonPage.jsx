/**
 * Coming Soon Page Component
 * Default page for features that are under development
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Zap, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ComingSoonPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Smart back button handler
  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      // If no history, navigate to appropriate page based on auth status
      navigate(isAuthenticated ? '/dashboard' : '/');
    }
  };

  // Extract page name from pathname
  const getPageName = () => {
    const path = location.pathname.replace('/', '');
    
    // Handle specific routes with custom names
    const customNames = {
      'forgot-password': 'Password Recovery',
      'ai-video': 'AI Video',
      'pricing': 'Pricing',
      'blog': 'Blog',
      'careers': 'Careers',
      'terms': 'Terms of Service',
      'privacy': 'Privacy Policy',
      'docs': 'Documentation',
      'help': 'Help Center'
    };
    
    return customNames[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };
  
  // Get custom description based on route
  const getDescription = () => {
    const path = location.pathname.replace('/', '');
    
    const customDescriptions = {
      'forgot-password': 'Password reset functionality is coming soon. In the meantime, please contact support for assistance.',
      'ai-video': 'Revolutionary AI-powered video generation is on its way!',
      'pricing': 'Flexible pricing plans will be available soon.',
      'blog': 'Our blog with tips, tutorials, and updates is coming soon!',
      'careers': 'Exciting career opportunities will be posted here soon.',
      'terms': 'Our Terms of Service page is being prepared. Standard platform terms apply until then.',
      'privacy': 'Our Privacy Policy page is being finalized. We respect your privacy and protect your data.',
      'docs': 'Comprehensive documentation is coming soon to help you get the most out of Phygital.',
      'help': 'Our Help Center with FAQs and guides is under construction. Contact us for assistance.'
    };
    
    return customDescriptions[path] || 'We\'re working hard to bring you this exciting new feature. Stay tuned for updates!';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <button
          onClick={handleGoBack}
          className="mb-8 flex items-center text-slate-400 hover:text-neon-blue transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
          Go Back
        </button>

        {/* Main Content */}
        <div className="card text-center">
          {/* Animated Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-full border-2 border-neon-blue/30">
                <Clock className="w-16 h-16 text-neon-blue animate-rotate-slow" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              {getPageName()}
            </span>
          </h1>

          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-neon-purple animate-pulse" />
            <p className="text-xl text-slate-300 font-medium">
              Coming Soon
            </p>
            <Sparkles className="w-5 h-5 text-neon-pink animate-pulse" />
          </div>

          <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
            {getDescription()}
          </p>

          {/* Features Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-neon-blue/30 transition-all duration-200">
              <Zap className="w-8 h-8 text-neon-blue mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">Fast</p>
              <p className="text-xs text-slate-500 mt-1">Lightning-quick performance</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-neon-purple/30 transition-all duration-200">
              <Sparkles className="w-8 h-8 text-neon-purple mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">Powerful</p>
              <p className="text-xs text-slate-500 mt-1">Advanced capabilities</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-neon-pink/30 transition-all duration-200">
              <Bell className="w-8 h-8 text-neon-pink mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">Updated</p>
              <p className="text-xs text-slate-500 mt-1">Regular improvements</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary px-6 py-3"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/register')}
                className="btn-primary px-6 py-3"
              >
                Sign Up Free
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="btn-secondary px-6 py-3"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Have questions?{' '}
            <button
              onClick={() => navigate('/contact')}
              className="text-neon-blue hover:text-neon-purple transition-colors duration-200 underline"
            >
              Contact us
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;

