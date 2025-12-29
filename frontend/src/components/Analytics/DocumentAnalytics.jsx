/**
 * Document Analytics Component
 * Displays PDF/document view and download metrics
 */

import React from 'react';
import { FileText, Download, Eye, TrendingUp } from 'lucide-react';
import TimeTrendChart from './TimeTrendChart';
import MetricCard from './MetricCard';

const DocumentAnalytics = ({ analytics, documentEvents = [], period = '30d' }) => {
  const documentViews = analytics?.documentViews || 0;
  const documentDownloads = analytics?.documentDownloads || 0;
  const totalScans = analytics?.totalScans || 0;
  
  // Calculate document metrics
  const viewToDownloadRate = documentViews > 0
    ? Math.round((documentDownloads / documentViews) * 100)
    : 0;
  
  const scanToViewRate = totalScans > 0
    ? Math.round((documentViews / totalScans) * 100)
    : 0;
  
  // Prepare time trend data
  const viewTrendData = groupDocumentEventsByTime(documentEvents.filter(e => e.eventType === 'documentView'), period);
  const downloadTrendData = groupDocumentEventsByTime(documentEvents.filter(e => e.eventType === 'documentDownload'), period);

  return (
    <div className="space-y-6">
      {/* Document Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Document Views"
          value={documentViews}
          icon={Eye}
          iconColor="text-neon-blue"
          bgColor="bg-blue-900/20"
        />
        <MetricCard
          title="Downloads"
          value={documentDownloads}
          icon={Download}
          iconColor="text-neon-green"
          bgColor="bg-green-900/20"
        />
        <MetricCard
          title="View to Download Rate"
          value={viewToDownloadRate}
          formatValue={(val) => `${val}%`}
          icon={TrendingUp}
          iconColor="text-neon-purple"
          bgColor="bg-purple-900/20"
        />
        <MetricCard
          title="Scan to View Rate"
          value={scanToViewRate}
          formatValue={(val) => `${val}%`}
          icon={FileText}
          iconColor="text-neon-pink"
          bgColor="bg-pink-900/20"
        />
      </div>

      {/* Document Views Trend */}
      {viewTrendData.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Document Engagement Over Time</h3>
          <TimeTrendChart
            data={[
              {
                date: viewTrendData[0]?.date,
                views: viewTrendData[0]?.count || 0,
                downloads: downloadTrendData[0]?.count || 0
              },
              ...viewTrendData.slice(1).map((item, index) => ({
                date: item.date,
                views: item.count,
                downloads: downloadTrendData[index + 1]?.count || 0
              }))
            ]}
            series={[
              { dataKey: 'views', name: 'Views', color: '#00d4ff' },
              { dataKey: 'downloads', name: 'Downloads', color: '#10b981' }
            ]}
            type="area"
            height={250}
          />
        </div>
      )}

      {/* Document Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Document Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Total Views</span>
              <span className="text-lg font-bold text-slate-100">{documentViews.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Total Downloads</span>
              <span className="text-lg font-bold text-neon-green">
                {documentDownloads.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-sm text-slate-300">Conversion Rate</span>
              <span className="text-lg font-bold text-neon-blue">{viewToDownloadRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Engagement Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Views Only</span>
              <div className="flex items-center gap-3">
                <div className="w-32 sm:w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan"
                    style={{ 
                      width: `${documentViews > 0 ? ((documentViews - documentDownloads) / documentViews) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-100 w-12 text-right">
                  {documentViews - documentDownloads}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Downloaded</span>
              <div className="flex items-center gap-3">
                <div className="w-32 sm:w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-green to-emerald-500"
                    style={{ 
                      width: `${documentViews > 0 ? (documentDownloads / documentViews) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-100 w-12 text-right">
                  {documentDownloads}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function
const groupDocumentEventsByTime = (events, period) => {
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

export default DocumentAnalytics;








