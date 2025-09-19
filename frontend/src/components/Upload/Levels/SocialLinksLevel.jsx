import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadAPI } from '../../../utils/api';
import { Share2, CheckCircle, AlertCircle, Instagram, Facebook, Twitter, Linkedin, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const SocialLinksLevel = ({ onComplete, currentLinks, forceStartFromLevel1 = false }) => {
  const { user, updateUser } = useAuth();
  const [socialLinks, setSocialLinks] = useState({
    instagram: currentLinks?.instagram || user?.socialLinks?.instagram || '',
    facebook: currentLinks?.facebook || user?.socialLinks?.facebook || '',
    twitter: currentLinks?.twitter || user?.socialLinks?.twitter || '',
    linkedin: currentLinks?.linkedin || user?.socialLinks?.linkedin || '',
    website: currentLinks?.website || user?.socialLinks?.website || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const socialPlatforms = [
    {
      key: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      placeholder: 'https://instagram.com/yourusername',
      color: 'from-pink-500 to-purple-500',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    },
    {
      key: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      placeholder: 'https://facebook.com/yourpage',
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      key: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      placeholder: 'https://twitter.com/yourusername',
      color: 'from-sky-400 to-sky-500',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200'
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      placeholder: 'https://linkedin.com/in/yourprofile',
      color: 'from-blue-700 to-blue-800',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      key: 'website',
      name: 'Website',
      icon: Globe,
      placeholder: 'https://yourwebsite.com',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  // Check if any links are provided
  const hasAnyLinks = Object.values(socialLinks).some(link => link.trim() !== '');

  // Save social links
  const saveSocialLinks = async () => {
    try {
      setIsSaving(true);
      await uploadAPI.updateSocialLinks(socialLinks);
      updateUser({ ...user, socialLinks });
      toast.success('🔗 Social links updated!');
      
      // Complete the level
      onComplete(socialLinks);
    } catch (error) {
      toast.error('Failed to update social links');
    } finally {
      setIsSaving(false);
    }
  };

  // If links already exist and we're not forcing a fresh start, show completion and auto-advance
  if (!forceStartFromLevel1 && (currentLinks || (user?.socialLinks && hasAnyLinks))) {
    const links = currentLinks || user.socialLinks;
    const activeLinks = Object.entries(links).filter(([key, value]) => value && value.trim() !== '');
    
    // Auto-complete the level if not already completed (only once)
    React.useEffect(() => {
      if (!currentLinks && user?.socialLinks && Object.values(user.socialLinks).some(link => link)) {
        console.log('Auto-completing Level 3 with existing social links');
        toast.success('🔗 Social links found! Level 3 completed automatically.');
        onComplete(user.socialLinks);
      }
    }, [user?.socialLinks?.instagram, user?.socialLinks?.facebook, user?.socialLinks?.twitter, user?.socialLinks?.linkedin, user?.socialLinks?.website]); // Only depend on specific social link data
    
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
          Connect your social media profiles to your personalized page
        </p>
      </div>

      {/* Social Links Form */}
      <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
        {socialPlatforms.map((platform) => {
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
              
              <input
                type="url"
                value={value}
                onChange={(e) => setSocialLinks(prev => ({ ...prev, [platform.key]: e.target.value }))}
                placeholder={platform.placeholder}
                className={`input w-full px-3 sm:px-4 py-2 sm:py-3 transition-all duration-200 text-sm sm:text-base touch-manipulation ${
                  hasValue ? 'border-neon-green bg-green-900/20' : ''
                }`}
              />
              
              {hasValue && (
                <div className="mt-2 flex items-center text-xs sm:text-sm text-neon-green">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  Link added
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="text-center">
        <button
          onClick={saveSocialLinks}
          disabled={isSaving || !hasAnyLinks}
          className="btn-primary inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm sm:text-base"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Social Links'}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 sm:mt-8 bg-green-900/20 border border-neon-green/30 rounded-lg p-3 sm:p-4">
        <div className="flex items-start">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-neon-green mb-1 text-sm sm:text-base">💡 Pro Tips</h4>
            <ul className="text-xs sm:text-sm text-slate-300 space-y-1">
              <li>• Add at least one social link to complete this level</li>
              <li>• These links will appear on your personalized QR page</li>
              <li>• You can always update them later in your profile</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialLinksLevel;
