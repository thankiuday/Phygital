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
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        addDebugMessage(`✅ Image validation successful: ${img.naturalWidth}x${img.naturalHeight}`, 'success');
        
        // Convert image to data URL to avoid CORS issues with MindAR
        addDebugMessage('🔄 Converting image to data URL for MindAR compatibility...', 'info');
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Canvas 2D context not available');
          }
          
          // Set canvas size to image size (or resize if too large)
          let canvasWidth = img.naturalWidth;
          let canvasHeight = img.naturalHeight;
          
          if (canvasWidth > 2048 || canvasHeight > 2048) {
            const maxSize = 2048;
            const scale = Math.min(maxSize / canvasWidth, maxSize / canvasHeight);
            canvasWidth = Math.round(canvasWidth * scale);
            canvasHeight = Math.round(canvasHeight * scale);
            addDebugMessage(`🖼️ Resizing large image to ${canvasWidth}x${canvasHeight}`, 'info');
          }
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          if (canvas.width <= 0 || canvas.height <= 0 || canvas.width > 4096 || canvas.height > 4096) {
            throw new Error('Invalid canvas dimensions');
          }
          
          // Clear and draw image
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert to PNG data URL
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          
          if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/png;base64,')) {
            throw new Error('Failed to generate valid data URL');
          }
          
          // Test if the data URL can be loaded back as an image
          const testImg = new Image();
          await new Promise((resolve, reject) => {
            testImg.onload = resolve;
            testImg.onerror = () => reject(new Error('Generated data URL is corrupted'));
            testImg.src = dataUrl;
          });
          
          addDebugMessage(`✅ Image converted to data URL: ${canvas.width}x${canvas.height}`, 'success');
          resolve(dataUrl);
        } catch (conversionError) {
          addDebugMessage(`⚠️ Image conversion failed: ${conversionError.message}`, 'warning');
          addDebugMessage('🔄 Using original image URL instead', 'info');
          resolve(imageUrl);
        }
      };
      
      img.onerror = () => {
        addDebugMessage('⚠️ Image validation failed - may cause AR issues', 'warning');
        reject(new Error('Image load failed'));
      };
      
      img.src = imageUrl;
    });
  } catch (error) {
    addDebugMessage(`⚠️ Image processing error: ${error.message}`, 'warning');
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
