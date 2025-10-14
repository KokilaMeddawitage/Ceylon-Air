/**
 * Environment Configuration
 * 
 * This file handles environment variable access for the Ceylon Air app.
 * All API keys and sensitive configuration should be stored in .env file.
 */

// API Keys from environment variables
const API_KEYS = {
  IQAIR: process.env.EXPO_PUBLIC_IQAIR_API_KEY || 'your_iqair_api_key_here',
  OPENWEATHER: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || 'your_openweather_api_key_here',
  WEATHERAPI: process.env.EXPO_PUBLIC_WEATHERAPI_API_KEY || 'your_weatherapi_key_here'
};

// API Base URLs from environment variables
const BASE_URLS = {
  IQAIR: process.env.EXPO_PUBLIC_IQAIR_BASE_URL || 'https://api.airvisual.com/v2',
  OPENWEATHER: process.env.EXPO_PUBLIC_OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5',
  WEATHERAPI: process.env.EXPO_PUBLIC_WEATHERAPI_BASE_URL || 'https://api.weatherapi.com/v1'
};

// Validate that all required API keys are present
const validateApiKeys = () => {
  const missingKeys = [];
  
  Object.entries(API_KEYS).forEach(([service, key]) => {
    if (!key || key.startsWith('your_')) {
      missingKeys.push(service);
    }
  });
  
  if (missingKeys.length > 0) {
    console.warn(`⚠️  Missing API keys for: ${missingKeys.join(', ')}`);
    console.warn('Please check your .env file and ensure all API keys are configured.');
  }
  
  return missingKeys.length === 0;
};

// App Configuration
const CONFIG = {
  // API Configuration
  API_KEYS,
  BASE_URLS,
  
  // Request Configuration
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  
  // Location Configuration
  DEFAULT_LOCATION: {
    latitude: 6.9271,
    longitude: 79.8612,
    name: 'Colombo, Sri Lanka'
  },
  
  // Cache Configuration
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Development Configuration
  DEBUG: __DEV__, // Expo/React Native development mode
};

// Validate configuration on load
if (CONFIG.DEBUG) {
  console.log('🔧 Ceylon Air Configuration Loaded');
  validateApiKeys();
}

export default CONFIG;
export { API_KEYS, BASE_URLS, validateApiKeys };