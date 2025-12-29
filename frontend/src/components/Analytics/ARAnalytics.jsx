/**
 * AR Analytics Component
 * Displays AR-specific metrics and visualizations
 */

import React from 'react';
import { Sparkles, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import TimeTrendChart from './TimeTrendChart';
import MetricCard from './MetricCard';

const ARAnalytics = ({ analytics, arEvents = [], errorEvents = [], period = '30d' }) => {
  const arStarts = analytics?.arExperienceStarts || 0;
  const totalScans = analytics?.totalScans || 0;
  const errors = errorEvents.length;
  
  // Calculate AR metrics
  const arSuccessRate = arStarts > 0
    ? Math.round(((arStarts - errors) / arStarts) * 100)
    : 0;
  
  const scanToARRate = totalScans > 0
    ? Math.round((arStarts / totalScans) * 100)
    : 0;
  
  const averageLoadTime = arEvents.length > 0
    ? calculateAverageLoadTime(arEvents)
    : 0;
  
  // Prepare time trend data
  const arTrendData = groupAREventsByTime(arEvents, period);
  const errorTrendData = groupAREventsByTime(errorEvents, period);

  return (
    <div className="space-y-6">
      {/* AR Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <MetricCard
          title="Success Rate"
          value={arSuccessRate}
          formatValue={(val) => `${val}%`}
          icon={CheckCircle}
          iconColor="text-neon-green"
          bgColor="bg-green-900/20"
        />
        <MetricCard
          title="Scan to AR Rate"
          value={scanToARRate}
          formatValue={(val) => `${val}%`}
          icon={Sparkles}
          iconColor="text-neon-blue"
          bgColor="bg-blue-900/20"
        />
        <MetricCard
          title="Avg Load Time"
          value={averageLoadTime}
          formatValue={(val) => `${val}ms`}
          icon={Clock}
          iconColor="text-neon-orange"
          bgColor="bg-orange-900/20"
        />
      </div>


      {/* Error Analysis */}
      {errors > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-neon-red" />
            <h3 className="text-lg font-semibold text-slate-100">Error Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Total Errors</span>
                <XCircle className="w-5 h-5 text-neon-red" />
              </div>
              <p className="text-2xl font-bold text-neon-red">{errors}</p>
              <p className="text-xs text-slate-400 mt-1">
                {arStarts > 0 ? Math.round((errors / arStarts) * 100) : 0}% error rate
              </p>
            </div>
            {errorTrendData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Error Trend</h4>
                <TimeTrendChart
                  data={errorTrendData}
                  dataKey="count"
                  nameKey="date"
                  type="line"
                  height={150}
                  colors={['#ef4444']}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* AR Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">AR Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Successful Starts</span>
              <span className="text-lg font-bold text-neon-green">
                {(arStarts - errors).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Success Rate</span>
              <span className="text-lg font-bold text-neon-blue">{arSuccessRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Load Time Distribution</h3>
          <div className="space-y-3">
            {getLoadTimeDistribution(arEvents).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{item.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 sm:w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-purple to-neon-pink"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-100 w-12 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const calculateAverageLoadTime = (arEvents) => {
  if (!arEvents || arEvents.length === 0) return 0;
  const totalLoadTime = arEvents.reduce((sum, event) => {
    const loadTime = event.eventData?.loadTime || 0;
    return sum + loadTime;
  }, 0);
  return Math.round(totalLoadTime / arEvents.length);
};

const groupAREventsByTime = (events, period) => {
  if (!events || events.length === 0) return [];
  const grouped = {};
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  events.forEach(event => {
    const date = new Date(event.timestamp);
    if (date < cutoffDate) return;
    const key = date.toISOString().split('T')[0];
    grouped[key] = (grouped[key] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const getLoadTimeDistribution = (events) => {
  if (!events || events.length === 0) return [];
  
  const distribution = {
    '< 1s': 0,
    '1-2s': 0,
    '2-3s': 0,
    '> 3s': 0
  };

  events.forEach(event => {
    const loadTime = event.eventData?.loadTime || 0;
    if (loadTime < 1000) distribution['< 1s']++;
    else if (loadTime < 2000) distribution['1-2s']++;
    else if (loadTime < 3000) distribution['2-3s']++;
    else distribution['> 3s']++;
  });

  const total = events.length;
  return Object.entries(distribution).map(([label, count]) => ({
    label,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  }));
};

export default ARAnalytics;







