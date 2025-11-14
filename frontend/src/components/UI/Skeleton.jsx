/**
 * Skeleton Loading Component
 * Provides animated loading placeholders for content
 */

import React from 'react';

export const Skeleton = ({ 
  width = '100%', 
  height = '1rem', 
  className = '', 
  variant = 'rectangular',
  animation = 'pulse' 
}) => {
  const baseClasses = 'bg-slate-700/50 rounded';
  
  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 bg-[length:200%_100%]'
  };
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={{ width, height }}
      aria-label="Loading..."
    />
  );
};

export const SkeletonCard = ({ children, className = '' }) => (
  <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 ${className}`}>
    {children}
  </div>
);

export const SkeletonText = ({ lines = 3, lastLineWidth = '70%' }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        height="0.875rem"
        width={index === lines - 1 ? lastLineWidth : '100%'}
      />
    ))}
  </div>
);

export const SkeletonChart = ({ height = '300px' }) => (
  <SkeletonCard>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="120px" height="1.5rem" />
        <Skeleton width="80px" height="1rem" variant="text" />
      </div>
      <Skeleton height={height} className="mt-4" />
    </div>
  </SkeletonCard>
);

export const SkeletonStatCard = () => (
  <SkeletonCard>
    <div className="flex items-center justify-between">
      <div className="space-y-3 flex-1">
        <Skeleton width="100px" height="0.875rem" />
        <Skeleton width="80px" height="2rem" />
        <Skeleton width="120px" height="0.75rem" />
      </div>
      <Skeleton width="48px" height="48px" variant="circular" />
    </div>
  </SkeletonCard>
);

export const SkeletonTable = ({ rows = 5, columns = 3 }) => (
  <SkeletonCard>
    <Skeleton width="150px" height="1.5rem" className="mb-4" />
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-slate-700">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} width="100px" height="1rem" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              width={colIndex === 0 ? '150px' : '80px'} 
              height="1rem" 
            />
          ))}
        </div>
      ))}
    </div>
  </SkeletonCard>
);

export const SkeletonListItem = () => (
  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
    <div className="flex-1 space-y-2">
      <Skeleton width="180px" height="1rem" />
      <Skeleton width="120px" height="0.75rem" />
    </div>
    <Skeleton width="60px" height="1.5rem" />
  </div>
);

export default Skeleton;

