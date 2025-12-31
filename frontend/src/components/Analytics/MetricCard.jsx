/**
 * Metric Card Component
 * Displays a single metric with icon, value, trend indicator, and label
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({ 
  title, 
  value, 
  previousValue = null, 
  icon: Icon, 
  iconColor = 'text-neon-blue',
  bgColor = 'bg-slate-800/50',
  trendColor = 'text-neon-green',
  formatValue = (val) => val.toLocaleString(),
  subtitle = null,
  loading = false
}) => {
  const trend = previousValue !== null 
    ? calculateTrend(value, previousValue)
    : null;

  return (
    <div className={`${bgColor} rounded-xl p-4 sm:p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 sm:p-3 rounded-lg ${iconColor.replace('text-', 'bg-').replace('neon-', 'neon-')}/20`}>
          {Icon && <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${
            trend.direction === 'up' ? 'text-neon-green' : 
            trend.direction === 'down' ? 'text-neon-red' : 
            'text-slate-400'
          }`}>
            {trend.direction === 'up' && <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />}
            {trend.direction === 'down' && <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            {trend.direction === 'neutral' && <Minus className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span>{trend.percentage}%</span>
          </div>
        )}
      </div>
      
      <div className="mb-1">
        <h3 className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wide mb-1">
          {title}
        </h3>
        {loading ? (
          <div className="h-8 w-24 bg-slate-700/50 rounded animate-pulse"></div>
        ) : (
          <p className="text-2xl sm:text-3xl font-bold text-slate-100">
            {formatValue(value)}
          </p>
        )}
      </div>
      
      {subtitle && (
        <p className="text-xs text-slate-400 mt-2">
          {subtitle}
        </p>
      )}
    </div>
  );
};

// Helper function to calculate trend
const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) {
    return { percentage: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  };
};

export default MetricCard;










