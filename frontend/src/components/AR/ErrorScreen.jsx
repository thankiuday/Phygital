/**
 * Error Screen Component
 * Shows error state with retry options
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getUserFriendlyError, getARError } from '../../utils/userFriendlyErrors';

const ErrorScreen = ({ error, onRestartAR, onGoBack }) => {
  // Get user-friendly error message
  let displayError = error;
  
  // Try to detect if it's an AR-specific error
  if (typeof error === 'string') {
    const errorLower = error.toLowerCase();
    if (errorLower.includes('camera')) {
      displayError = getARError('camera');
    } else if (errorLower.includes('permission')) {
      displayError = getARError('permission');
    } else if (errorLower.includes('tracking')) {
      displayError = getARError('tracking');
    } else if (errorLower.includes('video')) {
      displayError = getARError('video');
    } else {
      // Use generic AR error handling
      try {
        displayError = getUserFriendlyError({ message: error }, 'ar');
      } catch (e) {
        displayError = "Something went wrong with the AR experience. Please try again.";
      }
    }
  } else if (error?.message) {
    displayError = getUserFriendlyError(error, 'ar');
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center text-white max-w-md">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold mb-2">Couldn't Load AR Experience</h2>
        <p className="text-gray-300 mb-6">{displayError}</p>
        <div className="space-y-3">
          <button
            onClick={onRestartAR}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw size={20} />
            Try Again
          </button>
          <button
            onClick={onGoBack}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
