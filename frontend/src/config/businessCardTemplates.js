/**
 * Digital Business Card Templates
 * Each template defines the visual style for a business card.
 */

const businessCardTemplates = [
  {
    id: 'professional',
    name: 'Professional',
    category: 'business',
    description: 'Solid header band with overlapping photo',
    colors: {
      primary: '#1E40AF',
      secondary: '#3B82F6',
      background: '#F8FAFC',
      text: '#0F172A',
      accent: '#2563EB',
      card: '#FFFFFF'
    },
    layout: 'classic',
    fontFamily: 'Inter',
    cardStyle: 'rounded'
  },
  {
    id: 'creative',
    name: 'Creative',
    category: 'business',
    description: 'Gradient banner with full-width contact rows',
    colors: {
      primary: '#EC4899',
      secondary: '#F59E0B',
      background: 'linear-gradient(135deg, #FDF2F8 0%, #FEF3C7 100%)',
      text: '#1F2937',
      accent: '#DB2777',
      card: 'rgba(255,255,255,0.85)'
    },
    layout: 'banner',
    fontFamily: 'Poppins',
    cardStyle: 'rounded'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'business',
    description: 'Ultra-clean with text-link contacts',
    colors: {
      primary: '#111827',
      secondary: '#6B7280',
      background: '#FFFFFF',
      text: '#111827',
      accent: '#111827',
      card: '#F9FAFB'
    },
    layout: 'minimal',
    fontFamily: 'Inter',
    cardStyle: 'sharp'
  },
  {
    id: 'bold',
    name: 'Bold',
    category: 'business',
    description: 'Dark background with oversized typography',
    colors: {
      primary: '#7C3AED',
      secondary: '#A78BFA',
      background: '#0F0A1A',
      text: '#F5F3FF',
      accent: '#8B5CF6',
      card: 'rgba(124,58,237,0.12)'
    },
    layout: 'bold',
    fontFamily: 'Inter',
    cardStyle: 'rounded'
  },
  {
    id: 'elegant',
    name: 'Elegant',
    category: 'business',
    description: 'Cover photo with wave separator',
    colors: {
      primary: '#92400E',
      secondary: '#D97706',
      background: '#FFFBEB',
      text: '#1C1917',
      accent: '#B45309',
      card: '#FFFFFF'
    },
    layout: 'wave',
    fontFamily: 'Georgia',
    cardStyle: 'rounded'
  },
  {
    id: 'dark',
    name: 'Dark',
    category: 'business',
    description: 'Glassmorphism with glowing accents',
    colors: {
      primary: '#06B6D4',
      secondary: '#8B5CF6',
      background: 'linear-gradient(to bottom, #0F172A, #1E293B)',
      text: '#F1F5F9',
      accent: '#22D3EE',
      card: 'rgba(30,41,59,0.7)'
    },
    layout: 'glass',
    fontFamily: 'Inter',
    cardStyle: 'glass'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'business',
    description: 'Warm gradient with soft glow',
    colors: {
      primary: '#EA580C',
      secondary: '#F59E0B',
      background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)',
      text: '#1C1917',
      accent: '#DC2626',
      card: 'rgba(255,255,255,0.9)'
    },
    layout: 'banner',
    fontFamily: 'Poppins',
    cardStyle: 'rounded'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'business',
    description: 'Cool blue tones with clean lines',
    colors: {
      primary: '#0284C7',
      secondary: '#06B6D4',
      background: '#F0F9FF',
      text: '#0C4A6E',
      accent: '#0EA5E9',
      card: '#FFFFFF'
    },
    layout: 'classic',
    fontFamily: 'Inter',
    cardStyle: 'rounded'
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'business',
    description: 'Natural green tones with earthy feel',
    colors: {
      primary: '#15803D',
      secondary: '#22C55E',
      background: '#F0FDF4',
      text: '#14532D',
      accent: '#16A34A',
      card: '#FFFFFF'
    },
    layout: 'wave',
    fontFamily: 'Georgia',
    cardStyle: 'rounded'
  },
  {
    id: 'neon',
    name: 'Neon',
    category: 'business',
    description: 'Vibrant neon on dark background',
    colors: {
      primary: '#D946EF',
      secondary: '#06B6D4',
      background: 'linear-gradient(to bottom, #09090B, #18181B)',
      text: '#FAFAFA',
      accent: '#A855F7',
      card: 'rgba(39,39,42,0.8)'
    },
    layout: 'glass',
    fontFamily: 'Inter',
    cardStyle: 'glass'
  },
  {
    id: 'rose',
    name: 'Rose',
    category: 'business',
    description: 'Soft pinks with elegant typography',
    colors: {
      primary: '#BE185D',
      secondary: '#F472B6',
      background: '#FFF1F2',
      text: '#1F2937',
      accent: '#E11D48',
      card: '#FFFFFF'
    },
    layout: 'minimal',
    fontFamily: 'Playfair Display',
    cardStyle: 'rounded'
  },
  {
    id: 'slate',
    name: 'Slate',
    category: 'business',
    description: 'Professional dark with bold accents',
    colors: {
      primary: '#F97316',
      secondary: '#FB923C',
      background: '#0F172A',
      text: '#E2E8F0',
      accent: '#F97316',
      card: 'rgba(30,41,59,0.6)'
    },
    layout: 'bold',
    fontFamily: 'Inter',
    cardStyle: 'rounded'
  }
]

/**
 * Merges template colors with user theme overrides.
 * Maps theme.primaryColor → primary, theme.secondaryColor → secondary.
 */
export const mergeThemeColors = (template, theme = {}) => {
  const merged = { ...template.colors }
  if (theme.primaryColor) {
    merged.primary = theme.primaryColor
    merged.accent = theme.primaryColor
  }
  if (theme.secondaryColor) {
    merged.secondary = theme.secondaryColor
  }
  return merged
}

export const getBusinessCardTemplate = (id) => {
  return businessCardTemplates.find(t => t.id === id) || businessCardTemplates[0]
}

export const getAllBusinessCardTemplates = () => businessCardTemplates

export default businessCardTemplates
