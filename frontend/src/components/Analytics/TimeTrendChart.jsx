/**
 * Time Trend Chart Component
 * Displays time-based trends using Recharts
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const TimeTrendChart = ({ 
  data, 
  dataKey = 'count',
  nameKey = 'date',
  series = [],
  type = 'line',
  height = 300,
  colors = ['#00d4ff', '#a855f7', '#ec4899'],
  showGrid = true,
  showLegend = true
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // If data is an array of objects with date and count, use directly
    if (Array.isArray(data) && data[0] && typeof data[0] === 'object' && 'date' in data[0]) {
      return data.map(item => ({
        ...item,
        date: formatDate(item.date || item[nameKey])
      }));
    }
    
    // Otherwise, map using nameKey
    return data.map(item => ({
      ...item,
      date: formatDate(item[nameKey])
    }));
  }, [data, nameKey]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-800/30 rounded-lg border border-slate-600/30">
        <p className="text-slate-400 text-sm">No data available</p>
      </div>
    );
  }

  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#475569" 
              opacity={0.3}
            />
          )}
          <XAxis 
            dataKey="date"
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            labelStyle={{ color: '#cbd5e1' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }}
              iconType="line"
            />
          )}
          {series && Array.isArray(series) && series.length > 0 ? (
            series.map((serie, index) => {
              // Handle both object format { dataKey, name, color } and simple format
              const serieDataKey = typeof serie === 'object' && serie.dataKey ? serie.dataKey : (typeof serie === 'string' ? serie : dataKey);
              const serieName = typeof serie === 'object' && serie.name ? serie.name : serieDataKey;
              const serieColor = typeof serie === 'object' && serie.color ? serie.color : colors[index % colors.length];
              
              return (
                <DataComponent
                  key={serieDataKey || index}
                  type="monotone"
                  dataKey={serieDataKey}
                  name={serieName}
                  stroke={serieColor}
                  fill={serieColor}
                  fillOpacity={type === 'area' ? 0.2 : 0}
                  strokeWidth={2}
                  dot={{ r: 3, fill: serieColor }}
                  activeDot={{ r: 5 }}
                />
              );
            })
          ) : (
            <DataComponent
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={type === 'area' ? 0.2 : 0}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[0] }}
              activeDot={{ r: 5 }}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (dateString.includes(':')) {
      // Hour format
      return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

export default TimeTrendChart;

