// Simple helpers to persist in-progress QR / card flows across login

const KEY = 'phygital_pending_flow'

export const savePendingFlow = (flow) => {
  try {
    if (!flow) return
    localStorage.setItem(KEY, JSON.stringify(flow))
  } catch (err) {
    console.warn('Failed to save pending flow', err)
  }
}

export const getPendingFlow = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn('Failed to read pending flow', err)
    return null
  }
}

export const clearPendingFlow = () => {
  try {
    localStorage.removeItem(KEY)
  } catch (err) {
    console.warn('Failed to clear pending flow', err)
  }
}

