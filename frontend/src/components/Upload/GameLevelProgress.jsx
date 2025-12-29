import React from 'react';
import { CheckCircle, Circle, Lock } from 'lucide-react';

const GameLevelProgress = ({ currentLevel, completedLevels, totalLevels = 6 }) => {
  const levels = [
    { id: 1, name: 'Upload Design', icon: '🎨', description: 'Upload your design image' },
    { id: 2, name: 'Set QR Position', icon: '📍', description: 'Position your QR code' },
    { id: 3, name: 'Upload Video', icon: '🎥', description: 'Add your video content' },
    { id: 4, name: 'Upload Documents', icon: '📄', description: 'Add your documents' },
    { id: 5, name: 'Add Social Links', icon: '🔗', description: 'Connect your social media' },
    { id: 6, name: 'Final Design', icon: '✨', description: 'Generate your masterpiece' }
  ];

  const getLevelStatus = (levelId) => {
    if (completedLevels.includes(levelId)) return 'completed';
    if (levelId === currentLevel) return 'current';
    if (levelId < currentLevel) return 'unlocked';
    return 'locked';
  };

  const getLevelIcon = (levelId, status) => {
    if (status === 'completed') return <CheckCircle className="w-6 h-6 text-neon-green" />;
    if (status === 'current') return <Circle className="w-6 h-6 text-neon-blue fill-current" />;
    if (status === 'unlocked') return <Circle className="w-6 h-6 text-slate-400" />;
    return <Lock className="w-6 h-6 text-slate-500" />;
  };

  return (
    <div className="card-glass rounded-xl p-4 md:p-6 mb-6 md:mb-8 border border-slate-600/30">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-2">Phygital Creator Journey</h2>
        <p className="text-sm md:text-base text-slate-300">Complete each level to unlock your final design!</p>
      </div>
      
      <div className="relative">
        {/* Progress Line - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-slate-600">
          <div 
            className="h-full bg-button-gradient transition-all duration-1000 ease-out"
            style={{ 
              width: completedLevels.length === 0 
                ? '0%' 
                : completedLevels.length === totalLevels 
                  ? '100%' 
                  : `${(completedLevels.length / totalLevels) * 100}%`
            }}
          />
        </div>
        
        {/* Levels - Responsive grid */}
        <div className="grid grid-cols-2 md:flex md:justify-between md:items-center relative z-10 gap-4 md:gap-0">
          {levels.map((level, index) => {
            const status = getLevelStatus(level.id);
            const isLast = index === levels.length - 1;
            
            return (
              <div key={level.id} className="flex flex-col items-center group">
                {/* Level Circle */}
                <div className={`
                  relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 md:mb-3 transition-all duration-500 transform
                  ${status === 'completed' ? 'bg-neon-green scale-110 shadow-glow-green' : ''}
                  ${status === 'current' ? 'bg-neon-blue scale-110 shadow-glow-blue animate-pulse' : ''}
                  ${status === 'unlocked' ? 'bg-slate-600 hover:bg-slate-500 cursor-pointer' : ''}
                  ${status === 'locked' ? 'bg-slate-700' : ''}
                `}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  ) : status === 'current' ? (
                    <span className="text-lg md:text-2xl">{level.icon}</span>
                  ) : status === 'unlocked' ? (
                    <span className="text-lg md:text-2xl opacity-60">{level.icon}</span>
                  ) : (
                    <Lock className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                  )}
                  
                  {/* Level Number Badge */}
                  <div className={`
                    absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 rounded-full text-xs font-bold flex items-center justify-center
                    ${status === 'completed' ? 'bg-neon-green text-slate-900' : ''}
                    ${status === 'current' ? 'bg-neon-blue text-slate-900 animate-bounce' : ''}
                    ${status === 'unlocked' ? 'bg-slate-500 text-slate-100' : ''}
                    ${status === 'locked' ? 'bg-slate-600 text-slate-300' : ''}
                  `}>
                    {level.id}
                  </div>
                </div>
                
                {/* Level Info */}
                <div className="text-center max-w-20 md:max-w-24">
                  <h3 className={`
                    text-xs md:text-sm font-semibold mb-1 transition-colors duration-300
                    ${status === 'completed' ? 'text-neon-green' : ''}
                    ${status === 'current' ? 'text-neon-blue' : ''}
                    ${status === 'unlocked' ? 'text-slate-300' : ''}
                    ${status === 'locked' ? 'text-slate-500' : ''}
                  `}>
                    {level.name}
                  </h3>
                  <p className={`
                    text-xs transition-colors duration-300 hidden md:block
                    ${status === 'completed' ? 'text-neon-green/80' : ''}
                    ${status === 'current' ? 'text-neon-blue/80' : ''}
                    ${status === 'unlocked' ? 'text-slate-400' : ''}
                    ${status === 'locked' ? 'text-slate-500' : ''}
                  `}>
                    {level.description}
                  </p>
                </div>
                
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Level Progress Stats */}
      <div className="mt-4 md:mt-6 flex justify-center space-x-4 md:space-x-6 text-xs md:text-sm">
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-neon-purple">{completedLevels.length}</div>
          <div className="text-slate-300">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-neon-blue">{currentLevel}</div>
          <div className="text-slate-300">Current</div>
        </div>
        <div className="text-center">
          <div className="text-lg md:text-2xl font-bold text-slate-300">{totalLevels}</div>
          <div className="text-slate-300">Total</div>
        </div>
      </div>
    </div>
  );
};

export default GameLevelProgress;

