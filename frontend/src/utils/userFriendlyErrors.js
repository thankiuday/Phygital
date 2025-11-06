/**
 * User-Friendly Error Messages
 * Provides human-readable, non-technical error messages for users
 */

// Helper function to detect error type
const detectErrorType = (error) => {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorResponse = error?.response?.data?.message?.toLowerCase() || '';
  const combined = (errorMessage + ' ' + errorResponse).toLowerCase();

  // Network/Connection errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') || 
      errorResponse.includes('network') ||
      errorResponse.includes('connection refused') ||
      error?.code === 'ERR_NETWORK') {
    return 'network';
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorResponse.includes('timeout')) {
    return 'timeout';
  }

  // Authentication errors
  if (error?.response?.status === 401 || 
      errorResponse.includes('unauthorized') ||
      errorResponse.includes('invalid token')) {
    return 'unauthorized';
  }

  // Permission errors
  if (error?.response?.status === 403 || 
      errorResponse.includes('forbidden') ||
      errorResponse.includes('permission')) {
    return 'forbidden';
  }

  // Not found errors
  if (error?.response?.status === 404 || errorResponse.includes('not found')) {
    return 'notFound';
  }

  // Server errors
  if (error?.response?.status >= 500 || errorResponse.includes('server error')) {
    return 'server';
  }

  // Rate limit errors
  if (error?.response?.status === 429 || errorResponse.includes('rate limit')) {
    return 'rateLimit';
  }

  // File/Upload errors
  if (errorResponse.includes('file') || 
      errorResponse.includes('upload') ||
      errorResponse.includes('size') ||
      errorResponse.includes('format')) {
    return 'file';
  }

  return 'generic';
};

/**
 * Get user-friendly error message
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred (e.g., 'upload', 'ar', 'download')
 * @returns {string} - User-friendly error message
 */
export const getUserFriendlyError = (error, context = '') => {
  const errorType = detectErrorType(error);

  const messages = {
    // Network errors
    network: {
      upload: "We couldn't connect to our servers. Please check your internet connection and try again.",
      download: "We couldn't reach our servers. Please check your connection.",
      ar: "Can't load the AR experience right now. Make sure you're connected to the internet.",
      generic: "Can't connect right now. Please check your internet connection.",
      delete: "Couldn't reach our servers. Your item might still be deleted - please refresh the page.",
      save: "Lost connection while saving. Please try again.",
      load: "Can't load right now. Check your connection and try again."
    },

    // Timeout errors
    timeout: {
      upload: "The upload is taking too long. Your file might be too large - try compressing it or uploading a smaller file.",
      download: "Download timeout. The file might be large - try again.",
      ar: "Loading is taking too long. Try refreshing the page.",
      generic: "This is taking longer than expected. Please try again.",
      delete: "Delete operation timed out. Refresh the page to check if it was successful.",
      save: "Save timed out. Please try again.",
      load: "Loading took too long. Please try again."
    },

    // Authentication errors
    unauthorized: {
      upload: "Your session has expired. Please log in again.",
      download: "Please log in to download files.",
      ar: "Please log in to view this AR experience.",
      generic: "Please log in to continue.",
      delete: "Please log in to delete items.",
      save: "Session expired. Please log in again.",
      load: "Please log in to view this."
    },

    // Permission errors
    forbidden: {
      upload: "You don't have permission to upload here.",
      download: "You don't have permission to download this file.",
      ar: "You don't have permission to view this AR experience.",
      generic: "You don't have permission to do this.",
      delete: "You don't have permission to delete this.",
      save: "You don't have permission to save this.",
      load: "You don't have permission to view this."
    },

    // Not found errors
    notFound: {
      upload: "The upload target wasn't found. Please refresh the page.",
      download: "The file you're trying to download doesn't exist.",
      ar: "This AR experience doesn't exist or has been removed.",
      generic: "What you're looking for doesn't exist.",
      delete: "Already deleted or doesn't exist.",
      save: "Can't find what to save. Please refresh.",
      load: "Can't find this content. It might have been removed."
    },

    // Server errors
    server: {
      upload: "Something went wrong on our end. Please try again in a moment.",
      download: "Our servers are having issues. Please try again soon.",
      ar: "Our AR system is temporarily unavailable. Please try again in a few minutes.",
      generic: "Oops! Something's wrong on our end. We're working on it!",
      delete: "Couldn't delete due to a server error. Please try again.",
      save: "Couldn't save due to a server error. Please try again.",
      load: "Our servers are having issues. Please refresh the page."
    },

    // Rate limit errors
    rateLimit: {
      upload: "You're uploading too quickly! Please wait a moment and try again.",
      download: "Too many download requests. Please wait a moment.",
      ar: "Too many requests. Please wait a moment.",
      generic: "Please slow down - too many requests!",
      delete: "Too many requests. Please wait and try again.",
      save: "Please wait a moment before saving again.",
      load: "Too many requests. Please wait a moment."
    },

    // File errors
    file: {
      upload: "There's an issue with your file. Please check the format and size, then try again.",
      download: "There's an issue with this file.",
      ar: "The AR file has an issue. Please contact support.",
      generic: "There's a problem with this file.",
      delete: "Couldn't delete the file. Please try again.",
      save: "Couldn't save the file. Please try again.",
      load: "Couldn't load the file."
    },

    // Generic errors
    generic: {
      upload: "Couldn't upload your file. Please try again.",
      download: "Couldn't download. Please try again.",
      ar: "Something went wrong with the AR experience. Please try again.",
      generic: "Something went wrong. Please try again.",
      delete: "Couldn't delete. Please try again.",
      save: "Couldn't save. Please try again.",
      load: "Couldn't load. Please try again."
    }
  };

  // Get the specific message or fallback to generic
  const contextMessages = messages[errorType];
  const message = contextMessages?.[context] || contextMessages?.generic || messages.generic.generic;

  return message;
};

