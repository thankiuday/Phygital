import React from 'react'
import ProfileSection from './sections/ProfileSection'
import ContactSection from './sections/ContactSection'
import HeadingTextSection from './sections/HeadingTextSection'
import AboutSection from './sections/AboutSection'
import ImagesSection from './sections/ImagesSection'
import VideosSection from './sections/VideosSection'
import SocialLinksSection from './sections/SocialLinksSection'
import LinksSection from './sections/LinksSection'
import TestimonialsSection from './sections/TestimonialsSection'

const SECTION_MAP = {
  heading: HeadingTextSection,
  text: HeadingTextSection,
  about: AboutSection,
  contact: ContactSection,
  images: ImagesSection,
  videos: VideosSection,
  social_links: SocialLinksSection,
  links: LinksSection,
  testimonials: TestimonialsSection
}

/**
 * Renders a single section by its type.
 * For top-level cards components (profile, contact, social_links),
 * dedicated props are passed directly.
 */
const SectionRenderer = ({ section, card, colors, onTrack }) => {
  // Special handling for contact and social_links which use top-level card data
  if (section.type === 'contact') {
    return <ContactSection contact={card?.contact} colors={colors} onTrack={onTrack} />
  }
  if (section.type === 'social_links') {
    return <SocialLinksSection socialLinks={card?.socialLinks} colors={colors} onTrack={onTrack} />
  }

  const Component = SECTION_MAP[section.type]
  if (!Component) return null

  return <Component section={section} colors={colors} onTrack={onTrack} />
}

export default SectionRenderer
