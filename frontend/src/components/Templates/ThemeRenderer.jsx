/**
 * Theme Renderer Component
 * Applies template styling and animations to landing page content
 */

import React, { useRef, useEffect } from 'react'
import { getTemplate } from '../../config/templates'
import { getDefaultBackground } from '../../utils/templateColors'
import Snowfall from './animations/Snowfall'
import Fireworks from './animations/Fireworks'
import ColorSplash from './animations/ColorSplash'
import Particles from './animations/Particles'

const ThemeRenderer = ({ template, templateConfig = {}, previewMode = false, children }) => {
  const containerRef = useRef(null)
  const templateData = typeof template === 'string' ? getTemplate(template) : template

  // Get customization values
  const animationSpeed = templateConfig.animationSpeed || templateData.customizations?.animationSpeed?.default || 1
  const particleDensity = templateConfig.particleDensity || templateData.customizations?.particleDensity?.default || 1

  // Background is now handled purely via inline styles using defaultBackgroundColor
  // No need to apply Tailwind classes or colors.background anymore
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Apply text color only
    if (templateData.colors?.text) {
      container.style.color = templateData.colors.text
    }
  }, [templateData])

  // Render animations based on template
  const renderAnimations = () => {
    if (!templateData.animations) return null

    const animations = []

    if (templateData.animations.snowfall) {
      animations.push(
        <Snowfall
          key="snowfall"
          density={particleDensity}
          speed={animationSpeed}
          containerRef={containerRef}
        />
      )
    }

    if (templateData.animations.fireworks) {
      animations.push(
        <Fireworks
          key="fireworks"
          density={particleDensity}
          speed={animationSpeed}
          containerRef={containerRef}
        />
      )
    }

    if (templateData.animations.colorSplash) {
      animations.push(
        <ColorSplash
          key="colorsplash"
          density={particleDensity}
          speed={animationSpeed}
          containerRef={containerRef}
        />
      )
    }

    if (templateData.animations.particles && !templateData.animations.snowfall && !templateData.animations.fireworks && !templateData.animations.colorSplash) {
      animations.push(
        <Particles
          key="particles"
          density={particleDensity}
          speed={animationSpeed}
          color={templateData.colors?.accent || templateData.colors?.primary}
          containerRef={containerRef}
        />
      )
    }

    return animations
  }

  // Apply custom colors if provided
  const getCustomStyles = () => {
    const styles = {}
    
    if (templateConfig.customColors) {
      if (templateConfig.customColors.primary) {
        styles['--template-primary'] = templateConfig.customColors.primary
      }
      if (templateConfig.customColors.secondary) {
        styles['--template-secondary'] = templateConfig.customColors.secondary
      }
    }

    return styles
  }

  // Respect reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const shouldAnimate = !prefersReducedMotion

  // Debug logging
  useEffect(() => {
    console.log('🎨 ThemeRenderer initialized:', {
      templateId: templateData.id,
      templateName: templateData.name,
      hasAnimations: !!templateData.animations,
      animations: templateData.animations,
      background: templateData.components?.background?.value || templateData.colors?.background,
      templateConfig,
      customBackgroundColor: templateConfig?.customBackgroundColor,
      hasCustomBackground: !!templateConfig?.customBackgroundColor,
      shouldAnimate
    })
  }, [templateData, templateConfig, shouldAnimate])

  // Build className with template background
  const getContainerClassName = () => {
    // Always use relative positioning and full height
    // Don't add Tailwind background classes - we use inline styles for defaultBackgroundColor
    // In preview mode, use min-h-full to fill container instead of min-h-screen
    return previewMode ? 'relative min-h-full w-full h-full' : 'relative min-h-screen w-full'
  }

  // Get inline styles for background - always use default website background
  const getBackgroundStyle = () => {
    const styles = { ...getCustomStyles() }
    
    // Always use defaultBackgroundColor from template (which is now set to default website background)
    const defaultBg = getDefaultBackground()
    
    if (templateData.defaultBackgroundColor) {
      styles.background = templateData.defaultBackgroundColor
      console.log('🎨 Using defaultBackgroundColor:', {
        templateId: templateData.id,
        defaultBackgroundColor: templateData.defaultBackgroundColor,
        hasDefaultBg: !!templateData.defaultBackgroundColor
      })
    } else {
      // Fallback to default website background if template doesn't have defaultBackgroundColor
      styles.background = defaultBg
      console.log('🎨 Using fallback default background:', {
        templateId: templateData.id,
        fallbackBg: defaultBg,
        templateDataKeys: Object.keys(templateData)
      })
    }
    
    return styles
  }

  // Get background style for applying to children
  const getBackgroundStyleForChildren = () => {
    const styles = {}
    
    // Always use defaultBackgroundColor from template (same for all themes now)
    if (templateData.defaultBackgroundColor) {
      styles.background = templateData.defaultBackgroundColor
      console.log('🎨 getBackgroundStyleForChildren: Using defaultBackgroundColor:', templateData.defaultBackgroundColor)
    } else {
      // Fallback to default website background
      const defaultBg = getDefaultBackground()
      styles.background = defaultBg
      console.log('🎨 getBackgroundStyleForChildren: Using fallback default background:', defaultBg)
    }
    
    return styles
  }

  // No need to apply background to fixed children since we use defaultBackgroundColor everywhere
  // The main container's background will be sufficient

  const finalStyles = getBackgroundStyle()
  const finalClassName = getContainerClassName()
  
  // Log what we're about to render
  console.log('🎨 ThemeRenderer render:', {
    templateId: templateData.id,
    hasCustomBackground: !!templateConfig?.customBackgroundColor,
    customBackgroundColor: templateConfig?.customBackgroundColor,
    finalStylesBackground: finalStyles.background,
    finalClassName
  })

  // Ensure background is applied to the main container - run after render
  useEffect(() => {
    const backgroundValue = finalStyles.background
    
    console.log('🎨 useEffect triggered:', {
      hasRef: !!containerRef.current,
      backgroundValue,
      templateId: templateData.id,
      defaultBackgroundColor: templateData.defaultBackgroundColor,
      finalStylesBackground: finalStyles.background
    })
    
    const applyBackground = () => {
      console.log('🎨 applyBackground called:', {
        hasRef: !!containerRef.current,
        backgroundValue,
        refCurrent: containerRef.current
      })
      
      if (!containerRef.current) {
        console.warn('🎨 ThemeRenderer: containerRef.current is null')
        return
      }
      
      if (!backgroundValue) {
        console.warn('🎨 ThemeRenderer: backgroundValue is empty')
        return
      }
      
      try {
        // Force apply background using setProperty with important flag
        // Note: linear-gradient is a background-image, so we DON'T set background-image to 'none'
        containerRef.current.style.setProperty('background', backgroundValue, 'important')
        containerRef.current.style.setProperty('background-color', 'transparent', 'important')
        
        // Also ensure body/html don't interfere
        if (document.body) {
          document.body.style.setProperty('background', 'transparent', 'important')
        }
        if (document.documentElement) {
          document.documentElement.style.setProperty('background', 'transparent', 'important')
        }
        
        // Verify it was applied
        const computedStyle = window.getComputedStyle(containerRef.current)
        console.log('🎨 Applied background to ThemeRenderer container:', {
          background: backgroundValue,
          applied: containerRef.current.style.background,
          appliedInline: containerRef.current.style.getPropertyValue('background'),
          computed: computedStyle.background,
          computedBackgroundImage: computedStyle.backgroundImage,
          element: containerRef.current,
          hasBackground: !!backgroundValue,
          className: containerRef.current.className,
          bodyBackground: document.body ? window.getComputedStyle(document.body).background : 'N/A',
          htmlBackground: document.documentElement ? window.getComputedStyle(document.documentElement).background : 'N/A'
        })
      } catch (error) {
        console.error('🎨 ThemeRenderer: Error applying background', error)
      }
    }
    
    // Apply immediately
    applyBackground()
    
    // Also apply after delays to ensure DOM is ready
    const timeout1 = setTimeout(applyBackground, 50)
    const timeout2 = setTimeout(applyBackground, 200)
    const timeout3 = setTimeout(applyBackground, 500)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [finalStyles.background])

  return (
    <div
      ref={containerRef}
      className={finalClassName}
      style={{
        // CRITICAL: Ensure background is always applied via inline style (highest priority)
        // Always use finalStyles.background (which uses defaultBackgroundColor from template)
        background: finalStyles.background || 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
        // Ensure full coverage - use 100% height in preview mode, 100vh otherwise
        minHeight: previewMode ? '100%' : '100vh',
        height: previewMode ? '100%' : 'auto',
        width: '100%',
        position: 'relative',
        // Ensure it's visible and covers the area
        display: 'block',
        zIndex: 0,
        // Inject theme colors as CSS custom properties
        '--theme-primary': templateData.colors?.primary || '#A855F7',
        '--theme-secondary': templateData.colors?.secondary || '#EC4899',
        '--theme-accent': templateData.colors?.accent || '#10B981',
        '--theme-card': templateData.colors?.card || 'rgba(148, 163, 184, 0.1)',
        '--theme-text': templateData.colors?.text || '#FFFFFF'
      }}
    >
      {/* Animations */}
      {shouldAnimate && renderAnimations()}

            {/* Content */}
            <div 
              className="relative z-10" 
              style={{ 
                backgroundColor: 'transparent',
                background: 'transparent',
                minHeight: 'inherit'
              }}
            >
              {children}
            </div>

      {/* Theme-specific CSS variables */}
      <style>{`
        :root {
          --template-primary: ${templateData.colors?.primary || '#8B5CF6'};
          --template-secondary: ${templateData.colors?.secondary || '#EC4899'};
          --template-accent: ${templateData.colors?.accent || '#00D4FF'};
          --template-text: ${templateData.colors?.text || '#F1F5F9'};
        }
      `}</style>
    </div>
  )
}

export default ThemeRenderer

