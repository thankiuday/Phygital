/**
 * Footer Component
 * Professional footer with links, social media, and company info
 * Matches the dark aesthetic with neon accents
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Linkedin, 
  Mail, 
  Heart,
  Phone,
  MapPin
} from 'lucide-react';
import Logo from '../UI/Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Features', href: '/#features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'How It Works', href: '/#how-it-works' },
      { name: 'Dashboard', href: '/dashboard' }
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' }
    ],
    resources: [
      { name: 'Documentation', href: '/docs' },
      { name: 'Help Center', href: '/help' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' }
    ]
  };

  const socialLinks = [
    { icon: Linkedin, href: 'https://www.linkedin.com/company/nerds-and-geeks-pvt-ltd/posts/?feedView=all', label: 'LinkedIn', color: 'hover:text-neon-blue' }
  ];

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
              Transform your physical designs into interactive digital experiences. 
              Bridge the gap between physical and digital with innovative QR technology.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`text-slate-400 ${social.color} transition-colors duration-200`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-slate-100 font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
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
                  href="mailto:info@metadigilabs.com"
                  className="text-slate-400 hover:text-neon-blue text-sm transition-colors duration-200 break-all"
                >
                  info@metadigilabs.com
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-neon-pink mt-0.5 flex-shrink-0" />
                <div className="text-slate-400 text-sm">
                  <p>South Carolina, United States</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700/50 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-1 text-slate-400 text-sm">
              <span>&copy; {currentYear} MetaDigi Labs LLC. All rights reserved.</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400 text-sm">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-neon-pink fill-current animate-pulse" />
              <span>by</span>
              <span className="text-neon-blue font-semibold">
                MetaDigi Labs LLC
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

