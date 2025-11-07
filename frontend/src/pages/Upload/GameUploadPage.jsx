import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import { uploadAPI } from '../../utils/api';
import LevelBasedUpload from '../../components/Upload/LevelBasedUpload';
import ProjectNameInput from '../../components/Upload/ProjectNameInput';
import toast from 'react-hot-toast';
import { 
  Upload, 
  Image, 
  QrCode, 
  Share2, 
  Download,
  Gamepad2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Video
} from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const GameUploadPage = () => {
  const { user, updateUser } = useAuth();
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [showGameMode, setShowGameMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [forceStartFromLevel1, setForceStartFromLevel1] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  // Handle completion of the game-like flow
  const handleGameCompletion = async (levelData) => {
    try {
      console.log('Game completion triggered with data:', levelData);
      
      // Save final design to history
      await uploadAPI.downloadFinalDesign();
      
      toast.success('🎉 Congratulations! Your final design has been saved to history!');
      
      // Reset the page after a delay
      setTimeout(() => {
        setShowGameMode(false);
        setForceStartFromLevel1(false);
        console.log('Journey completed - ready for new journey');
      }, 3000);
    } catch (error) {
      console.error('Error saving to history:', error);
      toast.error('Failed to save to history');
    }
  };

  // Save to history function
  const saveToHistory = async (levelData) => {
    try {
      // This will be called when the final design is completed
      // The actual saving happens in the backend when downloadFinalDesign is called
      console.log('Saving to history:', levelData);
    } catch (error) {
      console.error('Error saving to history:', error);
      throw error;
    }
  };

  // Determine if user has completed the journey
  const hasCompletedJourney = () => {
    return !!(
      user?.uploadedFiles?.design?.url &&
      user?.qrPosition &&
      user?.uploadedFiles?.video?.url &&
      user?.socialLinks &&
      Object.values(user.socialLinks).some(link => link)
    );
  };

  // Handle project creation
  const handleProjectCreated = (projectData) => {
    console.log('Project created:', projectData);
    setCurrentProject(projectData);
    setShowProjectInput(false);
    setShowGameMode(true);
    setForceStartFromLevel1(true); // Always start fresh with new project
  };

  // Handle project input cancellation
  const handleProjectCancel = () => {
    setShowProjectInput(false);
  };

  // Start journey with proper logic
  const startJourney = (forceFresh = false) => {
    console.log('Starting journey:', { forceFresh, hasCompletedJourney: hasCompletedJourney() });
    
    // Always show project input first for new journeys
    if (forceFresh || hasCompletedJourney() || !currentProject) {
      setShowProjectInput(true);
      return;
    }
    
    // If we have a current project, start the game mode
    if (forceFresh || hasCompletedJourney()) {
      setForceStartFromLevel1(true);
      console.log('Starting fresh journey from level 1');
    } else {
      setForceStartFromLevel1(false);
      console.log('Continuing journey from current progress');
    }
    
    setShowGameMode(true);
  };

  // Show project input page
  if (showProjectInput) {
    return (
      <ProjectNameInput 
        onProjectCreated={handleProjectCreated}
        onCancel={handleProjectCancel}
      />
    );
  }

  // Show game mode
  if (showGameMode) {
    return (
      <div className="min-h-screen bg-dark-mesh">
        <LevelBasedUpload 
          onComplete={handleGameCompletion}
          onSaveToHistory={saveToHistory}
          forceStartFromLevel1={forceStartFromLevel1}
          currentProject={currentProject}
          onReset={() => {
            setForceStartFromLevel1(false);
            setShowGameMode(false);
            setCurrentProject(null);
            console.log('Journey completed and reset - ready for new journey');
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-button-gradient mb-6 shadow-glow-purple">
          <Gamepad2 className="w-10 h-10 text-slate-100" />
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 mb-4">
          🎮 Phygital Creator
        </h1>
        
        {/* Animated Tagline */}
        <div className="mb-4 relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink blur-lg opacity-40 animate-pulse"></div>
          <div className="relative px-6 py-3 bg-gradient-to-r from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-neon-purple/30 rounded-xl overflow-hidden group hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <p className="text-lg sm:text-xl font-bold relative">
              <span className="text-gradient bg-gradient-to-r from-neon-blue to-neon-cyan bg-clip-text text-transparent">
                Your Vision
              </span>
              <span className="mx-2 text-slate-400">•</span>
              <span className="text-gradient bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
                Our Innovation
              </span>
            </p>
          </div>
        </div>
        
        <p className="text-xl text-slate-300 mb-2">
          Upload your design → Add your story → Publish to the world → Watch your audience connect.
        </p>
        <p className="text-base text-slate-400 mb-8">
          Transform your designs into interactive experiences with QR codes!
        </p>
        
        {/* Current Project Display */}
        {currentProject && (
          <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-neon-green/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-neon-green rounded-full flex items-center justify-center shadow-glow-green">
                <CheckCircle className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">Current Project:</p>
                <p className="text-lg font-bold text-slate-100">{currentProject.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Mode Introduction */}
      <div className="card-glass rounded-2xl shadow-dark-large p-8 mb-8 border border-slate-600/30">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">
            🚀 Ready to Start Your Journey?
          </h2>
          <p className="text-slate-300 text-lg">
            Complete 5 exciting levels to create your masterpiece!
          </p>
        </div>

        {/* Level Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-600/30 hover:border-neon-purple/50 transition-all duration-300">
            <div className="w-10 h-10 bg-neon-purple rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-purple">
              <Image className="w-5 h-5 text-slate-900" />
            </div>
            <h3 className="font-semibold text-slate-100 mb-1 text-sm">Level 1</h3>
            <p className="text-xs text-slate-300">Upload Design</p>
          </div>
          
          <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-600/30 hover:border-neon-blue/50 transition-all duration-300">
            <div className="w-10 h-10 bg-neon-blue rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-blue">
              <QrCode className="w-5 h-5 text-slate-900" />
            </div>
            <h3 className="font-semibold text-slate-100 mb-1 text-sm">Level 2</h3>
            <p className="text-xs text-slate-300">Set QR Position</p>
          </div>
          
          <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-600/30 hover:border-neon-indigo/50 transition-all duration-300">
            <div className="w-10 h-10 bg-neon-indigo rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-indigo">
              <Video className="w-5 h-5 text-slate-900" />
            </div>
            <h3 className="font-semibold text-slate-100 mb-1 text-sm">Level 3</h3>
            <p className="text-xs text-slate-300">Upload Video</p>
          </div>
          
          <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-600/30 hover:border-neon-green/50 transition-all duration-300">
            <div className="w-10 h-10 bg-neon-green rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-green">
              <Share2 className="w-5 h-5 text-slate-900" />
            </div>
            <h3 className="font-semibold text-slate-100 mb-1 text-sm">Level 4</h3>
            <p className="text-xs text-slate-300">Add Social Links</p>
          </div>
          
          <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-600/30 hover:border-neon-orange/50 transition-all duration-300">
            <div className="w-10 h-10 bg-neon-orange rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-orange">
              <Sparkles className="w-5 h-5 text-slate-900" />
            </div>
            <h3 className="font-semibold text-slate-100 mb-1 text-sm">Level 5</h3>
            <p className="text-xs text-slate-300">Final Design</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4">
            <div className="w-8 h-8 bg-neon-green/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-green">
              <CheckCircle className="w-5 h-5 text-neon-green" />
            </div>
            <h4 className="font-semibold text-slate-100 mb-2">Guided Experience</h4>
            <p className="text-sm text-slate-300">Step-by-step guidance through each level</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-8 h-8 bg-neon-blue/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-blue">
              <Sparkles className="w-5 h-5 text-neon-blue" />
            </div>
            <h4 className="font-semibold text-slate-100 mb-2">Auto-Save</h4>
            <p className="text-sm text-slate-300">Your progress is automatically saved</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-8 h-8 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow-purple">
              <Download className="w-5 h-5 text-neon-purple" />
            </div>
            <h4 className="font-semibold text-slate-100 mb-2">History Tracking</h4>
            <p className="text-sm text-slate-300">All designs saved to your history</p>
          </div>
        </div>

        {/* Start Buttons */}
        <div className="text-center space-y-4">
          <button
            onClick={() => startJourney(false)}
            className="btn-primary inline-flex items-center px-8 py-4 font-semibold rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Gamepad2 className="w-6 h-6 mr-3" />
            {currentProject ? 'Continue Campaign' : 'Start New Campaign'}
            <Sparkles className="w-6 h-6 ml-3" />
          </button>
          
          {user?.uploadedFiles?.design?.url && !hasCompletedJourney() && (
            <div>
              <p className="text-sm text-slate-300 mb-2">Want to start over? Start fresh:</p>
              <button
                onClick={() => startJourney(true)}
                className="btn-primary inline-flex items-center px-6 py-3 font-medium rounded-lg transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Fresh Journey
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default GameUploadPage;
