/**
 * Link Performance Chart Component
 * Displays social link performance comparison
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Instagram, Facebook, Twitter, Linkedin, Globe, Phone, MessageCircle } from 'lucide-react';

const LinkPerformanceChart = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-800/30 rounded-lg border border-slate-600/30">
        <p className="text-slate-400 text-sm">No link performance data available</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    label: getLinkLabel(item.linkType),
    icon: getLinkIcon(item.linkType)
  }));

  const colors = {
    instagram: '#E4405F',
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    linkedin: '#0A66C2',
    website: '#00d4ff',
    contactNumber: '#10b981',
    whatsappNumber: '#25D366',
    default: '#a855f7'
  };

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#475569" 
            opacity={0.3}
          />
          <XAxis 
            type="number"
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis 
            type="category"
            dataKey="label"
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#94a3b8' }}
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            labelStyle={{ color: '#cbd5e1' }}
            formatter={(value) => [value.toLocaleString(), 'Clicks']}
          />
          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[entry.linkType] || colors.default}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {chartData.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center gap-2 text-xs text-slate-300">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors[item.linkType] || colors.default }}
              />
              {Icon && <Icon className="w-3 h-3" />}
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getLinkLabel = (linkType) => {
  const labels = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    twitter: 'Twitter',
    linkedin: 'LinkedIn',
    website: 'Website',
    contactNumber: 'Phone',
    whatsappNumber: 'WhatsApp',
    default: 'Other'
  };
  return labels[linkType] || linkType.charAt(0).toUpperCase() + linkType.slice(1);
};

const getLinkIcon = (linkType) => {
  const icons = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    website: Globe,
    contactNumber: Phone,
    whatsappNumber: MessageCircle
  };
  return icons[linkType] || Globe;
};

export default LinkPerformanceChart;








