/**
 * Retry Helper Utility
 * Implements exponential backoff retry logic for failed requests
 */

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry (should return a Promise)
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry all)
 * @returns {Promise} Promise that resolves/rejects after retries are exhausted
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options

  let lastError
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error
      }

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        // Calculate exponential backoff delay
        const exponentialDelay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay)
        delay = exponentialDelay

        // Wait before retrying
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * Check if an error should be retried based on request configuration
 * @param {Error} error - The error object
 * @param {Object} config - Axios request config
 * @returns {boolean} Whether to retry
 */
export const shouldRetryRequest = (error, config) => {
  // Don't retry if request was cancelled
  if (error.code === 'ERR_CANCELED' || error.message?.includes('canceled')) {
    return false
  }

  // Only retry GET requests (to avoid duplicate POST/PUT/DELETE operations)
  if (config?.method && !['get', 'GET'].includes(config.method)) {
    return false
  }

  // Don't retry auth endpoints (to avoid redirect loops)
  const url = config?.url || ''
  if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/admin')) {
    return false
  }

  // Only retry network errors (no response) or 5xx errors
  if (!error.response) {
    return true
  }

  // Retry on server errors (5xx)
  if (error.response.status >= 500 && error.response.status < 600) {
    return true
  }

  // Don't retry client errors (4xx) or other status codes
  return false
}


