/**
 * Curated list of Google Fonts for printable business cards.
 * These fonts are popular for professional/business card use.
 * Loaded dynamically via Google Fonts CDN.
 */

const PRINTABLE_CARD_FONTS = [
  { id: 'inter', name: 'Inter', family: 'Inter', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { id: 'roboto', name: 'Roboto', family: 'Roboto', category: 'sans-serif', weights: [400, 500, 700] },
  { id: 'open-sans', name: 'Open Sans', family: 'Open Sans', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { id: 'poppins', name: 'Poppins', family: 'Poppins', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { id: 'lato', name: 'Lato', family: 'Lato', category: 'sans-serif', weights: [400, 700] },
  { id: 'raleway', name: 'Raleway', family: 'Raleway', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { id: 'playfair-display', name: 'Playfair Display', family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700] },
  { id: 'merriweather', name: 'Merriweather', family: 'Merriweather', category: 'serif', weights: [400, 700] },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { id: 'source-sans-pro', name: 'Source Sans Pro', family: 'Source Sans 3', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'nunito', name: 'Nunito', family: 'Nunito', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'pt-serif', name: 'PT Serif', family: 'PT Serif', category: 'serif', weights: [400, 700] },
  { id: 'work-sans', name: 'Work Sans', family: 'Work Sans', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { id: 'libre-baskerville', name: 'Libre Baskerville', family: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { id: 'cormorant-garamond', name: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'serif', weights: [400, 500, 600, 700] },
  { id: 'josefin-sans', name: 'Josefin Sans', family: 'Josefin Sans', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { id: 'ibm-plex-sans', name: 'IBM Plex Sans', family: 'IBM Plex Sans', category: 'sans-serif', weights: [400, 500, 600, 700] }
];

/**
 * Load a Google Font dynamically by injecting a <link> tag.
 */
export function loadGoogleFont(family, weights = [400, 700]) {
  const id = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weights.join(';')}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Preload all curated fonts
 */
export function preloadAllFonts() {
  PRINTABLE_CARD_FONTS.forEach(f => loadGoogleFont(f.family, f.weights));
}

export default PRINTABLE_CARD_FONTS;
