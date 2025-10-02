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

// Safe fetch for .mind file
export const fetchMindFile = async (url, addDebugMessage) => {
  try {
    addDebugMessage(`🔄 Fetching .mind file from: ${url}`, 'info');
    
    const res = await fetch(url, { 
      method: 'GET', 
      mode: 'cors',
      headers: {
        'Accept': 'application/octet-stream'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch .mind: ${res.status} ${res.statusText}`);
    }
    
    const buffer = await res.arrayBuffer(); // CRITICAL: arrayBuffer, not text
    addDebugMessage(`✅ Fetched .mind file: ${buffer.byteLength} bytes`, 'success');
    
    // Validate buffer
    if (!isValidMindBuffer(buffer)) {
      throw new Error('Invalid .mind buffer format');
    }
    
    // Log first/last bytes to detect issues
    const u8 = new Uint8Array(buffer);
    addDebugMessage(`🔍 First 16 bytes: ${Array.from(u8.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`, 'info');
    addDebugMessage(`🔍 Last 16 bytes: ${Array.from(u8.slice(-16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`, 'info');
    
    return new Uint8Array(buffer); // MindAR expects binary buffer-like
  } catch (error) {
    addDebugMessage(`❌ Failed to fetch .mind file: ${error.message}`, 'error');
    throw error;
  }
};

// Convert base64 data URL to Uint8Array
export const base64ToUint8Array = (dataUrl) => {
  try {
    // dataUrl like "data:application/octet-stream;base64,AAAA..."
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
    return arr;
  } catch (error) {
    throw new Error(`Failed to convert base64 to Uint8Array: ${error.message}`);
  }
};

// Validate if buffer is valid for MindAR
export const isValidMindBuffer = (buf) => {
  return buf && (buf instanceof ArrayBuffer || buf instanceof Uint8Array);
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
