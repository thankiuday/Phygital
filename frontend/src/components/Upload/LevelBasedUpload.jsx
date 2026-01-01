import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Upload, QrCode, Video, Share2, Download, Sparkles, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PageTransitionLoader from '../UI/PageTransitionLoader';
import MindFileGenerationLoader from '../UI/MindFileGenerationLoader';
import HorizontalLevelProgress from './HorizontalLevelProgress';
import DesignUploadLevel from './Levels/DesignUploadLevel';
import QRPositionLevel from './Levels/QRPositionLevel';
import VideoUploadLevel from './Levels/VideoUploadLevel';
import DocumentUploadLevel from './Levels/DocumentUploadLevel';
import SocialLinksLevel from './Levels/SocialLinksLevel';
import FinalDesignLevel from './Levels/FinalDesignLevel';
import toast from 'react-hot-toast';

// Draft storage utility functions
const saveDraft = (projectId, levelData, currentLevel, completedLevels, campaignType = null, projectName = null) => {
  try {
    const draft = {
      projectId: projectId || null,
      projectName: projectName || null,
      levelData: {
        design: levelData.design ? {
          url: levelData.design.url,
          filename: levelData.design.filename,
          originalName: levelData.design.originalName,
          size: levelData.design.size
        } : null,
        qrPosition: levelData.qrPosition || null,
        video: levelData.video ? {
          url: levelData.video.url,
          filename: levelData.video.filename,
          originalName: levelData.video.originalName,
          size: levelData.video.size
        } : null,
        additionalVideos: levelData.additionalVideos || [],
        documents: levelData.documents || [],
        socialLinks: levelData.socialLinks || {},
        finalDesign: null, // Don't save final design in draft
        projectId: levelData.projectId || projectId || null
      },
      currentLevel,
      completedLevels: [...completedLevels],
      timestamp: Date.now(),
      campaignType: campaignType || null
    };
    const draftKey = `phygital_campaign_draft_${projectId || 'new'}`;
    localStorage.setItem(draftKey, JSON.stringify(draft));
    console.log('[Draft] Saved draft for', projectId || 'new campaign');
  } catch (error) {
    console.error('[Draft] Failed to save draft:', error);
  }
};

const loadDraft = (projectId) => {
  try {
    const draftKey = `phygital_campaign_draft_${projectId || 'new'}`;
    const draftStr = localStorage.getItem(draftKey);
    if (!draftStr) return null;
    
    const draft = JSON.parse(draftStr);
    
    // Check if draft is expired (30 days)
    const DRAFT_EXPIRY_DAYS = 30;
    const expiryTime = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - draft.timestamp > expiryTime) {
      console.log('[Draft] Draft expired, removing');
      localStorage.removeItem(draftKey);
      return null;
    }
    
    console.log('[Draft] Loaded draft for', projectId || 'new campaign');
    return draft;
  } catch (error) {
    console.error('[Draft] Failed to load draft:', error);
    return null;
  }
};

const clearDraft = (projectId) => {
  try {
    const draftKey = `phygital_campaign_draft_${projectId || 'new'}`;
    localStorage.removeItem(draftKey);
    console.log('[Draft] Cleared draft for', projectId || 'new campaign');
  } catch (error) {
    console.error('[Draft] Failed to clear draft:', error);
  }
};

