/**
 * Card Text Parser
 * Parses raw OCR text from business cards into structured fields.
 * Uses regex heuristics for email, phone, URL, name, title, and company.
 */

// Regex patterns for common business card fields
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)*/gi;
const SOCIAL_HANDLE_REGEX = /@[a-zA-Z0-9._]{1,30}/g;

// Common title keywords that help identify job titles
const TITLE_KEYWORDS = [
  'ceo', 'cto', 'cfo', 'coo', 'cmo', 'vp', 'director', 'manager', 'lead',
  'engineer', 'developer', 'designer', 'consultant', 'analyst', 'specialist',
  'coordinator', 'officer', 'president', 'founder', 'co-founder', 'partner',
  'associate', 'assistant', 'executive', 'supervisor', 'head', 'chief',
  'architect', 'strategist', 'advisor', 'professor', 'doctor', 'attorney',
  'accountant', 'administrator', 'editor', 'photographer', 'artist',
  'marketing', 'sales', 'operations', 'finance', 'human resources', 'hr',
  'software', 'senior', 'junior', 'intern', 'freelance', 'independent'
];

// Common company suffixes
const COMPANY_SUFFIXES = [
  'inc', 'llc', 'ltd', 'corp', 'co', 'company', 'group', 'solutions',
  'services', 'technologies', 'tech', 'enterprises', 'associates',
  'consulting', 'agency', 'studio', 'labs', 'partners', 'holdings',
  'industries', 'international', 'global', 'digital', 'media', 'pvt'
];

/**
 * Clean a line of text by removing extra whitespace
 */
function cleanLine(line) {
  return line.replace(/\s+/g, ' ').trim();
}

/**
 * Check if a line looks like a job title
 */
function looksLikeTitle(line) {
  const lower = line.toLowerCase();
  return TITLE_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Check if a line looks like a company name
 */
function looksLikeCompany(line) {
  const lower = line.toLowerCase();
  return COMPANY_SUFFIXES.some(suffix => lower.includes(suffix));
}

/**
 * Check if a line is mostly special characters or too short to be meaningful
 */
function isNoiseLine(line) {
  const cleaned = line.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.length < 2;
}

/**
 * Check if a line looks like an address
 */
function looksLikeAddress(line) {
  const lower = line.toLowerCase();
  const addressKeywords = [
    'street', 'st.', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr',
    'lane', 'ln', 'boulevard', 'blvd', 'suite', 'ste', 'floor',
    'building', 'bldg', 'block', 'sector', 'plot', 'no.', 'zip',
    'pin', 'city', 'state', 'country', 'near', 'opposite', 'nagar',
    'colony', 'market', 'phase'
  ];
  const hasPostalCode = /\b\d{5,6}\b/.test(line);
  const hasAddressWord = addressKeywords.some(kw => lower.includes(kw));
  return hasPostalCode || hasAddressWord;
}

/**
 * Parse raw OCR text from a business card into structured fields.
 * Processes text from front and back sides separately, then merges.
 *
 * @param {string} frontText - Raw OCR text from front of card
 * @param {string} backText - Raw OCR text from back of card
 * @returns {Object} Structured fields
 */
function parseCardText(frontText = '', backText = '') {
  const result = {
    name: '',
    title: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    rawFront: frontText,
    rawBack: backText
  };

  const allText = `${frontText}\n${backText}`;

  // Extract emails
  const emails = allText.match(EMAIL_REGEX) || [];
  if (emails.length > 0) {
    result.email = emails[0];
  }

  // Extract phone numbers (filter out sequences that are part of emails or URLs)
  const phoneMatches = allText.match(PHONE_REGEX) || [];
  const validPhones = phoneMatches.filter(p => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  });
  if (validPhones.length > 0) {
    result.phone = validPhones[0].trim();
  }

  // Extract URLs (filter out email domains)
  const urlMatches = allText.match(URL_REGEX) || [];
  const validUrls = urlMatches.filter(u => {
    return !u.includes('@') && !u.match(/^\d/);
  });
  if (validUrls.length > 0) {
    let url = validUrls[0];
    if (!url.startsWith('http')) url = 'https://' + url;
    result.website = url;
  }

  // Process lines for name, title, company, address
  const frontLines = frontText
    .split('\n')
    .map(cleanLine)
    .filter(l => l.length > 0 && !isNoiseLine(l));

  const backLines = backText
    .split('\n')
    .map(cleanLine)
    .filter(l => l.length > 0 && !isNoiseLine(l));

  const allLines = [...frontLines, ...backLines];

  // Remove lines that are purely email, phone, or URL
  const contentLines = allLines.filter(line => {
    const stripped = line.replace(EMAIL_REGEX, '').replace(PHONE_REGEX, '').replace(URL_REGEX, '').trim();
    return stripped.length > 1;
  });

  // Find address lines
  const addressLines = contentLines.filter(looksLikeAddress);
  if (addressLines.length > 0) {
    result.address = addressLines.join(', ');
  }

  // Remaining lines after removing address
  const nonAddressLines = contentLines.filter(l => !looksLikeAddress(l));

  // Identify name, title, and company from remaining lines
  // Strategy: front side first few lines are typically name > title > company
  const frontContentLines = frontLines.filter(line => {
    const stripped = line.replace(EMAIL_REGEX, '').replace(PHONE_REGEX, '').replace(URL_REGEX, '').trim();
    return stripped.length > 1 && !looksLikeAddress(line);
  });

  let nameFound = false;
  let titleFound = false;
  let companyFound = false;

  for (const line of frontContentLines) {
    if (companyFound) break;

    // Skip lines that are just contact info
    if (line.match(EMAIL_REGEX) && line.replace(EMAIL_REGEX, '').trim().length < 3) continue;
    if (line.match(PHONE_REGEX) && line.replace(PHONE_REGEX, '').trim().length < 3) continue;

    if (!nameFound) {
      // Name is usually the first prominent text line (2-4 words, no special chars)
      const wordCount = line.split(/\s+/).length;
      if (wordCount >= 1 && wordCount <= 5 && !looksLikeTitle(line) && !looksLikeCompany(line)) {
        result.name = line;
        nameFound = true;
        continue;
      }
    }

    if (!titleFound && looksLikeTitle(line)) {
      result.title = line;
      titleFound = true;
      continue;
    }

    if (!companyFound && looksLikeCompany(line)) {
      result.company = line;
      companyFound = true;
      continue;
    }

    // If we have a name but no title/company yet, second line is often title
    if (nameFound && !titleFound && !companyFound) {
      const wordCount = line.split(/\s+/).length;
      if (wordCount <= 6) {
        if (looksLikeCompany(line)) {
          result.company = line;
          companyFound = true;
        } else {
          result.title = line;
          titleFound = true;
        }
        continue;
      }
    }

    // Third non-contact line is often company
    if (nameFound && titleFound && !companyFound) {
      result.company = line;
      companyFound = true;
    }
  }

  // If name still not found, try the first non-contact line from all text
  if (!result.name && nonAddressLines.length > 0) {
    result.name = nonAddressLines[0];
  }

  return result;
}

module.exports = { parseCardText };
