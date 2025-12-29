/**
 * Device Info Utility
 * Extracts device information from browser navigator/user agent
 */

/**
 * Get device type (mobile, desktop, tablet)
 * @returns {string} Device type
 */
const getDeviceType = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const width = window.innerWidth;

  // Check for tablet first (tablets often have mobile user agents)
  const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent) ||
    (width >= 768 && width <= 1024);

  if (isTablet) {
    return 'tablet';
  }

  // Check for mobile
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
    width < 768;

  if (isMobile) {
    return 'mobile';
  }

  // Default to desktop
  return 'desktop';
};

/**
 * Get browser name and version
 * @returns {{browser: string, version: string}}
 */
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  let browser = 'unknown';
  let version = 'unknown';

  // Chrome (including Edge based on Chromium)
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1 && userAgent.indexOf('OPR') === -1) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'unknown';
  }
  // Edge (Chromium-based)
  else if (userAgent.indexOf('Edg') > -1) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'unknown';
  }
  // Firefox
  else if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'unknown';
  }
  // Safari
  else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'unknown';
  }
  // Opera
  else if (userAgent.indexOf('OPR') > -1) {
    browser = 'Opera';
    const match = userAgent.match(/OPR\/(\d+)/);
    version = match ? match[1] : 'unknown';
  }
  // Internet Explorer
  else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
    browser = 'IE';
    const match = userAgent.match(/(?:MSIE |rv:)(\d+)/);
    version = match ? match[1] : 'unknown';
  }

  return { browser, version };
};

/**
 * Get OS name and version
 * @returns {{os: string, version: string}}
 */
const getOSInfo = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  let os = 'unknown';
  let version = 'unknown';

  // Windows
  if (userAgent.indexOf('Win') > -1) {
    os = 'Windows';
    if (userAgent.indexOf('Windows NT 10.0') > -1) version = '10';
    else if (userAgent.indexOf('Windows NT 6.3') > -1) version = '8.1';
    else if (userAgent.indexOf('Windows NT 6.2') > -1) version = '8';
    else if (userAgent.indexOf('Windows NT 6.1') > -1) version = '7';
    else if (userAgent.indexOf('Windows NT 6.0') > -1) version = 'Vista';
    else if (userAgent.indexOf('Windows NT 5.1') > -1) version = 'XP';
  }
  // macOS
  else if (userAgent.indexOf('Mac') > -1) {
    os = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+)[._](\d+)/);
    if (match) version = `${match[1]}.${match[2]}`;
  }
  // iOS
  else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1 || userAgent.indexOf('iPod') > -1) {
    os = 'iOS';
    const match = userAgent.match(/OS (\d+)[._](\d+)/);
    if (match) version = `${match[1]}.${match[2]}`;
  }
  // Android
  else if (userAgent.indexOf('Android') > -1) {
    os = 'Android';
    const match = userAgent.match(/Android (\d+)[._](\d+)/);
    if (match) version = `${match[1]}.${match[2]}`;
  }
  // Linux
  else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux';
  }

  return { os, version };
};

/**
 * Get complete device information
 * @returns {{type: string, browser: string, os: string, browserVersion: string, osVersion: string}}
 */
export const getDeviceInfo = () => {
  const deviceType = getDeviceType();
  const { browser, version: browserVersion } = getBrowserInfo();
  const { os, version: osVersion } = getOSInfo();

  return {
    type: deviceType,
    browser,
    os,
    browserVersion,
    osVersion
  };
};

