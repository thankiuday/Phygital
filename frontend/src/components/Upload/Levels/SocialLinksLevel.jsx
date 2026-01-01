import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadAPI } from '../../../utils/api';
import { Share2, CheckCircle, AlertCircle, Instagram, Facebook, Twitter, Linkedin, Globe, Phone, MessageCircle, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { countryCodes, validatePhoneNumber as validatePhone, parsePhoneNumber, filterPhoneInput as filterPhone, formatPhoneNumber } from '../../../utils/countryCodes';

const SocialLinksLevel = ({ onComplete, currentLinks, forceStartFromLevel1 = false, upgradeMode = false }) => {
  const { user, updateUser } = useAuth();
  
  // Parse existing phone numbers to extract country code and number
  const existingContact = currentLinks?.contactNumber || user?.socialLinks?.contactNumber || '';
  const existingWhatsApp = currentLinks?.whatsappNumber || user?.socialLinks?.whatsappNumber || '';
  
  const parsedContact = parsePhoneNumber(existingContact);
  const parsedWhatsApp = parsePhoneNumber(existingWhatsApp);
  
  const [socialLinks, setSocialLinks] = useState({
    instagram: currentLinks?.instagram || user?.socialLinks?.instagram || '',
    facebook: currentLinks?.facebook || user?.socialLinks?.facebook || '',
    twitter: currentLinks?.twitter || user?.socialLinks?.twitter || '',
    linkedin: currentLinks?.linkedin || user?.socialLinks?.linkedin || '',
    website: currentLinks?.website || user?.socialLinks?.website || '',
    contactNumber: parsedContact.phoneNumber,
    whatsappNumber: parsedWhatsApp.phoneNumber,
    tiktok: currentLinks?.tiktok || user?.socialLinks?.tiktok || ''
  });
  
  // Country code state
  const [countryCodes_state, setCountryCodesState] = useState({
    contactNumber: parsedContact.countryCode,
    whatsappNumber: parsedWhatsApp.countryCode
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [phoneErrors, setPhoneErrors] = useState({
    contactNumber: '',
    whatsappNumber: ''
  });

  // Handle country code change
  const handleCountryCodeChange = (field, newCountryCode) => {
    setCountryCodesState(prev => ({ ...prev, [field]: newCountryCode }));
    
    // Revalidate the phone number with new country code
    if (socialLinks[field]) {
      const validation = validatePhone(socialLinks[field], newCountryCode);
      setPhoneErrors(prev => ({ ...prev, [field]: validation.error }));
    }
  };

  const socialPlatforms = [
    {
      key: 'contactNumber',
      name: 'Contact Number',
      icon: Phone,
      placeholder: 'Enter your phone number',
      color: 'from-green-600 to-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      type: 'tel'
    },
    {
      key: 'whatsappNumber',
      name: 'WhatsApp Number',
      icon: MessageCircle,
      placeholder: 'Enter your WhatsApp number',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      type: 'tel'
    },
    {
      key: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      placeholder: 'https://instagram.com/yourusername',
      color: 'from-pink-500 to-purple-500',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      type: 'url'
    },
    {
      key: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      placeholder: 'https://facebook.com/yourpage',
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      type: 'url'
    },
    {
      key: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      placeholder: 'https://twitter.com/yourusername',
      color: 'from-sky-400 to-sky-500',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      type: 'url'
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      placeholder: 'https://linkedin.com/in/yourprofile',
      color: 'from-blue-700 to-blue-800',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      type: 'url'
    },
    {
      key: 'website',
      name: 'Website',
      icon: Globe,
      placeholder: 'https://yourwebsite.com',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      type: 'url'
    },
    {
      key: 'tiktok',
      name: 'TikTok',
      icon: Music2,
      placeholder: 'https://www.tiktok.com/@yourusername',
      color: 'from-slate-700 to-slate-900',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
      type: 'url'
    }
  ];

  // Check if any links are provided - must have non-empty values
  const hasAnyLinks = Object.values(socialLinks).some(link => {
    if (!link || typeof link !== 'string') return false;
    const trimmed = link.trim();
    return trimmed !== '' && trimmed.length > 0;
  });

  // Handle platform selection
  const togglePlatform = (platformKey) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformKey)) {
        return prev.filter(key => key !== platformKey);
      } else {
        return [...prev, platformKey];
      }
    });
  };

  // Proceed to form with selected platforms
  const proceedToForm = () => {
    if (selectedPlatforms.length === 0) {
      // If no platforms selected, skip directly
      onComplete({});
      return;
    }
    setShowForm(true);
  };

  // Handle input change with phone validation
  const handleInputChange = (key, value) => {
    // Filter phone inputs to only allow digits
    if (key === 'contactNumber' || key === 'whatsappNumber') {
      value = filterPhone(value);
      
      // Validate with country code
      const countryCode = countryCodes_state[key];
      const validation = validatePhone(value, countryCode);
      setPhoneErrors(prev => ({ ...prev, [key]: validation.error }));
    }
    
    setSocialLinks(prev => ({ ...prev, [key]: value }));
  };

  // Save social links
  const saveSocialLinks = async () => {
    // Validate phone numbers with country codes before saving
    const contactValidation = validatePhone(socialLinks.contactNumber, countryCodes_state.contactNumber);
    const whatsappValidation = validatePhone(socialLinks.whatsappNumber, countryCodes_state.whatsappNumber);
    
    if (contactValidation.error || whatsappValidation.error) {
      setPhoneErrors({
        contactNumber: contactValidation.error,
        whatsappNumber: whatsappValidation.error
      });
      toast.error('Please fix the phone number errors before saving');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Format phone numbers with country codes
      const formattedLinks = {
        ...socialLinks,
        contactNumber: socialLinks.contactNumber 
          ? formatPhoneNumber(socialLinks.contactNumber, countryCodes_state.contactNumber)
          : '',
        whatsappNumber: socialLinks.whatsappNumber 
          ? formatPhoneNumber(socialLinks.whatsappNumber, countryCodes_state.whatsappNumber)
          : ''
      };
      
      // If current project context exists in user, update project-specific links; else update user-level
      const currentProjectId = user?.currentProject;
      if (currentProjectId) {
        await uploadAPI.updateProjectSocialLinks(currentProjectId, formattedLinks);
      } else {
        await uploadAPI.updateSocialLinks(formattedLinks);
      }
      updateUser({ ...user, socialLinks: formattedLinks });
      toast.success('🔗 Social links updated!');
      
      // Complete the level
      onComplete(formattedLinks);
    } catch (error) {
      toast.error('Failed to update social links');
    } finally {
      setIsSaving(false);
    }
  };

  // If links already exist and we're not forcing a fresh start, show completion and auto-advance
  // In upgrade mode, don't auto-complete Level 5 - user must explicitly add social links
  if (!forceStartFromLevel1 && !upgradeMode && (currentLinks || (user?.socialLinks && hasAnyLinks))) {
    const links = currentLinks || user.socialLinks;
    const activeLinks = Object.entries(links).filter(([key, value]) => {
      if (!value || typeof value !== 'string') return false;
      const trimmed = value.trim();
      return trimmed !== '' && trimmed.length > 0;
    });
    
    // Only show completion if there are actually active links
    if (activeLinks.length === 0) {
      // Don't show completion UI if no actual links exist
      // Fall through to show the form instead
    } else {
      // Auto-complete the level if not already completed (only once)
      React.useEffect(() => {
        if (!currentLinks && user?.socialLinks && hasAnyLinks) {
          console.log('Auto-completing Level 5 with existing social links');
          toast.success('🔗 Social links found! Level 5 completed automatically.');
          onComplete(user.socialLinks);
        }
      }, [user?.socialLinks?.instagram, user?.socialLinks?.facebook, user?.socialLinks?.twitter, user?.socialLinks?.linkedin, user?.socialLinks?.website, user?.socialLinks?.tiktok, currentLinks, hasAnyLinks, onComplete]);
    
      return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-green/20 mb-6 shadow-glow-green">
          <CheckCircle className="w-10 h-10 text-neon-green" />
        </div>
        
        <h3 className="text-2xl font-bold text-neon-green mb-4">
          🎉 Level 3 Complete!
        </h3>
        
        <div className="bg-green-900/20 border border-neon-green/30 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <Share2 className="w-8 h-8 text-neon-green mr-3" />
            <span className="font-semibold text-neon-green">Social Links Added</span>
          </div>
          <p className="text-slate-200">
            {activeLinks.length} social platform{activeLinks.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-3">
            {activeLinks.map(([key, value]) => {
              const platform = socialPlatforms.find(p => p.key === key);
              if (!platform) return null;
              
              const Icon = platform.icon;
              return (
                <div key={key} className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-3">
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 text-slate-300 mr-2" />
                    <span className="text-sm font-medium text-slate-100 capitalize">
                      {platform.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <p className="text-slate-300 mt-6">
          ✨ Awesome! Your social links are ready for the final level.
        </p>
        
        <div className="mt-6">
          <button
            onClick={() => onComplete(links)}
            className="btn-primary px-6 py-3"
          >
            Continue to Final Level →
          </button>
        </div>
      </div>
      );
    }
  }

  // Show platform selection interface
  if (!showForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-green/20 mb-4 shadow-glow-green">
            <Share2 className="w-8 h-8 text-neon-green" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100 mb-2">
            Choose Your Social Links (Optional)
          </h3>
          <p className="text-slate-300">
            Select which social media platforms you'd like to add to your personalized page
          </p>
        </div>

        {/* Platform Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;
            const isSelected = selectedPlatforms.includes(platform.key);
            
            return (
              <button
                key={platform.key}
                onClick={() => togglePlatform(platform.key)}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-neon-green bg-green-900/20 shadow-glow-green'
                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center mb-2 sm:mb-3`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h4 className="font-medium text-slate-100 text-xs sm:text-sm">{platform.name}</h4>
                  {isSelected && (
                    <CheckCircle className="w-4 h-4 text-neon-green mt-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={proceedToForm}
            className="btn-primary inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 touch-manipulation text-sm sm:text-base"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {selectedPlatforms.length > 0 ? `Add ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}` : 'Skip Social Links'}
          </button>
          
          {selectedPlatforms.length > 0 && (
            <button
              onClick={() => setSelectedPlatforms([])}
              className="btn-secondary inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 touch-manipulation text-sm sm:text-base"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 sm:mt-8 bg-green-900/20 border border-neon-green/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-neon-green mb-1 text-sm sm:text-base">💡 Pro Tips</h4>
              <ul className="text-xs sm:text-sm text-slate-300 space-y-1">
                <li>• Select only the platforms you want to add</li>
                <li>• You can skip this level entirely if you don't want social links</li>
                <li>• You can always add or update them later in your profile</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show form for selected platforms
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-green/20 mb-4 shadow-glow-green">
          <Share2 className="w-8 h-8 text-neon-green" />
        </div>
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Add Your Social Links
        </h3>
        <p className="text-slate-300">
          Fill in the details for your selected platforms
        </p>
      </div>

      {/* Social Links Form - Only show selected platforms */}
      <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
        {socialPlatforms
          .filter(platform => selectedPlatforms.includes(platform.key))
          .map((platform) => {
            const Icon = platform.icon;
            const value = socialLinks[platform.key];
            const hasValue = value && value.trim() !== '';
            
            return (
              <div key={platform.key} className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm sm:text-base">{platform.name}</h4>
                    <p className="text-xs sm:text-sm text-slate-400">Optional</p>
                  </div>
                </div>
                
                {/* Phone number fields with country code selector */}
                {(platform.key === 'contactNumber' || platform.key === 'whatsappNumber') ? (
                  <div className="flex gap-2">
                    {/* Country Code Dropdown */}
                    <select
                      value={countryCodes_state[platform.key]}
                      onChange={(e) => handleCountryCodeChange(platform.key, e.target.value)}
                      className="input px-2 py-2 sm:py-3 text-sm sm:text-base touch-manipulation flex-shrink-0 w-24 sm:w-28"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </option>
                      ))}
                    </select>
                    
                    {/* Phone Number Input */}
                    <input
                      type="tel"
                      value={value}
                      onChange={(e) => handleInputChange(platform.key, e.target.value)}
                      placeholder={platform.placeholder}
                      className={`input flex-1 px-3 sm:px-4 py-2 sm:py-3 transition-all duration-200 text-sm sm:text-base touch-manipulation ${
                        phoneErrors[platform.key] 
                          ? 'border-neon-red bg-red-900/20' 
                          : hasValue 
                          ? 'border-neon-green bg-green-900/20' 
                          : ''
                      }`}
                    />
                  </div>
                ) : (
                  /* Regular input for URLs */
                  <input
                    type={platform.type}
                    value={value}
                    onChange={(e) => handleInputChange(platform.key, e.target.value)}
                    placeholder={platform.placeholder}
                    className={`input w-full px-3 sm:px-4 py-2 sm:py-3 transition-all duration-200 text-sm sm:text-base touch-manipulation ${
                      hasValue ? 'border-neon-green bg-green-900/20' : ''
                    }`}
                  />
                )}
                
                {phoneErrors[platform.key] && (
                  <div className="mt-2 flex items-start text-xs sm:text-sm text-neon-red">
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                    <span>{phoneErrors[platform.key]}</span>
                  </div>
                )}
                
                {hasValue && !phoneErrors[platform.key] && (
                  <div className="mt-2 flex items-center text-xs sm:text-sm text-neon-green">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                    {platform.type === 'tel' ? 'Valid number' : 'Link added'}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        <button
          onClick={saveSocialLinks}
          disabled={isSaving}
          className="btn-primary inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm sm:text-base"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Social Links'}
        </button>
        
        <button
          onClick={() => setShowForm(false)}
          className="btn-secondary inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 touch-manipulation text-sm sm:text-base"
        >
          Back to Selection
        </button>
      </div>
    </div>
  );
};

export default SocialLinksLevel;
