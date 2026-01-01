/**
 * Campaign Type Dropdown Component
 * Responsive dropdown for filtering analytics by campaign type
 */

import React, { useState } from 'react';
import { QrCode, Link as LinkIcon, Video, FileText, Sparkles, ChevronDown } from 'lucide-react';
import { getCampaignTypeDisplayName } from '../../utils/campaignTypeNames';

const CAMPAIGN_TYPES = [
  { id: 'all', label: 'All Campaigns', icon: QrCode },
  { id: 'qr-link', label: getCampaignTypeDisplayName('qr-link'), icon: LinkIcon },
  { id: 'qr-links', label: getCampaignTypeDisplayName('qr-links'), icon: LinkIcon },
  { id: 'qr-links-video', label: getCampaignTypeDisplayName('qr-links-video'), icon: Video },
  { id: 'qr-links-pdf-video', label: getCampaignTypeDisplayName('qr-links-pdf-video'), icon: FileText },
  { id: 'qr-links-ar-video', label: getCampaignTypeDisplayName('qr-links-ar-video'), icon: Sparkles }
];

const CampaignTypeTabs = ({ 
  selectedType, 
  onTypeChange, 
  campaignCounts = {} 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedTypeData = CAMPAIGN_TYPES.find(type => type.id === selectedType) || CAMPAIGN_TYPES[0];
  const SelectedIcon = selectedTypeData.icon;
  const selectedCount = campaignCounts[selectedType] || 0;

  const handleSelect = (typeId) => {
    onTypeChange(typeId);
    setIsOpen(false);
  };

  return (
    <div className="mb-6 sm:mb-8">
      {/* Dropdown for all devices */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all touch-manipulation min-h-[44px] hover:bg-slate-700/50 hover:border-slate-500/50"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SelectedIcon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm truncate">{selectedTypeData.label}</span>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 flex-shrink-0">
                {selectedCount}
              </span>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Options */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/40 rounded-xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto">
              {CAMPAIGN_TYPES.map((type) => {
                const Icon = type.icon;
                const count = campaignCounts[type.id] || 0;
                const isActive = selectedType === type.id;

                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelect(type.id)}
                    className={`
                      w-full flex items-center justify-between gap-3 px-4 py-3
                      text-left transition-all duration-200 touch-manipulation
                      border-b border-slate-700/30 last:border-b-0
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-neon-pink/20 text-slate-100'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    {count > 0 && (
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0
                        ${
                          isActive
                            ? 'bg-slate-900/30 text-slate-100'
                            : 'bg-slate-700/50 text-slate-300'
                        }
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CampaignTypeTabs;







