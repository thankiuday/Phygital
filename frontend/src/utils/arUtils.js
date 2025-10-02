/**
 * AR Utilities
 * Helper functions for AR operations and image processing
 */

// Validate image for MindAR compatibility
export const validateImageForMindAR = async (imageUrl, addDebugMessage) => {
  try {
    addDebugMessage('🔍 Validating image for MindAR compatibility...', 'info');
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          // Check image dimensions
          if (img.naturalWidth < 100 || img.naturalHeight < 100) {
            throw new Error('Image too small for AR tracking (minimum 100x100px)');
          }
          
          if (img.naturalWidth > 2048 || img.naturalHeight > 2048) {
            addDebugMessage('⚠️ Image very large, may cause performance issues', 'warning');
          }
          
          // Check if image is corrupted by trying to draw it on canvas
          const testCanvas = document.createElement('canvas');
          const testCtx = testCanvas.getContext('2d');
          
          if (!testCtx) {
            throw new Error('Canvas context not available for validation');
          }
          
          testCanvas.width = Math.min(img.naturalWidth, 512);
          testCanvas.height = Math.min(img.naturalHeight, 512);
          
          // Try to draw the image
          testCtx.drawImage(img, 0, 0, testCanvas.width, testCanvas.height);
          
          // Check if canvas has content
          const imageData = testCtx.getImageData(0, 0, testCanvas.width, testCanvas.height);
          const hasContent = imageData.data.some(pixel => pixel !== 0);
          
          if (!hasContent) {
            throw new Error('Image appears to be empty or corrupted');
          }
          
          addDebugMessage(`✅ Image validation passed: ${img.naturalWidth}x${img.naturalHeight}`, 'success');
          resolve(true);
        } catch (validationError) {
          addDebugMessage(`❌ Image validation failed: ${validationError.message}`, 'error');
          reject(validationError);
        }
      };
      
      img.onerror = () => {
        const error = new Error('Failed to load image for validation');
        addDebugMessage(`❌ Image load failed: ${error.message}`, 'error');
        reject(error);
      };
      
      img.src = imageUrl;
    });
  } catch (error) {
    addDebugMessage(`❌ Image validation error: ${error.message}`, 'error');
    throw error;
  }
};

// Process and resize image if needed
export const processImageForAR = async (imageUrl, addDebugMessage) => {
  try {
    addDebugMessage('🔄 Validating image for MindAR compatibility...', 'info');
    
    // Just validate the image and return the original URL
    // Let MindAR handle the image processing internally
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        addDebugMessage(`✅ Image validation successful: ${img.naturalWidth}x${img.naturalHeight}`, 'success');
        
        // Only resize if image is extremely large (over 2048px)
        if (img.naturalWidth > 2048 || img.naturalHeight > 2048) {
          addDebugMessage('⚠️ Image very large, may cause performance issues', 'warning');
          addDebugMessage('🔄 Consider using a smaller image for better AR performance', 'info');
        }
        
        addDebugMessage('✅ Using original image URL - letting MindAR handle processing', 'success');
        resolve(imageUrl);
      };
      
      img.onerror = () => {
        addDebugMessage('⚠️ Image validation failed - may cause AR issues', 'warning');
        reject(new Error('Image load failed'));
      };
      
      img.src = imageUrl;
    });
  } catch (error) {
    addDebugMessage(`⚠️ Image processing error: ${error.message}`, 'warning');
    addDebugMessage('🔄 Using original image URL as fallback', 'info');
    return imageUrl;
  }
};

// Check if libraries are available
export const checkLibraries = async (addDebugMessage) => {
  console.log('🔍 Starting library check...');
  addDebugMessage('🔍 Checking AR libraries...', 'info');
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const threeAvailable = !!window.THREE;
    const mindarAvailable = !!window.MindARThree;
    
    console.log(`📊 Library check attempt ${attempts + 1}: THREE=${threeAvailable}, MindAR=${mindarAvailable}`);
    
    if (attempts % 10 === 0) {
      addDebugMessage(`📊 Library check ${attempts + 1}/50: THREE=${threeAvailable}, MindAR=${mindarAvailable}`, 'info');
    }
    
    if (threeAvailable && mindarAvailable) {
      console.log('✅ AR libraries loaded successfully');
      addDebugMessage('✅ AR libraries loaded successfully', 'success');
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  console.error('❌ AR libraries failed to load after 50 attempts');
  addDebugMessage('❌ AR libraries failed to load after 5 seconds', 'error');
  return false;
};

// Throttle function for frequent updates
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};