const LevelBasedUpload = ({ onComplete, onSaveToHistory, onReset, forceStartFromLevel1 = false, currentProject = null, upgradeMode = false }) => {
  const { user } = useAuth();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [levelData, setLevelData] = useState({
    design: null,
    qrPosition: null,
    video: null,
    additionalVideos: [], // For storing non-primary videos in upgrade mode
    documents: [],
    socialLinks: {},
    finalDesign: null,
    projectId: null
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLevelTransitioning, setIsLevelTransitioning] = useState(false);
  
  // Loader state for AR tracking file generation
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Loader control functions
  const handleLoadingStart = (message) => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const handleLoadingEnd = () => {
    setIsLoading(false);
    setLoadingMessage('');
  };

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
      name: 'Upload Documents',
      icon: FileText,
      color: 'orange',
      component: 'DocumentUpload'
    },
    {
      id: 5,
      name: 'Add Social Links',
      icon: Share2,
      color: 'green',
      component: 'SocialLinks'
    },
    {
      id: 6,
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
    
    // In upgrade mode, Level 1, 2, and 3 must be completed fresh (cannot inherit from user data)
    // But if customLevelData is provided (newly uploaded), we should check that
    if (upgradeMode && (levelId === 1 || levelId === 2 || levelId === 3)) {
      // If customLevelData is provided, check if it has the required data (user just completed this level)
      if (customLevelData) {
        if (levelId === 1) {
          return customLevelData.design !== null && customLevelData.design !== undefined;
        } else if (levelId === 2) {
          return customLevelData.qrPosition !== null && customLevelData.qrPosition !== undefined;
        } else if (levelId === 3) {
          return customLevelData.video !== null && customLevelData.video !== undefined;
        }
      }
      // Otherwise, force Level 1, 2, and 3 to require new completion (cannot use existing user data)
      return false;
    }
    
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
          // Documents are optional, but level must be visited to be complete
          // Only complete if documents array exists in levelData (even if empty, meaning user visited and skipped)
          result = Array.isArray(dataToCheck.documents);
          break;
        case 5: 
          // Check if socialLinks exist and have actual non-empty values
          result = dataToCheck.socialLinks && 
            Object.values(dataToCheck.socialLinks).some(link => {
              if (!link || typeof link !== 'string') return false;
              return link.trim() !== '';
            });
          break;
        case 6: 
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
          // Documents are optional - check if levelData has documents array (even if empty)
          // Level is considered complete if documents array exists in levelData
          // This allows skipping, but user must still visit the level
          const hasLevelDataDocuments = Array.isArray(dataToCheck.documents);
          const hasUserDocuments = Array.isArray(user?.uploadedFiles?.documents);
          result = hasLevelDataDocuments || hasUserDocuments;
          break;
        case 5: 
          // Check if socialLinks exist and have actual non-empty values
          const hasLevelDataSocialLinks = dataToCheck.socialLinks && 
            Object.values(dataToCheck.socialLinks).some(link => {
              if (!link || typeof link !== 'string') return false;
              return link.trim() !== '';
            });
          const hasUserSocialLinks = user?.socialLinks && 
            Object.values(user.socialLinks).some(link => {
              if (!link || typeof link !== 'string') return false;
              return link.trim() !== '';
            });
          result = hasLevelDataSocialLinks || hasUserSocialLinks;
          break;
        case 6: 
          result = dataToCheck.finalDesign !== null && dataToCheck.finalDesign !== undefined;
          break;
        default: 
          result = false;
      }
    }
    
    console.log(`Level ${levelId} completed:`, result, `(forceStartFromLevel1: ${forceStartFromLevel1}, upgradeMode: ${upgradeMode})`, `(data:`, dataToCheck, `)`);
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
        // Ensure we don't go beyond level 6
        const finalLevel = Math.min(nextLevel, 6);
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
    
    // Create the updated level data
    const updatedLevelData = { ...levelData, ...data };
    
    // Update level data
    setLevelData(prev => {
      const newData = { ...prev, ...data };
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

    // Check if this is the final level completion (level 6)
    if (currentLevel === 6) {
      console.log('Final level (6) completed, triggering final completion flow');
      handleFinalCompletion();
    } else if (currentLevel < 6) {
      // Auto-advance to next level if not the last level
      console.log('Auto-advancing to next level in 1 second...');
      setTimeout(() => {
        console.log('About to advance to next level from', currentLevel);
        
        // For force start mode, we can be more direct since we know the data is valid
        if (forceStartFromLevel1) {
          console.log('Force start mode - directly advancing to next level');
          const nextLevel = currentLevel + 1;
          const finalLevel = Math.min(nextLevel, 6);
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
            const finalLevel = Math.min(nextLevel, 6);
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
      
      // Clear draft when campaign is complete
      const projectId = currentProject?.id || levelData.projectId || null;
      if (projectId) {
        clearDraft(projectId);
        console.log('[Draft] Cleared draft after campaign completion');
      }
      
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
      video: null,
      documents: [],
      socialLinks: {},
      finalDesign: null,
      projectId: null
    });
    
    // Call the onReset callback if provided
    if (onReset) {
      onReset();
    }
  };

  // Debug function to manually set level (for development)
  const setLevel = (level) => {
    if (level >= 1 && level <= 6) {
      console.log('Manually setting level to:', level);
      setCurrentLevel(level);
    } else {
      console.warn('Invalid level:', level, 'Must be between 1 and 6');
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
            videos: project.uploadedFiles?.videos || [], // Array of videos for upgrade mode
            documents: project.uploadedFiles?.documents || [],
            socialLinks: project.socialLinks || user.socialLinks || {}, // Use project socialLinks if available
            source: 'project'
          };
        }
      }
      // Fallback to root-level data
      return {
        design: user?.uploadedFiles?.design || null,
        qrPosition: user?.qrPosition || null,
        video: user?.uploadedFiles?.video || null,
        videos: user?.uploadedFiles?.videos || [], // Array of videos for upgrade mode
        documents: user?.uploadedFiles?.documents || [],
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
    
    // FIRST: Always check for draft data when forceStartFromLevel1 is false
    // Draft data takes precedence because it represents the current in-progress state
    if (!forceStartFromLevel1) {
      const draftProjectId = currentProject?.id || null;
      const draft = loadDraft(draftProjectId);
      if (draft && draft.levelData) {
        console.log('[Draft] Loading draft data (taking precedence over project data):', draft);
        setLevelData(draft.levelData);
        setCurrentLevel(draft.currentLevel || 1);
        setCompletedLevels(draft.completedLevels || []);
        toast.success('📝 Resuming from saved draft');
        return; // Exit early - draft data loaded, don't proceed with other initialization
      }
    }
    
    if (user && !forceStartFromLevel1) {
      const existingData = {
        design: projectData.design,
        qrPosition: projectData.qrPosition,
        video: projectData.video,
        videos: projectData.videos || [], // Store videos array for upgrade mode
        additionalVideos: [], // Will be populated in VideoUploadLevel if multiple videos
        documents: projectData.documents || [],
        socialLinks: projectData.socialLinks,
        finalDesign: null, // This will be set when final design is generated
        projectId: currentProject?.id || null
      };
      
      setLevelData(existingData);
      
      // Determine starting level based on existing data
      let startingLevel = 1;
      let completedLevelsArray = [];
      
      // In upgrade mode, Level 1 and 2 are never marked as completed (user must complete them fresh)
      if (upgradeMode) {
        // Don't mark Level 1 and 2 as completed even if data exists
        // Start from Level 1
        startingLevel = 1;
        completedLevelsArray = [];
        
        // Level 3+ can inherit data in upgrade mode
        if (existingData.video?.url) {
          completedLevelsArray.push(3);
          // Only mark documents as complete if we've reached level 4 (after video level)
          // Don't pre-emptively mark it as complete
        }
        
        // Documents level should NOT be auto-completed - user must visit it
        // It's optional, but they still need to visit the level to skip or upload
        
        if (existingData.socialLinks && Object.values(existingData.socialLinks).some(link => link && link.trim() !== '')) {
          completedLevelsArray.push(5);
        }
      } else {
        // Normal mode - check each level and determine completion
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
          // Don't auto-advance to documents level - user must visit it explicitly
          // Documents level should be locked until user reaches it
        }
        
        // Documents level should NOT be auto-completed - user must visit it
        // It's optional, but they still need to visit the level to skip or upload
        // Never auto-advance to level 4 - let user progress naturally
        
        if (existingData.socialLinks && Object.values(existingData.socialLinks).some(link => link && link.trim() !== '')) {
          completedLevelsArray.push(5);
          startingLevel = 6;
        }
      }
      
      // Ensure startingLevel is within valid range (1-6)
      startingLevel = Math.max(1, Math.min(startingLevel, 6));
      console.log('Setting starting level to:', startingLevel, 'completed levels:', completedLevelsArray, 'based on user data:', existingData);
      setCurrentLevel(startingLevel);
      setCompletedLevels(completedLevelsArray);
    } else {
      // No user data or forceStartFromLevel1 is true
      // Draft was already checked above, so if we get here, either:
      // 1. forceStartFromLevel1 is true (no draft check needed - starting fresh)
      // 2. forceStartFromLevel1 is false but no draft found (fallback to fresh start)
      
      if (forceStartFromLevel1) {
        console.log('Force starting from level 1 - starting fresh but preserving level data');
        setCurrentLevel(1);
        setCompletedLevels([]); // Reset completed levels for fresh start
        // Don't reset levelData - it will be populated as user completes each level
      } else {
        // No draft and not forcing start - initialize with empty state
        console.log('Starting fresh - no draft found and not forcing level 1');
        setCurrentLevel(1);
        setCompletedLevels([]);
      }
    }
  }, [user, forceStartFromLevel1, currentProject, upgradeMode]);

  // Update completed levels when data changes
  useEffect(() => {
    console.log('Updating completed levels - forceStartFromLevel1:', forceStartFromLevel1, 'upgradeMode:', upgradeMode);
    console.log('Current levelData:', levelData);
    console.log('Current user data:', user);
    
    const newCompletedLevels = [];
    for (let i = 1; i <= 6; i++) { // Check all 6 levels
      const isCompleted = isLevelCompleted(i);
      console.log(`Level ${i} completed:`, isCompleted, `(forceStartFromLevel1: ${forceStartFromLevel1}, upgradeMode: ${upgradeMode})`);
      if (isCompleted) {
        newCompletedLevels.push(i);
      }
    }
    
    console.log('Setting completed levels to:', newCompletedLevels);
    setCompletedLevels(newCompletedLevels);
  }, [levelData, user, forceStartFromLevel1, upgradeMode]);

  // Safeguard: Ensure currentLevel never goes beyond 6
  useEffect(() => {
    if (currentLevel > 6) {
      console.warn('Current level was', currentLevel, 'but should not exceed 6. Resetting to 6.');
      setCurrentLevel(6);
    }
  }, [currentLevel]);

  // Save draft whenever levelData, currentLevel, or completedLevels changes
  useEffect(() => {
    // Don't save draft if we're in the middle of resetting or completing
    if (isAnimating || isLevelTransitioning) return;
    
    // Don't save empty drafts (no data at all)
    const hasAnyData = levelData.design || levelData.qrPosition || levelData.video || 
                       (levelData.documents && levelData.documents.length > 0) ||
                       (levelData.socialLinks && Object.values(levelData.socialLinks).some(link => link && link.trim() !== ''));
    
    if (hasAnyData || currentLevel > 1 || completedLevels.length > 0) {
      const projectId = currentProject?.id || levelData.projectId || null;
      const projectName = currentProject?.name || null;
      const campaignType = currentProject?.campaignType || null;
      
      saveDraft(projectId, levelData, currentLevel, completedLevels, campaignType, projectName);
    }
  }, [levelData, currentLevel, completedLevels, currentProject, isAnimating, isLevelTransitioning]);

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
          if (level >= 1 && level <= 6) {
            setCurrentLevel(level);
            console.log('Jumped to level', level);
          }
        },
        forceAdvance: forceAdvanceToNextLevel,
        animateToNext: animateToNextLevel
      };
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
            upgradeMode={upgradeMode}
          />
        );
      case 'QRPosition':
        return (
          <QRPositionLevel 
            onComplete={(qrPosition) => {
              completeCurrentLevel({ qrPosition });
            }}
            currentPosition={levelData.qrPosition}
            designUrl={levelData.design?.url}
            forceStartFromLevel1={forceStartFromLevel1}
            upgradeMode={upgradeMode}
            onLoadingStart={handleLoadingStart}
            onLoadingEnd={handleLoadingEnd}
          />
        );
      case 'VideoUpload':
        return (
          <VideoUploadLevel 
            onComplete={(data) => {
              // Handle both single video and video selection with additional videos
              if (data.video && data.additionalVideos !== undefined) {
                completeCurrentLevel({ video: data.video, additionalVideos: data.additionalVideos });
              } else if (data.video) {
                completeCurrentLevel({ video: data.video });
              } else {
                completeCurrentLevel(data);
              }
            }}
            onCancel={() => setCurrentLevel(currentLevel - 1)}
            levelData={levelData}
            user={user}
            forceStartFromLevel1={forceStartFromLevel1}
            upgradeMode={upgradeMode}
          />
        );
      case 'DocumentUpload':
        return (
          <DocumentUploadLevel 
            onComplete={(documents) => completeCurrentLevel({ documents: documents.documents || [] })}
            onCancel={() => setCurrentLevel(currentLevel - 1)}
            levelData={{
              ...levelData,
              projectId: currentProject?.id || levelData?.projectId || null
            }}
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
            upgradeMode={upgradeMode}
          />
        );
      case 'FinalDesign':
        return (
          <FinalDesignLevel 
            onComplete={(finalDesign) => completeCurrentLevel({ finalDesign })}
            levelData={{
              ...levelData,
              projectId: currentProject?.id || levelData?.projectId || null
            }}
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
      
      {/* AR Tracking File Generation Loader */}
      <MindFileGenerationLoader isLoading={isLoading} message={loadingMessage} />
      
      {/* Horizontal Progress */}
      <HorizontalLevelProgress 
        currentLevel={currentLevel}
        completedLevels={completedLevels}
        totalLevels={levels.length}
      />

      {/* Level Content */}
      <div className={`
        card-glass rounded-xl shadow-dark-large p-4 md:p-8 transition-all duration-500 transform
        ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
      `}>
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
            disabled={currentLevel === 6 || !isLevelCompleted(currentLevel)}
            className={`
              flex items-center px-4 md:px-6 py-2 rounded-lg font-medium transition-all duration-300 text-sm md:text-base
              ${currentLevel === 6 || !isLevelCompleted(currentLevel)
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
