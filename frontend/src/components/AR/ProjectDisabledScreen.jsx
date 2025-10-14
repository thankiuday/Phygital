/**
 * Project Disabled Screen Component
 * Displayed when users try to access a disabled AR project
 * Shows Phygital branding and appropriate message
 */

import React from 'react';
import { QrCode, Lock, AlertCircle } from 'lucide-react';

const ProjectDisabledScreen = ({ projectName }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Phygital Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl shadow-glow-lg mb-4">
            <QrCode className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">
            Phygital
          </h1>
          <p className="text-sm text-slate-400">
            Interactive AR Experiences
          </p>
        </div>

        {/* Status Card */}
        <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-6 mb-6">
          <div className="flex flex-col items-center text-center">
            {/* Lock Icon */}
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border-2 border-red-600/30">
              <Lock className="w-8 h-8 text-neon-red" />
            </div>
            
            {/* Message */}
            <h2 className="text-xl font-bold text-slate-100 mb-3">
              Project Currently Unavailable
            </h2>
            
            {projectName && (
              <p className="text-slate-300 mb-4">
                The project <strong className="text-neon-blue">"{projectName}"</strong> has been temporarily disabled by its owner.
              </p>
            )}
            
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30 w-full">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm text-slate-300 mb-2">
                    <strong>Why am I seeing this?</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    The creator has chosen to disable AR scanning for this project. 
                    This could be temporary maintenance, content updates, or the project may have been archived.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/20">
          <p className="text-xs text-slate-400 text-center mb-3">
            If you're the project owner, you can re-enable this project from your Projects page.
          </p>
          <div className="flex justify-center gap-2">
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Go to Homepage
            </a>
            <a
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-white bg-button-gradient hover:shadow-glow rounded-lg transition-all"
            >
              Go to Dashboard
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Powered by <span className="text-gradient font-semibold">Phygital</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectDisabledScreen;

