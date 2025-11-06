/**
 * Easing Functions
 * Reusable easing functions for smooth animations
 * All functions take a value t between 0 and 1 and return an eased value
 */

/**
 * Ease Out Back
 * Creates a bounce/overshoot effect at the end
 * Perfect for scale animations where you want a "pop" effect
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} - Eased value
 */
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Ease Out Cubic
 * Smooth deceleration
 * Perfect for rotation animations where you want smooth stopping
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} - Eased value
 */
export const easeOutCubic = (t) => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Ease In Out
 * Smooth acceleration and deceleration
 * Perfect for opacity/fade animations
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} - Eased value
 */
export const easeInOut = (t) => {
  return t < 0.5 
    ? 2 * t * t 
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

/**
 * Ease Out Elastic
 * Creates a spring/elastic bounce effect
 * Alternative option for scale animations with more bounce
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} - Eased value
 */
export const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/**
 * Ease Out Bounce
 * Creates a bouncing ball effect
 * Alternative for dramatic entrance animations
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} - Eased value
 */
export const easeOutBounce = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

/**
 * Linear
 * No easing - constant speed
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} - Same value (no easing)
 */
export const linear = (t) => {
  return t;
};

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Progress (0 to 1)
 * @returns {number} - Interpolated value
 */
export const lerp = (start, end, t) => {
  return start + (end - start) * t;
};

