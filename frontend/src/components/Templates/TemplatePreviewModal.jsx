/**
 * Template Preview Modal Component
 * Shows live preview of template with customization options
 */

import React, { useState, useEffect, useMemo } from 'react'
import { X, Play, Settings, Sparkles } from 'lucide-react'
import ThemeRenderer from './ThemeRenderer'

const TemplatePreviewModal = ({ template, isOpen, onClose, onApply }) => {
  const [customization, setCustomization] = useState({
    animationSpeed: template.customizations?.animationSpeed?.default || 1,
    particleDensity: template.customizations?.particleDensity?.default || 1,
    customColors: {}
  })

  useEffect(() => {
    if (isOpen) {
      // Reset customization when modal opens
      setCustomization({
        animationSpeed: template.customizations?.animationSpeed?.default || 1,
        particleDensity: template.customizations?.particleDensity?.default || 1,
        customColors: {}
      })
    }
  }, [isOpen, template])

  if (!isOpen) return null

  const handleCustomizationChange = (key, value) => {
    setCustomization(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const canCustomize = template.customizations?.animationSpeed?.enabled || 
                       template.customizations?.particleDensity?.enabled

  // Memoize template config to ensure ThemeRenderer updates when customization changes
  const templateConfig = useMemo(() => {
    const config = {
      ...customization
    }
    return config
  }, [customization])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] bg-slate-800 rounded-xl border border-slate-600/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-neon-purple" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">{template.name}</h2>
              <p className="text-xs sm:text-sm text-slate-400 line-clamp-1">{template.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Preview Area */}
          <div className="flex-1 overflow-auto p-4 lg:p-6 min-h-[300px] lg:min-h-[400px]">
            <div className="relative min-h-[300px] lg:min-h-[500px] h-full rounded-lg overflow-hidden border border-slate-600/30">
              {/* Preview Landing Page with Theme */}
              <ThemeRenderer
                template={template.id}
                templateConfig={templateConfig}
                previewMode={true}
              >
                {/* Sample Landing Page Content */}
                <div className="min-h-[300px] lg:min-h-[500px] p-4 lg:p-8" style={{ backgroundColor: 'transparent', background: 'transparent' }}>
                  <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
                    <h1 className="text-2xl lg:text-3xl font-bold mb-3 lg:mb-4">Sample Landing Page</h1>
                    <p className="text-base lg:text-lg mb-4 lg:mb-6">This is how your landing page will look with this template.</p>
                    
                    {/* Sample Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="p-4 lg:p-6 backdrop-blur-sm rounded-xl border border-slate-600/30"
                          style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                        >
                          <h3 className="text-base lg:text-lg font-semibold mb-2">Sample Card {i}</h3>
                          <p className="text-sm lg:text-base text-slate-400">This is sample content to preview the template styling.</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ThemeRenderer>
            </div>
          </div>

          {/* Customization Panel */}
          {canCustomize && (
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-700/50 bg-slate-800/30 p-4 lg:p-6 overflow-y-auto max-h-[300px] lg:max-h-none">
              <div className="flex items-center gap-2 mb-4 lg:mb-6">
                <Settings className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-100">Customize</h3>
              </div>

              {/* Animation Speed */}
              {template.customizations?.animationSpeed?.enabled && (
                <div className="mb-4 lg:mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Animation Speed: {customization.animationSpeed}x
                  </label>
                  <input
                    type="range"
                    min={template.customizations.animationSpeed.min}
                    max={template.customizations.animationSpeed.max}
                    step={0.1}
                    value={customization.animationSpeed}
                    onChange={(e) => handleCustomizationChange('animationSpeed', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{template.customizations.animationSpeed.min}x</span>
                    <span>{template.customizations.animationSpeed.max}x</span>
                  </div>
                </div>
              )}

              {/* Particle Density */}
              {template.customizations?.particleDensity?.enabled && (
                <div className="mb-4 lg:mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Particle Density: {customization.particleDensity}x
                  </label>
                  <input
                    type="range"
                    min={template.customizations.particleDensity.min}
                    max={template.customizations.particleDensity.max}
                    step={0.1}
                    value={customization.particleDensity}
                    onChange={(e) => handleCustomizationChange('particleDensity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{template.customizations.particleDensity.min}x</span>
                    <span>{template.customizations.particleDensity.max}x</span>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-slate-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(templateConfig)}
            className="px-6 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg font-medium hover:shadow-glow-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Play className="w-4 h-4" />
            Apply Template
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplatePreviewModal

