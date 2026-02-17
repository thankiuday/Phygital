/**
 * Layout Router
 * Maps layout IDs to their respective layout components.
 */
export { default as ClassicLayout } from './ClassicLayout'
export { default as BannerLayout } from './BannerLayout'
export { default as WaveLayout } from './WaveLayout'
export { default as MinimalLayout } from './MinimalLayout'
export { default as BoldLayout } from './BoldLayout'
export { default as GlassLayout } from './GlassLayout'

import ClassicLayout from './ClassicLayout'
import BannerLayout from './BannerLayout'
import WaveLayout from './WaveLayout'
import MinimalLayout from './MinimalLayout'
import BoldLayout from './BoldLayout'
import GlassLayout from './GlassLayout'

const LAYOUT_MAP = {
  classic: ClassicLayout,
  banner: BannerLayout,
  wave: WaveLayout,
  minimal: MinimalLayout,
  bold: BoldLayout,
  glass: GlassLayout
}

/**
 * Returns the layout component for the given layout ID.
 * Falls back to ClassicLayout if the layout ID is not recognized.
 */
export const getLayout = (layoutId) => {
  return LAYOUT_MAP[layoutId] || ClassicLayout
}
