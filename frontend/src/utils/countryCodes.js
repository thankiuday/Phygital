/**
 * Country Codes and Phone Validation Utility
 * Provides country codes and validation patterns for phone numbers
 */

export const countryCodes = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+91', country: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10, pattern: /^[6-9][0-9]{9}$/ },
  { code: '+86', country: 'China', flag: '🇨🇳', minLength: 11, maxLength: 11, pattern: /^[0-9]{11}$/ },
  { code: '+81', country: 'Japan', flag: '🇯🇵', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+49', country: 'Germany', flag: '🇩🇪', minLength: 10, maxLength: 11, pattern: /^[0-9]{10,11}$/ },
  { code: '+33', country: 'France', flag: '🇫🇷', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+61', country: 'Australia', flag: '🇦🇺', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+55', country: 'Brazil', flag: '🇧🇷', minLength: 10, maxLength: 11, pattern: /^[0-9]{10,11}$/ },
  { code: '+52', country: 'Mexico', flag: '🇲🇽', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+7', country: 'Russia', flag: '🇷🇺', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+82', country: 'South Korea', flag: '🇰🇷', minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ },
  { code: '+34', country: 'Spain', flag: '🇪🇸', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+39', country: 'Italy', flag: '🇮🇹', minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+46', country: 'Sweden', flag: '🇸🇪', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+32', country: 'Belgium', flag: '🇧🇪', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+48', country: 'Poland', flag: '🇵🇱', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+971', country: 'UAE', flag: '🇦🇪', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', minLength: 8, maxLength: 8, pattern: /^[0-9]{8}$/ },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩', minLength: 9, maxLength: 12, pattern: /^[0-9]{9,12}$/ },
  { code: '+63', country: 'Philippines', flag: '🇵🇭', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+66', country: 'Thailand', flag: '🇹🇭', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳', minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿', minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ },
  { code: '+254', country: 'Kenya', flag: '🇰🇪', minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }
];

/**
 * Validate phone number based on country code
 * @param {string} phoneNumber - The phone number without country code
 * @param {string} countryCode - The selected country code (e.g., '+91')
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validatePhoneNumber = (phoneNumber, countryCode) => {
  if (!phoneNumber || !phoneNumber.trim()) {
    return { isValid: true, error: '' }; // Empty is valid (optional field)
  }

  const country = countryCodes.find(c => c.code === countryCode);
  
  if (!country) {
    return { isValid: false, error: 'Please select a valid country code' };
  }

  // Remove any non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  if (!cleanNumber) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  // Check length
  if (cleanNumber.length < country.minLength) {
    return { 
      isValid: false, 
      error: `Phone number must be at least ${country.minLength} digits for ${country.country}` 
    };
  }

  if (cleanNumber.length > country.maxLength) {
    return { 
      isValid: false, 
      error: `Phone number must be at most ${country.maxLength} digits for ${country.country}` 
    };
  }

  // Check pattern
  if (!country.pattern.test(cleanNumber)) {
    return { 
      isValid: false, 
      error: `Invalid phone number format for ${country.country}` 
    };
  }

  return { isValid: true, error: '' };
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - The phone number without country code
 * @param {string} countryCode - The country code
 * @returns {string} - Formatted phone number with country code
 */
export const formatPhoneNumber = (phoneNumber, countryCode) => {
  if (!phoneNumber) return '';
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  return `${countryCode} ${cleanNumber}`;
};

/**
 * Parse stored phone number into country code and number
 * @param {string} fullNumber - Full phone number with country code (e.g., '+91 9876543210')
 * @returns {object} - { countryCode: string, phoneNumber: string }
 */
export const parsePhoneNumber = (fullNumber) => {
  if (!fullNumber || typeof fullNumber !== 'string') {
    return { countryCode: '+1', phoneNumber: '' }; // Default to USA
  }

  // Find matching country code
  const matchedCountry = countryCodes.find(country => 
    fullNumber.startsWith(country.code)
  );

  if (matchedCountry) {
    const phoneNumber = fullNumber.substring(matchedCountry.code.length).trim();
    return { countryCode: matchedCountry.code, phoneNumber };
  }

  // If no match, try to extract assuming format "+XX number"
  const match = fullNumber.match(/^(\+\d+)\s*(.*)$/);
  if (match) {
    return { countryCode: match[1], phoneNumber: match[2] };
  }

  // Default return
  return { countryCode: '+1', phoneNumber: fullNumber };
};

/**
 * Filter input to only allow digits
 * @param {string} value - Input value
 * @returns {string} - Filtered value with only digits
 */
export const filterPhoneInput = (value) => {
  return value.replace(/\D/g, '');
};

