/**
 * Video Analytics Component
 * Displays video-specific metrics and visualizations
 */

import React from 'react';
import { Video, Clock, PlayCircle, CheckCircle } from 'lucide-react';
import TimeTrendChart from './TimeTrendChart';
import MetricCard from './MetricCard';

const VideoAnalytics = ({ analytics, videoEvents = [], period = '30d' }) => {
  const videoViews = analytics?.videoViews || 0;
  const totalScans = analytics?.totalScans || 0;
  
  // Calculate video metrics
  const completionRate = videoEvents.length > 0
    ? calculateVideoCompletionRate(videoEvents)
    : 0;
  
  const averageWatchTime = videoEvents.length > 0
    ? calculateAverageWatchTime(videoEvents)
    : 0;
  
  const videoToScanRate = totalScans > 0
    ? Math.round((videoViews / totalScans) * 100)
    : 0;
  
  // Prepare time trend data
  const timeTrendData = groupVideoEventsByTime(videoEvents, period);

  return (
    <div className="space-y-6">
      {/* Video Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Video Views"
          value={videoViews}
          icon={Video}
          iconColor="text-neon-green"
          bgColor="bg-green-900/20"
        />
        <MetricCard
          title="Completion Rate"
          value={completionRate}
          formatValue={(val) => `${val}%`}
          icon={CheckCircle}
          iconColor="text-neon-blue"
          bgColor="bg-blue-900/20"
        />
        <MetricCard
          title="Avg Watch Time"
          value={averageWatchTime}
          formatValue={(val) => formatDuration(val)}
          icon={Clock}
          iconColor="text-neon-purple"
          bgColor="bg-purple-900/20"
        />
        <MetricCard
          title="Scan to View Rate"
          value={videoToScanRate}
          formatValue={(val) => `${val}%`}
          icon={PlayCircle}
          iconColor="text-neon-pink"
          bgColor="bg-pink-900/20"
        />
      </div>

      {/* Video Views Trend */}
      {timeTrendData.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Video Views Over Time</h3>
          <TimeTrendChart
            data={timeTrendData}
            dataKey="count"
            nameKey="date"
            type="area"
            height={250}
            colors={['#10b981']}
          />
        </div>
      )}

      {/* Video Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Watch Time Distribution</h3>
          <div className="space-y-3">
            {getWatchTimeDistribution(videoEvents).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{item.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 sm:w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-green to-emerald-500"
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

        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Video Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Total Views</span>
              <span className="text-lg font-bold text-slate-100">{videoViews.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Completed Views</span>
              <span className="text-lg font-bold text-neon-green">
                {Math.round((videoViews * completionRate) / 100).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Average Completion</span>
              <span className="text-lg font-bold text-neon-blue">{completionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const calculateVideoCompletionRate = (videoEvents, threshold = 90) => {
  if (!videoEvents || videoEvents.length === 0) return 0;
  const completed = videoEvents.filter(event => {
    const progress = event.eventData?.videoProgress || 0;
    return progress >= threshold;
  }).length;
  return Math.round((completed / videoEvents.length) * 100);
};

const calculateAverageWatchTime = (videoEvents) => {
  if (!videoEvents || videoEvents.length === 0) return 0;
  const totalWatchTime = videoEvents.reduce((sum, event) => {
    const progress = event.eventData?.videoProgress || 0;
    const duration = event.eventData?.videoDuration || 0;
    return sum + (duration * (progress / 100));
  }, 0);
  return Math.round(totalWatchTime / videoEvents.length);
};

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

const groupVideoEventsByTime = (events, period) => {
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

const getWatchTimeDistribution = (events) => {
  if (!events || events.length === 0) return [];
  
  const distribution = {
    '0-25%': 0,
    '25-50%': 0,
    '50-75%': 0,
    '75-100%': 0
  };

  events.forEach(event => {
    const progress = event.eventData?.videoProgress || 0;
    if (progress < 25) distribution['0-25%']++;
    else if (progress < 50) distribution['25-50%']++;
    else if (progress < 75) distribution['50-75%']++;
    else distribution['75-100%']++;
  });

  const total = events.length;
  return Object.entries(distribution).map(([label, count]) => ({
    label,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  }));
};

export default VideoAnalytics;










