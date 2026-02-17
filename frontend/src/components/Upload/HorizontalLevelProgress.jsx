import React from 'react';
import { CheckCircle, Circle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isFreePlan } from '../../utils/planUtils';

const HorizontalLevelProgress = ({ currentLevel, completedLevels, totalLevels = 6 }) => {
  const { user } = useAuth();
  const isFree = isFreePlan(user);
  const levels = [
    { id: 1, name: 'Design', icon: '🎨' },
    { id: 2, name: 'QR', icon: '📍' },
    { id: 3, name: 'Video', icon: '🎥' },
    { id: 4, name: 'Documents', icon: '📄' },
    { id: 5, name: 'Social', icon: '🔗' },
    { id: 6, name: 'Final', icon: '✨' }
  ];

  const getLevelStatus = (levelId) => {
    if (completedLevels.includes(levelId)) return 'completed';
    if (levelId === currentLevel) return 'current';
    if (levelId < currentLevel) return 'unlocked';
    return 'locked';
  };

  // Calculate progress based on current level position
  const getProgressWidth = () => {
    if (completedLevels.length === 0) return '0%';
    
    // For completed levels, fill to the next checkpoint
    if (completedLevels.length === totalLevels) {
      return '100%';
    }
    
    // Calculate progress to reach the center of the current level
    const currentLevelIndex = currentLevel - 1; // Convert to 0-based index
    const progressToCurrentLevel = (currentLevelIndex / (totalLevels - 1)) * 100;
    
    return `${progressToCurrentLevel}%`;
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-slate-600/30">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <span className="text-base font-semibold text-slate-100">Creator Journey</span>
            <span className="text-sm text-slate-400">Level {currentLevel}</span>
          </div>
          <div className="text-sm text-slate-300 font-medium">
            {completedLevels.length}/{totalLevels}
          </div>
        </div>
        <p className="text-xs text-slate-400 italic">
          Upload your design → Position QR code → Add video → Upload documents → Connect social links → Generate final design
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-4">
        {/* Background Progress Line */}
        <div className="absolute top-4 left-4 right-4 h-3 bg-slate-700 rounded-full"></div>
        
        {/* Progress Fill */}
        <div 
          className="absolute top-4 left-4 h-3 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink rounded-full transition-all duration-1000 ease-out"
          style={{ width: getProgressWidth() }}
        />
        
        {/* Level Indicators */}
        <div className="flex justify-between relative z-10 px-4">
          {levels.map((level, index) => {
            const status = getLevelStatus(level.id);
            // Check if level is premium and user is on free plan
            const isPremiumLevel = isFree && (level.id === 3 || level.id === 6); // Level 3 (Video) and Level 6 (AR)
            const isDisabled = isPremiumLevel && status !== 'completed';
            
            return (
              <div
                key={level.id}
                className="flex flex-col items-center"
              >
                {/* Level Circle */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 transform border-2 mb-2
                  ${status === 'completed' ? 'bg-neon-green border-neon-green scale-110 shadow-glow-green' : ''}
                  ${status === 'current' && !isDisabled ? 'bg-neon-blue border-neon-blue scale-110 shadow-glow-blue animate-pulse' : ''}
                  ${status === 'current' && isDisabled ? 'bg-slate-600 border-amber-500 scale-110' : ''}
                  ${status === 'unlocked' && !isDisabled ? 'bg-slate-500 border-slate-500 hover:bg-slate-400 hover:border-slate-400 cursor-pointer' : ''}
                  ${status === 'unlocked' && isDisabled ? 'bg-slate-600 border-amber-500 opacity-60' : ''}
                  ${status === 'locked' ? 'bg-slate-600 border-slate-600' : ''}
                `}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : isDisabled ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : status === 'current' ? (
                    <span className="text-sm">{level.icon}</span>
                  ) : status === 'unlocked' ? (
                    <span className="text-sm opacity-60">{level.icon}</span>
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level Names */}
      <div className="flex justify-between text-sm">
        {levels.map((level) => {
          const status = getLevelStatus(level.id);
          const isPremiumLevel = isFree && (level.id === 3 || level.id === 6);
          const isDisabled = isPremiumLevel && status !== 'completed';
          
          return (
            <div
              key={level.id}
              className={`
                transition-colors duration-300 text-center font-medium
                ${status === 'completed' ? 'text-neon-green' : ''}
                ${status === 'current' && !isDisabled ? 'text-neon-blue' : ''}
                ${status === 'current' && isDisabled ? 'text-amber-400' : ''}
                ${status === 'unlocked' && !isDisabled ? 'text-slate-300' : ''}
                ${status === 'unlocked' && isDisabled ? 'text-amber-400' : ''}
                ${status === 'locked' ? 'text-slate-500' : ''}
              `}
            >
              {level.name}
              {isDisabled && <span className="block text-xs text-amber-400 mt-1">🔒 Premium</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HorizontalLevelProgress;
