/**
 * Plan Utilities
 * Helper functions to check user subscription plans and feature access
 */

/**
 * Check if user is on free plan
 * @param {Object} user - User object from AuthContext
 * @returns {boolean} True if user is on free plan or has no plan
 */
export const isFreePlan = (user) => {
  if (!user) return true
  // Check if user has subscriptionPlan field
  // If not set or set to 'free', user is on free plan
  return !user.subscriptionPlan || user.subscriptionPlan === 'free' || user.subscriptionPlan === null
}

/**
 * Check if user can access a specific feature
 * @param {Object} user - User object from AuthContext
 * @param {string} feature - Feature name ('video', 'ar', 'ar-experience')
 * @returns {boolean} True if user can access the feature
 */
export const canAccessFeature = (user, feature) => {
  if (isFreePlan(user)) {
    const premiumFeatures = ['video', 'ar', 'ar-experience', 'ar-experience-qr', 'phygital-qr']
    return !premiumFeatures.includes(feature.toLowerCase())
  }
  return true
}

/**
 * Get user's plan name
 * @param {Object} user - User object from AuthContext
 * @returns {string} Plan name ('free', 'phygital', 'enterprise', etc.)
 */
export const getUserPlan = (user) => {
  if (!user) return 'free'
  return user.subscriptionPlan || 'free'
}

/**
 * Check if user has Phygital QR plan or higher
 * @param {Object} user - User object from AuthContext
 * @returns {boolean} True if user has Phygital QR plan or enterprise
 */
export const hasPhygitalPlan = (user) => {
  const plan = getUserPlan(user)
  return plan === 'phygital' || plan === 'enterprise'
}
