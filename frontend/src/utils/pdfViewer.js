/**
 * PDF Viewer Utility
 * Provides reliable PDF viewing with direct URLs (browser native viewer)
 * Cloudinary PDFs work best with direct URLs as they're publicly accessible
 */

/**
 * Get PDF URL for viewing (returns direct URL for browser native viewer)
 * @param {string} pdfUrl - The URL of the PDF file
 * @returns {string} - Direct PDF URL (browser will use native viewer)
 */
export const getPDFViewerUrl = (pdfUrl) => {
  if (!pdfUrl) return null
  
  // Use direct URL - browser's native PDF viewer handles Cloudinary PDFs better
  // Google Docs Viewer has CORS issues with Cloudinary URLs
  return pdfUrl
}

/**
 * Open PDF in browser's native viewer
 * @param {string} pdfUrl - The URL of the PDF file
 * @param {boolean} newTab - Whether to open in a new tab (default: true)
 */
export const openPDFInViewer = (pdfUrl, newTab = true) => {
  if (!pdfUrl) {
    console.error('PDF URL is required')
    return
  }

  const viewerUrl = getPDFViewerUrl(pdfUrl)
  
  if (newTab) {
    window.open(viewerUrl, '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = viewerUrl
  }
}

/**
 * Check if a URL is a PDF file
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL appears to be a PDF
 */
export const isPDFUrl = (url) => {
  if (!url) return false
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf')
}

