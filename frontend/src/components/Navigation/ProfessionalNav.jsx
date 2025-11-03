/**
 * Professional Navigation Component
 * Clean, user-friendly navigation with better UX
 * Responsive and accessible
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Upload, 
  BarChart3, 
  User, 
  LogOut,
  FolderKanban,
  Info,
  Mail,
  Menu,
  X,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import ProfessionalButton from '../UI/ProfessionalButton';
import Logo from '../UI/Logo';

const ProfessionalNav = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const navigation = [
    { name: 'AI Video', href: '/ai-video', icon: Sparkles, public: true, showBoth: true, isNew: true },
    { name: 'Home', href: '/', icon: Home, public: true, showBoth: true },
    { name: 'About', href: '/about', icon: Info, public: true },
    { name: 'Contact', href: '/contact', icon: Mail, public: true },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, authOnly: true },
    { name: 'Upload', href: '/upload', icon: Upload, authOnly: true },
    { name: 'Projects', href: '/projects', icon: FolderKanban, authOnly: true },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, authOnly: true },
    { name: 'Profile', href: '/profile', icon: User, authOnly: true },
  ];

  const filteredNavigation = navigation.filter(item => {
    if (item.showBoth) return true;
    if (isAuthenticated) {
      // Exclude Profile from main nav since it's shown separately in user menu
      return item.authOnly && item.name !== 'Profile';
    }
    return item.public;
  });

  const isActive = (path) => location.pathname === path;

  const handleLogout = (e) => {
    // Prevent event bubbling
    e.preventDefault();
    e.stopPropagation();
    
    // Close menus
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    
    // Execute logout
    logout();
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm shadow-dark-large border-b border-slate-700/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo size="lg" showText={true} linkTo="/" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative
                      ${active 
                        ? 'bg-primary-600/20 text-primary-400 border-b-2 border-primary-500' 
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                      }
                      ${item.isNew ? 'text-gradient hover:scale-105' : ''}
                    `}
                >
                  <Icon className={`w-4 h-4 mr-2 ${item.isNew ? 'animate-pulse' : ''}`} />
                  {item.name}
                  {item.isNew && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-neon-pink to-neon-orange text-white rounded-full animate-pulse">
                      NEW
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-medium focus:outline-none hover:opacity-80 transition-opacity"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-sm font-medium text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gradient">{user?.username}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-sm rounded-md shadow-dark-large border border-slate-700/50 py-1 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auth Buttons for non-authenticated users */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center space-x-3">
              <Link to="/login">
                <button className="px-5 py-2 text-sm font-semibold rounded-lg bg-slate-800/50 text-slate-200 border border-slate-600/50 hover:bg-slate-700 hover:border-neon-blue/50 hover:text-neon-blue transition-all duration-300 hover:shadow-glow-blue">
                  Login
                </button>
              </Link>
              <Link to="/register">
                <button className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg transition-all duration-300 hover:scale-105 active:scale-95 animate-gradient-x bg-size-200">
                  Sign Up
                </button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-300 hover:text-slate-100 hover:bg-slate-800/50"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700/50">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-base font-medium relative
                      ${active 
                        ? 'bg-primary-600/20 text-primary-400' 
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                      }
                      ${item.isNew ? 'text-gradient' : ''}
                    `}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${item.isNew ? 'animate-pulse' : ''}`} />
                    {item.name}
                    {item.isNew && (
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-neon-pink to-neon-orange text-white rounded-full animate-pulse">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
              
              {isAuthenticated && (
                <div className="border-t border-slate-700/50 pt-4">
                  <div className="flex items-center px-3 py-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center mr-3 shadow-lg">
                      <span className="text-sm font-medium text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gradient">
                      {user?.username}
                    </span>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center w-full px-3 py-2 text-base text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5 mr-3" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-base text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 rounded-md transition-colors"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </button>
                </div>
              )}
              
              {!isAuthenticated && (
                <div className="border-t border-slate-700/50 pt-4 space-y-2 px-2">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <button className="w-full px-5 py-3 text-base font-semibold rounded-lg bg-slate-800/50 text-slate-200 border border-slate-600/50 hover:bg-slate-700 hover:border-neon-blue/50 hover:text-neon-blue transition-all duration-300">
                      Login
                    </button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <button className="w-full px-5 py-3 text-base font-semibold rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg transition-all duration-300 hover:scale-105 active:scale-95">
                      Sign Up
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ProfessionalNav;



