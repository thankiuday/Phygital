import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Upload, QrCode, Video, Share2, Download, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PageTransitionLoader from '../UI/PageTransitionLoader';
import GameLevelProgress from './GameLevelProgress';
import DesignUploadLevel from './Levels/DesignUploadLevel';
import QRPositionLevel from './Levels/QRPositionLevel';
import VideoUploadLevel from './Levels/VideoUploadLevel';
import SocialLinksLevel from './Levels/SocialLinksLevel';
import FinalDesignLevel from './Levels/FinalDesignLevel';
import toast from 'react-hot-toast';

const LevelBasedUpload = ({ onComplete, onSaveToHistory, onReset, forceStartFromLevel1 = false, currentProject = null }) => {
  const { user } = useAuth();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [levelData, setLevelData] = useState({
    design: null,
    qrPosition: null,
    video: null,
    socialLinks: {},
    finalDesign: null
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLevelTransitioning, setIsLevelTransitioning] = useState(false);

  // Scroll to top smoothly whenever level changes with loader
  useEffect(() => {
    // Show loader
    setIsLevelTransitioning(true);
    
    // Scroll to top immediately
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Hide loader after transition
    const timer = setTimeout(() => {
      setIsLevelTransitioning(false);
    }, 500); // 500ms for level transitions
    
    return () => clearTimeout(timer);
  }, [currentLevel]);

  const levels = [
    {
      id: 1,
      name: 'Upload Design',
      icon: Upload,
      color: 'purple',
      component: 'DesignUpload'
    },
    {
      id: 2,
      name: 'Set QR Position',
      icon: QrCode,
      color: 'blue',
      component: 'QRPosition'
    },
    {
      id: 3,
      name: 'Upload Video',
      icon: Video,
      color: 'indigo',
      component: 'VideoUpload'
    },
    {
      id: 4,
      name: 'Add Social Links',
      icon: Share2,
      color: 'green',
      component: 'SocialLinks'
    },
    {
      id: 5,
      name: 'Final Design',
      icon: Sparkles,
      color: 'yellow',
      component: 'FinalDesign'
    }
  ];

  const currentLevelConfig = levels.find(level => level.id === currentLevel) || levels[0];

  // Check if level is completed
  const isLevelCompleted = (levelId, customLevelData = null) => {
    let result = false;
    const dataToCheck = customLevelData || levelData;
    
    // If forcing start from level 1, only check levelData (not user data)
    if (forceStartFromLevel1) {
      switch (levelId) {
        case 1: 
          result = dataToCheck.design !== null && dataToCheck.design !== undefined;
          break;
        case 2: 
          result = dataToCheck.qrPosition !== null && dataToCheck.qrPosition !== undefined;
          break;
        case 3: 
          result = dataToCheck.video !== null && dataToCheck.video !== undefined;
          break;
        case 4: 
          result = dataToCheck.socialLinks && Object.keys(dataToCheck.socialLinks).length > 0;
          break;
        case 5: 
          result = dataToCheck.finalDesign !== null && dataToCheck.finalDesign !== undefined;
          break;
        default: 
          result = false;
      }
    } else {
      // Normal mode - check both levelData and user data
      switch (levelId) {
        case 1: 
          result = (dataToCheck.design !== null && dataToCheck.design !== undefined) || 
                   (user?.uploadedFiles?.design?.url !== null && user?.uploadedFiles?.design?.url !== undefined);
          break;
        case 2: 
          // Check if QR position exists and has valid coordinates
          const hasLevelDataQR = dataToCheck.qrPosition !== null && dataToCheck.qrPosition !== undefined;
          const hasUserQR = user?.qrPosition !== null && user?.qrPosition !== undefined && 
                           (user.qrPosition.x !== 0 || user.qrPosition.y !== 0);
          result = hasLevelDataQR || hasUserQR;
          console.log('Level 2 completion check:', {
            levelDataQrPosition: dataToCheck.qrPosition,
            userQrPosition: user?.qrPosition,
            hasLevelDataQR,
            hasUserQR,
            result
          });
          break;
        case 3: 
          result = (dataToCheck.video !== null && dataToCheck.video !== undefined) || 
                   (user?.uploadedFiles?.video?.url !== null && user?.uploadedFiles?.video?.url !== undefined);
          break;
        case 4: 
          result = (dataToCheck.socialLinks && Object.keys(dataToCheck.socialLinks).length > 0) || 
                   (user?.socialLinks && Object.values(user.socialLinks).some(link => link && link.trim() !== ''));
          break;
        case 5: 
          result = dataToCheck.finalDesign !== null && dataToCheck.finalDesign !== undefined;
          break;
        default: 
          result = false;
      }
    }
    
    console.log(`Level ${levelId} completed:`, result, `(forceStartFromLevel1: ${forceStartFromLevel1})`, `(data:`, dataToCheck, `)`);
    return result;
  };

  // Animate to next level
  const animateToNextLevel = () => {
    console.log('animateToNextLevel called, current level:', currentLevel);
    console.log('Current level data:', levelData);
    console.log('Completed levels:', completedLevels);
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentLevel(prev => {
        const nextLevel = prev + 1;
        console.log('Moving from level', prev, 'to level', nextLevel);
        // Ensure we don't go beyond level 5
        const finalLevel = Math.min(nextLevel, 5);
        console.log('Final level set to:', finalLevel);
        return finalLevel;
      });
      setIsAnimating(false);
    }, 300);
  };

  // Force advance to next level (for debugging)
  const forceAdvanceToNextLevel = () => {
    console.log('Force advancing to next level from:', currentLevel);
    const nextLevel = currentLevel + 1;
    const finalLevel = Math.min(nextLevel, 4);
    console.log('Force setting level to:', finalLevel);
    setCurrentLevel(finalLevel);
  };

  // Animate to previous level
  const animateToPreviousLevel = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentLevel(prev => prev - 1);
      setIsAnimating(false);
    }, 300);
  };

  // Complete current level
  const completeCurrentLevel = (data) => {
    console.log('=== COMPLETE CURRENT LEVEL DEBUG ===');
    console.log('Completing level', currentLevel, 'with data:', data);
    console.log('Current completed levels before:', completedLevels);
    console.log('Current level data before:', levelData);
    console.log('Force start from level 1:', forceStartFromLevel1);
    
    // Create the updated level data
    const updatedLevelData = { ...levelData, ...data };
    console.log('Updated level data (calculated):', updatedLevelData);
    
    // Update level data
    setLevelData(prev => {
      const newData = { ...prev, ...data };
      console.log('Updated level data (state):', newData);
      return newData;
    });
    
    // Update completed levels
    if (!completedLevels.includes(currentLevel)) {
      setCompletedLevels(prev => {
        const newCompleted = [...prev, currentLevel];
        console.log('Updated completed levels:', newCompleted);
        return newCompleted;
      });
    }

    // Check if this is the final level completion (level 5)
    if (currentLevel === 5) {
      console.log('Final level (5) completed, triggering final completion flow');
      handleFinalCompletion();
    } else if (currentLevel < 5) {
      // Auto-advance to next level if not the last level
      console.log('Auto-advancing to next level in 1 second...');
      setTimeout(() => {
        console.log('About to advance to next level from', currentLevel);
        
        // For force start mode, we can be more direct since we know the data is valid
        if (forceStartFromLevel1) {
          console.log('Force start mode - directly advancing to next level');
          const nextLevel = currentLevel + 1;
          const finalLevel = Math.min(nextLevel, 5);
          console.log('Directly setting level to:', finalLevel);
          setCurrentLevel(finalLevel);
        } else {
          // Normal mode - check completion status with updated data
          console.log('Normal mode - checking level completion with updated data');
          const isCompleted = isLevelCompleted(currentLevel, updatedLevelData);
          console.log('Level completion check for level', currentLevel, ':', isCompleted);
          
          if (isCompleted) {
            console.log('Level completion check passed, advancing to next level');
            const nextLevel = currentLevel + 1;
            const finalLevel = Math.min(nextLevel, 4);
            console.log('Directly setting level to:', finalLevel);
            setCurrentLevel(finalLevel);
          } else {
            console.warn('Level completion check failed, not advancing');
            console.log('Updated level data:', updatedLevelData);
            console.log('User data:', user);
          }
        }
      }, 1000);
    }
  };

  // Handle final completion
  const handleFinalCompletion = async () => {
    try {
      console.log('Starting final completion process...');
      
      // Prepare data with project information
      const completionData = {
        ...levelData,
        project: currentProject ? {
          id: currentProject.id,
          name: currentProject.name,
          description: currentProject.description
        } : null
      };
      
      // Save final design to history
      if (onSaveToHistory) {
        console.log('Saving to history with project data:', completionData);
        await onSaveToHistory(completionData);
        console.log('Successfully saved to history');
      }
      
      const projectName = currentProject?.name || 'Your design';
      toast.success(`🎉 Congratulations! "${projectName}" has been saved to history!`);
      
      // Reset the entire flow immediately
      console.log('Resetting levels and completing flow...');
      resetLevels();
      
      if (onComplete) {
        onComplete(completionData);
      }
      
      // Show completion message after a short delay
      setTimeout(() => {
        toast.success('✨ Ready to start a new journey! Click "Start New Journey" to begin again.');
      }, 1000);
      
    } catch (error) {
      console.error('Error saving to history:', error);
      toast.error('Failed to save to history');
    }
  };

  // Reset all levels
  const resetLevels = () => {
    console.log('Resetting all levels to start from level 1');
    setCurrentLevel(1);
    setCompletedLevels([]);
    setLevelData({
      design: null,
      qrPosition: null,
      socialLinks: {},
      finalDesign: null
    });
    
    // Call the onReset callback if provided
    if (onReset) {
      onReset();
    }
  };

  // Debug function to manually set level (for development)
  const setLevel = (level) => {
    if (level >= 1 && level <= 5) {
      console.log('Manually setting level to:', level);
      setCurrentLevel(level);
    } else {
      console.warn('Invalid level:', level, 'Must be between 1 and 5');
    }
  };

  // Initialize level data from existing user data
  useEffect(() => {
    // Get data from current project or fallback to root level (backward compatibility)
    const getProjectOrRootData = () => {
      if (currentProject && user?.projects) {
        const project = user.projects.find(p => p.id === currentProject.id);
        if (project) {
          return {
            design: project.uploadedFiles?.design || null,
            qrPosition: project.qrPosition || null,
            video: project.uploadedFiles?.video || null,
            socialLinks: user.socialLinks || {}, // Social links remain at user level
            source: 'project'
          };
        }
      }
      // Fallback to root-level data
      return {
        design: user?.uploadedFiles?.design || null,
        qrPosition: user?.qrPosition || null,
        video: user?.uploadedFiles?.video || null,
        socialLinks: user?.socialLinks || {},
        source: 'root'
      };
    };
    
    const projectData = getProjectOrRootData();
    
    console.log('LevelBasedUpload initialization:', { 
      hasUser: !!user, 
      forceStartFromLevel1,
      currentProject: currentProject?.id,
      dataSource: projectData.source,
      userData: user ? {
        hasDesign: !!projectData.design?.url,
        hasQRPosition: !!projectData.qrPosition,
        hasVideo: !!projectData.video?.url,
        hasSocialLinks: !!(projectData.socialLinks && Object.values(projectData.socialLinks).some(link => link && link.trim() !== ''))
      } : null
    });
    
    if (user && !forceStartFromLevel1) {
      const existingData = {
        design: projectData.design,
        qrPosition: projectData.qrPosition,
        video: projectData.video,
        socialLinks: projectData.socialLinks,
        finalDesign: null // This will be set when final design is generated
      };
      
      setLevelData(existingData);
      
      // Determine starting level based on existing data
      let startingLevel = 1;
      let completedLevelsArray = [];
      
      // Check each level and determine completion
      if (existingData.design?.url) {
        completedLevelsArray.push(1);
        startingLevel = 2;
      }
      
      if (existingData.qrPosition && (existingData.qrPosition.x !== 0 || existingData.qrPosition.y !== 0)) {
        completedLevelsArray.push(2);
        startingLevel = 3;
      }
      
      if (existingData.video?.url) {
        completedLevelsArray.push(3);
        startingLevel = 4;
      }
      
      if (existingData.socialLinks && Object.values(existingData.socialLinks).some(link => link && link.trim() !== '')) {
        completedLevelsArray.push(4);
        startingLevel = 5;
      }
      
      // Ensure startingLevel is within valid range (1-5)
      startingLevel = Math.max(1, Math.min(startingLevel, 5));
      console.log('Setting starting level to:', startingLevel, 'completed levels:', completedLevelsArray, 'based on user data:', existingData);
      setCurrentLevel(startingLevel);
      setCompletedLevels(completedLevelsArray);
    } else {
      // Force start from level 1 or no user data
      // Note: Don't reset levelData here - it gets updated as user completes levels
      // We only reset the starting level and completed levels
      console.log('Force starting from level 1 - starting fresh but preserving level data');
      setCurrentLevel(1);
      setCompletedLevels([]); // Reset completed levels for fresh start
      // Don't reset levelData - it will be populated as user completes each level
    }
  }, [user, forceStartFromLevel1, currentProject]);

  // Update completed levels when data changes
  useEffect(() => {
    console.log('Updating completed levels - forceStartFromLevel1:', forceStartFromLevel1);
    console.log('Current levelData:', levelData);
    console.log('Current user data:', user);
    
    const newCompletedLevels = [];
    for (let i = 1; i <= 5; i++) { // Check all 5 levels
      const isCompleted = isLevelCompleted(i);
      console.log(`Level ${i} completed:`, isCompleted);
      if (isCompleted) {
        newCompletedLevels.push(i);
      }
    }
    
    console.log('Setting completed levels to:', newCompletedLevels);
    setCompletedLevels(newCompletedLevels);
  }, [levelData, user, forceStartFromLevel1]);

  // Safeguard: Ensure currentLevel never goes beyond 5
  useEffect(() => {
    if (currentLevel > 5) {
      console.warn('Current level was', currentLevel, 'but should not exceed 5. Resetting to 5.');
      setCurrentLevel(5);
    }
  }, [currentLevel]);

  // Add debug functions to window for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.debugLevels = {
        setLevel,
        resetLevels,
        getCurrentLevel: () => currentLevel,
        getCompletedLevels: () => completedLevels,
        getLevelData: () => levelData,
        isLevelCompleted: (level) => isLevelCompleted(level),
        completeLevel: (level) => {
          if (level >= 1 && level <= 5) {
            setCurrentLevel(level);
            console.log('Jumped to level', level);
          }
        },
        forceAdvance: forceAdvanceToNextLevel,
        animateToNext: animateToNextLevel
      };
      console.log('Debug functions available at window.debugLevels');
    }
  }, [currentLevel, completedLevels, levelData]);

  // Render level component
  const renderLevelComponent = () => {
    if (!currentLevelConfig) {
      return <div>Loading...</div>;
    }
    
    const { component } = currentLevelConfig;
    
    switch (component) {
      case 'DesignUpload':
        return (
          <DesignUploadLevel 
            onComplete={(design) => completeCurrentLevel({ design })}
            currentDesign={levelData.design}
            forceStartFromLevel1={forceStartFromLevel1}
          />
        );
      case 'QRPosition':
        console.log('🔧 Rendering QRPosition level with:');
        console.log('  - levelData.design:', levelData.design);
        console.log('  - levelData.design?.url:', levelData.design?.url);
        console.log('  - hasDesign:', !!levelData.design);
        console.log('  - Full levelData:', JSON.stringify(levelData, null, 2));
        return (
          <QRPositionLevel 
            onComplete={(qrPosition) => {
              console.log('=== QRPositionLevel onComplete called ===');
              console.log('Received qrPosition:', qrPosition);
              console.log('Current level:', currentLevel);
              completeCurrentLevel({ qrPosition });
            }}
            currentPosition={levelData.qrPosition}
            designUrl={levelData.design?.url}
            forceStartFromLevel1={forceStartFromLevel1}
          />
        );
      case 'VideoUpload':
        return (
          <VideoUploadLevel 
            onComplete={(video) => completeCurrentLevel({ video })}
            onCancel={() => setCurrentLevel(currentLevel - 1)}
            levelData={levelData}
            user={user}
            forceStartFromLevel1={forceStartFromLevel1}
          />
        );
      case 'SocialLinks':
        return (
          <SocialLinksLevel 
            onComplete={(socialLinks) => completeCurrentLevel({ socialLinks })}
            currentLinks={levelData.socialLinks}
            forceStartFromLevel1={forceStartFromLevel1}
          />
        );
      case 'FinalDesign':
        return (
          <FinalDesignLevel 
            onComplete={(finalDesign) => completeCurrentLevel({ finalDesign })}
            levelData={levelData}
            forceStartFromLevel1={forceStartFromLevel1}
            onStartNewJourney={() => {
              console.log('Starting new journey - resetting to level 1');
              resetLevels();
            }}
          />
        );
      default:
        return <div>Unknown level</div>;
    }
  };

  // Don't render if currentLevelConfig is not available or user is not loaded
  if (!currentLevelConfig || !user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="loading-spinner-lg mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading game levels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Level Transition Loader */}
      <PageTransitionLoader isLoading={isLevelTransitioning} />
      
      {/* Game Progress */}
      <GameLevelProgress 
        currentLevel={currentLevel}
        completedLevels={completedLevels}
        totalLevels={levels.length}
      />

      {/* Level Content */}
      <div className={`
        card-glass rounded-xl shadow-dark-large p-4 md:p-8 transition-all duration-500 transform
        ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
      `}>
        {/* Level Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className={`
            inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full mb-3 md:mb-4
            bg-neon-${currentLevelConfig.color}/20 text-neon-${currentLevelConfig.color}
            transition-all duration-500 transform shadow-glow-${currentLevelConfig.color}
            ${isAnimating ? 'scale-75' : 'scale-100'}
          `}>
            <currentLevelConfig.icon className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2">
            Level {currentLevel}: {currentLevelConfig.name}
          </h2>
          <p className="text-sm md:text-base text-slate-300 px-4">
            {currentLevel === 1 && "Upload your design image to get started"}
            {currentLevel === 2 && "Position your QR code on the design"}
            {currentLevel === 3 && "Upload your video content"}
            {currentLevel === 4 && "Add your social media links"}
            {currentLevel === 5 && "Generate and download your final design"}
          </p>
        </div>

        {/* Level Component */}
        <div className="min-h-[400px]">
          {renderLevelComponent()}
        </div>

        {/* Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-600/30 gap-4 md:gap-0">
          <button
            onClick={animateToPreviousLevel}
            disabled={currentLevel === 1}
            className={`
              flex items-center px-4 py-2 rounded-lg transition-all duration-300 text-sm md:text-base
              ${currentLevel === 1 
                ? 'text-slate-500 cursor-not-allowed' 
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Previous
          </button>

          <div className="text-xs md:text-sm text-slate-400 text-center">
            <div className="hidden md:block">
              {completedLevels.length} of {levels.length} levels completed
              <br />
              <span className="text-xs">
                Current: {currentLevel}, Completed: [{completedLevels.join(', ')}], 
                Level {currentLevel} completed: {isLevelCompleted(currentLevel) ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="md:hidden">
              Level {currentLevel} of {levels.length}
            </div>
          </div>

          <button
            onClick={animateToNextLevel}
            disabled={currentLevel === 5 || !isLevelCompleted(currentLevel)}
            className={`
              flex items-center px-4 md:px-6 py-2 rounded-lg font-medium transition-all duration-300 text-sm md:text-base
              ${currentLevel === 5 || !isLevelCompleted(currentLevel)
                ? 'text-gray-400 cursor-not-allowed'
                : 'btn-primary transform hover:scale-105'
              }
            `}
          >
            Next
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};


export default LevelBasedUpload;
