/**
 * Social Links Input Component
 * Reusable component for selecting and inputting social media links
 * Based on the upload page SocialLinksLevel structure
 */

import React, { useState, useEffect } from 'react'
import { 
  Share2, 
  CheckCircle, 
  AlertCircle, 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Globe, 
  Phone, 
  MessageCircle, 
  Music2 
} from 'lucide-react'
import { 
  countryCodes, 
  validatePhoneNumber as validatePhone, 
  parsePhoneNumber, 
  filterPhoneInput as filterPhone, 
  formatPhoneNumber 
} from '../../utils/countryCodes'

const SocialLinksInput = ({ 
  value = {}, 
  onChange, 
  showSelection = true,
  className = '' 
}) => {
  // Parse existing phone numbers to extract country code and number
  const existingContact = value?.contactNumber || ''
  const existingWhatsApp = value?.whatsappNumber || ''
  
  const parsedContact = parsePhoneNumber(existingContact)
  const parsedWhatsApp = parsePhoneNumber(existingWhatsApp)
  
  const [socialLinks, setSocialLinks] = useState({
    instagram: value?.instagram || '',
    facebook: value?.facebook || '',
    twitter: value?.twitter || '',
    linkedin: value?.linkedin || '',
    website: value?.website || '',
    contactNumber: parsedContact.phoneNumber,
    whatsappNumber: parsedWhatsApp.phoneNumber,
    tiktok: value?.tiktok || ''
  })
  
  // Country code state
  const [countryCodes_state, setCountryCodesState] = useState({
    contactNumber: parsedContact.countryCode,
    whatsappNumber: parsedWhatsApp.countryCode
  })
  
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [phoneErrors, setPhoneErrors] = useState({
    contactNumber: '',
    whatsappNumber: ''
  })

  // Initialize selected platforms based on existing values
  useEffect(() => {
    const platformsWithValues = Object.entries(socialLinks)
      .filter(([key, val]) => val && val.trim() !== '')
      .map(([key]) => key)
    setSelectedPlatforms(platformsWithValues)
    if (platformsWithValues.length > 0) {
      setShowForm(true)
    }
  }, [])

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      // Format phone numbers with country codes before sending to parent
      const formattedLinks = {
        ...socialLinks,
        contactNumber: socialLinks.contactNumber 
          ? formatPhoneNumber(socialLinks.contactNumber, countryCodes_state.contactNumber)
          : '',
        whatsappNumber: socialLinks.whatsappNumber 
          ? formatPhoneNumber(socialLinks.whatsappNumber, countryCodes_state.whatsappNumber)
          : ''
      }
      onChange(formattedLinks)
    }
  }, [socialLinks, countryCodes_state])

  // Handle country code change
  const handleCountryCodeChange = (field, newCountryCode) => {
    setCountryCodesState(prev => ({ ...prev, [field]: newCountryCode }))
    
    // Revalidate the phone number with new country code
    if (socialLinks[field]) {
      const validation = validatePhone(socialLinks[field], newCountryCode)
      setPhoneErrors(prev => ({ ...prev, [field]: validation.error }))
    }
  }

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
  ]

  // Handle platform selection
  const togglePlatform = (platformKey) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformKey)) {
        // Remove platform and clear its value
        setSocialLinks(prevLinks => ({ ...prevLinks, [platformKey]: '' }))
        return prev.filter(key => key !== platformKey)
      } else {
        return [...prev, platformKey]
      }
    })
  }

  // Handle input change with phone validation
  const handleInputChange = (key, value) => {
    // Filter phone inputs to only allow digits
    if (key === 'contactNumber' || key === 'whatsappNumber') {
      value = filterPhone(value)
      
      // Validate with country code
      const countryCode = countryCodes_state[key]
      const validation = validatePhone(value, countryCode)
      setPhoneErrors(prev => ({ ...prev, [key]: validation.error }))
    }
    
    setSocialLinks(prev => ({ ...prev, [key]: value }))
  }

  // If showSelection is false, just show the form directly
  if (!showSelection || showForm) {
    return (
      <div className={className}>
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Share2 className="w-5 h-5 text-neon-purple mr-2" />
            <h3 className="text-lg font-semibold text-slate-100">Social Links</h3>
          </div>
          <p className="text-sm text-slate-400">
            Add your social media links to display on the landing page
          </p>
        </div>

        {/* Social Links Form - Only show selected platforms */}
        <div className="space-y-4 mb-6">
          {socialPlatforms
            .filter(platform => !showSelection || selectedPlatforms.includes(platform.key))
            .map((platform) => {
              const Icon = platform.icon
              const val = socialLinks[platform.key]
              const hasValue = val && val.trim() !== ''
              
              return (
                <div key={platform.key} className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center mr-3 flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100">{platform.name}</h4>
                      <p className="text-xs text-slate-400">Optional</p>
                    </div>
                  </div>
                  
                  {/* Phone number fields with country code selector */}
                  {(platform.key === 'contactNumber' || platform.key === 'whatsappNumber') ? (
                    <div className="flex gap-2">
                      {/* Country Code Dropdown */}
                      <select
                        value={countryCodes_state[platform.key]}
                        onChange={(e) => handleCountryCodeChange(platform.key, e.target.value)}
                        className="input px-2 py-2 text-sm flex-shrink-0 w-28"
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
                        value={val}
                        onChange={(e) => handleInputChange(platform.key, e.target.value)}
                        placeholder={platform.placeholder}
                        className={`input flex-1 px-3 py-2 transition-all duration-200 ${
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
                      value={val}
                      onChange={(e) => handleInputChange(platform.key, e.target.value)}
                      placeholder={platform.placeholder}
                      className={`input w-full px-3 py-2 transition-all duration-200 ${
                        hasValue ? 'border-neon-green bg-green-900/20' : ''
                      }`}
                    />
                  )}
                  
                  {phoneErrors[platform.key] && (
                    <div className="mt-2 flex items-start text-xs text-neon-red">
                      <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
                      <span>{phoneErrors[platform.key]}</span>
                    </div>
                  )}
                  
                  {hasValue && !phoneErrors[platform.key] && (
                    <div className="mt-2 flex items-center text-xs text-neon-green">
                      <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                      {platform.type === 'tel' ? 'Valid number' : 'Link added'}
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {showSelection && (
          <button
            onClick={() => setShowForm(false)}
            className="btn-secondary text-sm py-2"
          >
            Back to Selection
          </button>
        )}
      </div>
    )
  }

  // Show platform selection interface
  return (
    <div className={className}>
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Share2 className="w-5 h-5 text-neon-purple mr-2" />
          <h3 className="text-lg font-semibold text-slate-100">Social Links (Optional)</h3>
        </div>
        <p className="text-sm text-slate-400">
          Select which social media platforms you'd like to add
        </p>
      </div>

      {/* Platform Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon
          const isSelected = selectedPlatforms.includes(platform.key)
          
          return (
            <button
              key={platform.key}
              onClick={() => togglePlatform(platform.key)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-neon-green bg-green-900/20 shadow-glow-green'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-medium text-slate-100 text-sm">{platform.name}</h4>
                {isSelected && (
                  <CheckCircle className="w-4 h-4 text-neon-green mt-1" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Action Button */}
      <button
        onClick={() => {
          if (selectedPlatforms.length > 0) {
            setShowForm(true)
          }
        }}
        className="btn-primary inline-flex items-center px-6 py-3"
      >
        <Share2 className="w-4 h-4 mr-2" />
        {selectedPlatforms.length > 0 ? `Add ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}` : 'Skip Social Links'}
      </button>
    </div>
  )
}

export default SocialLinksInput













