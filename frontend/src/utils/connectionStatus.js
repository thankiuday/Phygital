/**
 * Connection Status Utility
 * Tracks backend connection status and allows components to subscribe to changes
 */

// Connection status state
let connectionStatus = 'connected' // 'connected', 'disconnected', 'reconnecting'
let statusListeners = []
let lastErrorTime = null
let lastSuccessTime = Date.now()

/**
 * Get current connection status
 */
export const getConnectionStatus = () => connectionStatus

/**
 * Set connection status and notify listeners
 */
export const setConnectionStatus = (status) => {
  if (connectionStatus !== status) {
    connectionStatus = status
    statusListeners.forEach(listener => listener(status))
  }
}

/**
 * Subscribe to connection status changes
 * @param {Function} listener - Callback function to call when status changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToConnectionStatus = (listener) => {
  statusListeners.push(listener)
  // Immediately call listener with current status
  listener(connectionStatus)
  
  // Return unsubscribe function
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener)
  }
}

/**
 * Get last error time
 */
export const getLastErrorTime = () => lastErrorTime

/**
 * Set last error time
 */
export const setLastErrorTime = (time) => {
  lastErrorTime = time
}

/**
 * Get last success time
 */
export const getLastSuccessTime = () => lastSuccessTime

/**
 * Set last success time
 */
export const setLastSuccessTime = (time) => {
  lastSuccessTime = time
  // If we successfully connected, update status
  if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
    setConnectionStatus('connected')
  }
}

/**
 * Mark connection as failed
 */
export const markConnectionFailed = () => {
  lastErrorTime = Date.now()
  if (connectionStatus === 'connected') {
    setConnectionStatus('disconnected')
  }
}

/**
 * Mark connection as reconnecting
 */
export const markReconnecting = () => {
  setConnectionStatus('reconnecting')
}


