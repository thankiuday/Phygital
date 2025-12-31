/**
 * Engagement Funnel Component
 * Visualizes conversion funnel with step-by-step engagement tracking
 */

import React from 'react';
import { TrendingDown, ArrowDown } from 'lucide-react';

const EngagementFunnel = ({ steps, height = 400 }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-800/30 rounded-lg border border-slate-600/30">
        <p className="text-slate-400 text-sm">No funnel data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...steps.map(s => s.value || 0));

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const widthPercentage = step.value > 0 && maxValue > 0 
          ? (step.value / maxValue) * 100 
          : 0;
        const isLast = index === steps.length - 1;
        const nextStep = !isLast ? steps[index + 1] : null;
        const conversionRate = nextStep && step.value > 0
          ? Math.round((nextStep.value / step.value) * 100)
          : null;

        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-300 w-32 sm:w-40">
                  {step.step}
                </span>
                <span className="text-lg font-bold text-slate-100">
                  {step.value.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-400">
                  {step.percentage}%
                </span>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full h-8 sm:h-10 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-600/30">
                <div
                  className={`h-full rounded-lg transition-all duration-500 ${
                    index === 0 ? 'bg-gradient-to-r from-neon-blue to-neon-cyan' :
                    index === 1 ? 'bg-gradient-to-r from-neon-purple to-neon-pink' :
                    index === 2 ? 'bg-gradient-to-r from-neon-green to-emerald-500' :
                    index === 3 ? 'bg-gradient-to-r from-neon-orange to-amber-500' :
                    'bg-gradient-to-r from-slate-600 to-slate-500'
                  }`}
                  style={{ width: `${widthPercentage}%` }}
                />
              </div>
            </div>

            {!isLast && conversionRate !== null && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
                <ArrowDown className="w-4 h-4" />
                <span>{conversionRate}% conversion</span>
                <TrendingDown className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EngagementFunnel;










