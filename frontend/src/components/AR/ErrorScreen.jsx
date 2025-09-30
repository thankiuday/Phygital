/**
 * Error Screen Component
 * Shows error state with retry options
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorScreen = ({ error, onRestartAR, onGoBack }) => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center text-white max-w-md">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold mb-2">AR Experience Error</h2>
        <p className="text-gray-300 mb-6">{error}</p>
        <div className="space-y-3">
          <button
            onClick={onRestartAR}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} />
            Retry AR Experience
          </button>
          <button
            onClick={onGoBack}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
