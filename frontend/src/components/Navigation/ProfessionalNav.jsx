/**
 * Professional Navigation Component
 * Clean, user-friendly navigation with better UX
 * Responsive and accessible
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Upload, 
  BarChart3, 
  User, 
  LogOut,
  Settings,
  FolderKanban,
  Info,
  Mail,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import ProfessionalButton from '../UI/ProfessionalButton';

const ProfessionalNav = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: Home, public: true },
    { name: 'About', href: '/about', icon: Info, public: true },
    { name: 'Contact', href: '/contact', icon: Mail, public: true },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, authOnly: true },
    { name: 'Upload', href: '/upload', icon: Upload, authOnly: true },
    { name: 'Projects', href: '/projects', icon: FolderKanban, authOnly: true },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, authOnly: true },
    { name: 'Profile', href: '/profile', icon: User, authOnly: true },
  ];

  const filteredNavigation = navigation.filter(item => {
    if (isAuthenticated) {
      return item.authOnly;
    }
    return item.public;
  });

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm shadow-dark-large border-b border-slate-700/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-slate-100">Phygital</span>
            </Link>
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
                      flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${active 
                        ? 'bg-primary-600/20 text-primary-400 border-b-2 border-primary-500' 
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                      }
                    `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-slate-100 focus:outline-none"
                >
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-200">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span>{user?.username}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-sm rounded-md shadow-dark-large border border-slate-700/50 py-1">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100"
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
                <ProfessionalButton variant="ghost" size="sm">
                  Login
                </ProfessionalButton>
              </Link>
              <Link to="/register">
                <ProfessionalButton variant="primary" size="sm">
                  Sign Up
                </ProfessionalButton>
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
                      flex items-center px-3 py-2 rounded-md text-base font-medium
                      ${active 
                        ? 'bg-primary-600/20 text-primary-400' 
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              
              {isAuthenticated && (
                <div className="border-t border-slate-700/50 pt-4">
                  <div className="flex items-center px-3 py-2">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-slate-200">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-300">
                      {user?.username}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-base text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 rounded-md"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </button>
                </div>
              )}
              
              {!isAuthenticated && (
                <div className="border-t border-slate-700/50 pt-4 space-y-2">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <ProfessionalButton variant="ghost" size="sm" fullWidth>
                      Login
                    </ProfessionalButton>
                  </Link>
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <ProfessionalButton variant="primary" size="sm" fullWidth>
                      Sign Up
                    </ProfessionalButton>
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


