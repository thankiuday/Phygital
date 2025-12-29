/**
 * Template Card Component
 * Displays a template preview card with details and actions
 */

import React from 'react'
import { Sparkles, CheckCircle2 } from 'lucide-react'

const TemplateCard = ({ template, appliedCampaigns = [], onClick, onApply }) => {
  const isApplied = appliedCampaigns.length > 0
  const categoryLabel = template.category === 'festival' ? 'Festival' : 'Non-Festival'

  return (
    <div
      className="group relative bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-neon-purple/50 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Preview Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
        {/* Template Preview Background */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: template.colors.background || 'linear-gradient(to bottom right, #0F172A, #1E293B)'
          }}
        />
        
        {/* Template Name Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-white/50 mx-auto mb-2" />
            <h3 className="text-white font-semibold text-lg">{template.name}</h3>
          </div>
        </div>

        {/* Applied Badge */}
        {isApplied && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-neon-green/20 backdrop-blur-sm rounded-full border border-neon-green/50">
            <CheckCircle2 className="w-3 h-3 text-neon-green" />
            <span className="text-xs text-neon-green font-medium">
              {appliedCampaigns.length} Applied
            </span>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-slate-900/70 backdrop-blur-sm rounded-full">
          <span className="text-xs text-slate-300 font-medium">{categoryLabel}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">{template.name}</h3>
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{template.description}</p>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.animations.snowfall && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">Snow</span>
          )}
          {template.animations.fireworks && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">Fireworks</span>
          )}
          {template.animations.colorSplash && (
            <span className="px-2 py-1 bg-pink-500/20 text-pink-300 text-xs rounded">Colors</span>
          )}
          {template.animations.particles && !template.animations.snowfall && !template.animations.fireworks && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">Particles</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Preview
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onApply()
            }}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg text-sm font-medium hover:shadow-glow-lg transition-all"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/0 to-neon-pink/0 group-hover:from-neon-purple/5 group-hover:to-neon-pink/5 transition-all duration-300 pointer-events-none" />
    </div>
  )
}

export default TemplateCard






