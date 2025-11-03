/**
 * Footer Component
 * Professional footer with links, social media, and company info
 * Matches the dark aesthetic with neon accents
 */

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, 
  Heart,
  Phone,
  MapPin
} from 'lucide-react';
import Logo from '../UI/Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle section navigation (for #features, #how-it-works, etc.)
  const handleSectionClick = (e, href) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const sectionId = href.substring(2); // Remove /#
      
      // If not on home page, navigate to home first
      if (location.pathname !== '/') {
        navigate('/');
        // Wait for navigation, then scroll
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        // Already on home page, just scroll
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  const footerLinks = {
    company: [
      { name: 'About', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Privacy', href: '/privacy' }
    ],
    product: [
      { name: 'How It Works', href: '/#how-it-works', isSection: true },
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Analytics', href: '/analytics' },
      { name: 'Pricing', href: '/pricing' }
    ],
    resources: [
      { name: 'Help Center', href: '/help' },
      { name: 'Documentation', href: '/docs' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'AI Video', href: '/ai-video' }
    ]
  };

  const socialLinks = [];

  return (
    <footer className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Logo size="lg" showText={true} linkTo="/" />
            </div>
            <p className="text-slate-400 text-sm mb-4 max-w-sm">
              Where the Physical World Meets Digital Storytelling.
              Join the Phygital Movement and transform how people connect with your creations.
            </p>
            <p className="text-slate-500 text-xs italic max-w-sm">
              Your Vision. Our Innovation.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-slate-100 font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    onClick={(e) => link.isSection && handleSectionClick(e, link.href)}
                    className="text-slate-400 hover:text-neon-blue text-sm transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-slate-100 font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-slate-400 hover:text-neon-purple text-sm transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-slate-100 font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <Mail className="w-4 h-4 text-neon-blue mt-0.5 flex-shrink-0" />
                <a 
                  href="mailto:hello@phygital.zone"
                  className="text-slate-400 hover:text-neon-blue text-sm transition-colors duration-200 break-all"
                >
                  hello@phygital.zone
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
                <a 
                  href="tel:+17049667158"
                  className="text-slate-400 hover:text-neon-green text-sm transition-colors duration-200"
                >
                  (704) 966-7158
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-neon-pink mt-0.5 flex-shrink-0" />
                <div className="text-slate-400 text-sm">
                  <p>South Carolina, USA</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700/50 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-1 text-slate-400 text-sm">
              <span>&copy; {currentYear} MetaDigi Labs LLC.</span>
              <span className="hidden sm:inline text-slate-500 mx-2">•</span>
              <span className="hidden sm:inline text-gradient bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent font-semibold">
                Your Vision. Our Innovation.
              </span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400 text-sm">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-neon-pink fill-current animate-pulse" />
              <span>for the Phygital Movement</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

