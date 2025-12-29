/**
 * Device Breakdown Component
 * Displays device and browser distribution charts
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

const DeviceBreakdown = ({ deviceData, browserData, height = 300 }) => {
  const deviceColors = {
    mobile: '#00d4ff',
    desktop: '#a855f7',
    tablet: '#ec4899',
    unknown: '#64748b'
  };

  const deviceChartData = deviceData ? Object.entries(deviceData.breakdown || deviceData)
    .filter(([key]) => key !== 'total' && key !== 'percentages')
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value,
      icon: key === 'mobile' ? Smartphone : key === 'desktop' ? Monitor : Tablet
    }))
    .filter(item => item.value > 0) : [];

  const browserChartData = browserData ? Object.entries(browserData.breakdown || {})
    .map(([key, value]) => ({
      name: formatBrowserName(key),
      value: value
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .filter(item => item.value > 0) : [];

  const COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Device Breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Device Distribution</h3>
        {deviceChartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-slate-400 text-sm">No device data available</p>
          </div>
        ) : (
          <>
            <div className="w-full" style={{ height: `${height}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={deviceColors[entry.name.toLowerCase()] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                    formatter={(value) => [value.toLocaleString(), 'Users']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {deviceChartData.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                    <div className="text-slate-100 font-medium">
                      {item.value.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Browser Breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Browser Distribution</h3>
        {browserChartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-slate-400 text-sm">No browser data available</p>
          </div>
        ) : (
          <>
            <div className="w-full" style={{ height: `${height}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={browserChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {browserChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                    formatter={(value) => [value.toLocaleString(), 'Users']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {browserChartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="text-slate-100 font-medium">
                    {item.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const formatBrowserName = (browser) => {
  const names = {
    chrome: 'Chrome',
    firefox: 'Firefox',
    safari: 'Safari',
    edge: 'Edge',
    opera: 'Opera',
    unknown: 'Unknown'
  };
  return names[browser.toLowerCase()] || browser.charAt(0).toUpperCase() + browser.slice(1);
};

export default DeviceBreakdown;








