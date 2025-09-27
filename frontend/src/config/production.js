// Production Configuration
export const productionConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'https://phygital-backend-wcgs.onrender.com/api',
    timeout: 30000,
    retries: 3
  },
  
  ar: {
    cameraQuality: 'high',
    performanceMode: 'balanced',
    enableDebug: false,
    targetDetectionTimeout: 10000,
    videoQuality: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    }
  },
  
  analytics: {
    enabled: true,
    batchSize: 10,
    flushInterval: 30000,
    enablePerformanceTracking: true
  },
  
  pwa: {
    enabled: true,
    enableOfflineMode: true,
    enableBackgroundSync: true,
    enablePushNotifications: false,
    cacheDuration: 3600000 // 1 hour
  },
  
  performance: {
    enableLazyLoading: true,
    enableImageOptimization: true,
    enableCodeSplitting: true,
    preloadCriticalResources: true
  },
  
  features: {
    enableRealTimeAnalytics: true,
    enableAdvancedDebug: false,
    enableBetaFeatures: false,
    enableA11yFeatures: true
  }
};

export default productionConfig;
