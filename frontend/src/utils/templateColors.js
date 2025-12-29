/**
 * Template Color Utilities
 * Provides neon-themed color options that match the website's aesthetic
 */

// Default website background (matches HomePage hero section: slate-900 → slate-800 → slate-900)
export const DEFAULT_BACKGROUND = 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)'

// Neon-themed background color options
export const NEON_BACKGROUND_OPTIONS = [
  {
    id: 'default',
    name: 'Default Theme',
    value: DEFAULT_BACKGROUND,
    preview: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)'
  },
  {
    id: 'neon-blue',
    name: 'Neon Blue',
    value: 'linear-gradient(to bottom right, #0F172A, #1E293B, #00D4FF)',
    preview: 'linear-gradient(to bottom right, #0F172A, #1E293B, #00D4FF)'
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    value: 'linear-gradient(to bottom right, #0F172A, #1E293B, #A855F7)',
    preview: 'linear-gradient(to bottom right, #0F172A, #1E293B, #A855F7)'
  },
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    value: 'linear-gradient(to bottom right, #0F172A, #1E293B, #EC4899)',
    preview: 'linear-gradient(to bottom right, #0F172A, #1E293B, #EC4899)'
  },
  {
    id: 'neon-green',
    name: 'Neon Green',
    value: 'linear-gradient(to bottom right, #0F172A, #1E293B, #10B981)',
    preview: 'linear-gradient(to bottom right, #0F172A, #1E293B, #10B981)'
  },
  {
    id: 'neon-cyan',
    name: 'Neon Cyan',
    value: 'linear-gradient(to bottom right, #0F172A, #1E293B, #06B6D4)',
    preview: 'linear-gradient(to bottom right, #0F172A, #1E293B, #06B6D4)'
  },
  {
    id: 'neon-orange',
    name: 'Neon Orange',
    value: 'linear-gradient(to bottom right, #0F172A, #1E293B, #F97316)',
    preview: 'linear-gradient(to bottom right, #0F172A, #1E293B, #F97316)'
  },
  {
    id: 'neon-indigo',
    name: 'Neon Indigo',
    value: 'linear-gradient(to bottom right, #0F172A, #1E293B, #6366F1)',
    preview: 'linear-gradient(to bottom right, #0F172A, #1E293B, #6366F1)'
  },
  {
    id: 'neon-blue-purple',
    name: 'Blue to Purple',
    value: 'linear-gradient(to bottom right, #0F172A, #00D4FF, #A855F7)',
    preview: 'linear-gradient(to bottom right, #0F172A, #00D4FF, #A855F7)'
  },
  {
    id: 'neon-purple-pink',
    name: 'Purple to Pink',
    value: 'linear-gradient(to bottom right, #0F172A, #A855F7, #EC4899)',
    preview: 'linear-gradient(to bottom right, #0F172A, #A855F7, #EC4899)'
  },
  {
    id: 'neon-rainbow',
    name: 'Neon Rainbow',
    value: 'linear-gradient(135deg, #0F172A, #00D4FF, #A855F7, #EC4899, #10B981)',
    preview: 'linear-gradient(135deg, #0F172A, #00D4FF, #A855F7, #EC4899, #10B981)'
  }
]

// Get background option by ID
export const getBackgroundOption = (id) => {
  return NEON_BACKGROUND_OPTIONS.find(opt => opt.id === id) || NEON_BACKGROUND_OPTIONS[0]
}

// Get default background
export const getDefaultBackground = () => {
  return DEFAULT_BACKGROUND
}