/**
 * File-specific error messages
 */
export const getFileError = (file, maxSize, allowedFormats) => {
  // Check file type
  const isValidFormat = allowedFormats.some(format => 
    file.type.toLowerCase().includes(format.toLowerCase()) ||
    file.name.toLowerCase().endsWith(format.toLowerCase())
  );

  if (!isValidFormat) {
    const formats = allowedFormats.join(' or ').toUpperCase();
    return {
      title: "Wrong File Type",
      message: `This file type isn't supported. Please use ${formats} format instead.`
    };
  }

  // Check file size
  const fileSizeMB = file.size / 1024 / 1024;
  if (fileSizeMB > maxSize) {
    return {
      title: "File Too Large",
      message: `Your file is ${fileSizeMB.toFixed(1)}MB, but the maximum is ${maxSize}MB. Please compress your file or choose a smaller one.`
    };
  }

  return null;
};

/**
 * AR Experience specific error messages
 */
export const getARError = (errorType) => {
  const errors = {
    camera: "We couldn't access your camera. Please make sure camera permissions are enabled and try again.",
    init: "We couldn't start the AR experience. Please refresh the page and try again.",
    target: "Couldn't detect your design. Make sure the design is well-lit and clearly visible.",
    video: "Couldn't play the video. Check your internet connection and try again.",
    library: "AR features aren't loading. Please refresh the page.",
    model: "Couldn't load the AR model. Please try again later.",
    tracking: "Lost tracking of your design. Try moving the camera to a better angle.",
    permission: "Camera permission denied. Please enable camera access in your browser settings."
  };

  return errors[errorType] || errors.init;
};

/**
 * Validation error messages
 */
export const getValidationError = (field, value) => {
  const messages = {
    email: "Please enter a valid email address.",
    password: "Password must be at least 8 characters long.",
    phone: "Please enter a valid phone number.",
    url: "Please enter a valid web address (starting with http:// or https://).",
    required: "This field is required.",
    min: `Value must be at least ${value}.`,
    max: `Value cannot exceed ${value}.`,
    pattern: "The format is not valid."
  };

  return messages[field] || messages.required;
};

export default {
  getUserFriendlyError,
  getFileError,
  getARError,
  getValidationError
};











