import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect the environment and platform
const getApiBaseUrl = (): string => {
  // Check if running in Expo Go or development build
  const isExpoGo = Constants.appOwnership === 'expo';
  
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access localhost
      // Physical Android device would use your computer's IP
      return isExpoGo ? 'http://192.168.53.65:8001/api/v1' : 'http://10.0.2.2:8001/api/v1';
    } else if (Platform.OS === 'ios') {
      // iOS simulator can use localhost
      // Physical iOS device would use your computer's IP  
      return isExpoGo ? 'http://192.168.53.65:8001/api/v1' : 'http://localhost:8001/api/v1';
    } else {
      // Web or other platforms
      return 'http://192.168.53.65:8001/api/v1';
    }
  } else {
    // Production environment
    return 'https://your-production-api.com/api/v1';
  }
};

// API Configuration
export const API_CONFIG = {
  development: {
    baseUrl: getApiBaseUrl(),
    timeout: 10000,
  },
  production: {
    baseUrl: 'https://your-production-api.com/api/v1',
    timeout: 15000,
  },
};

// Get current environment
const getCurrentEnvironment = (): 'development' | 'production' => {
  return __DEV__ ? 'development' : 'production';
};

export const currentConfig = API_CONFIG[getCurrentEnvironment()];

export default {
  API_BASE_URL: currentConfig.baseUrl,
  TIMEOUT: currentConfig.timeout,
  
  // Additional URLs for fallback connectivity testing
  FALLBACK_URLS: [
    'http://192.168.53.65:8001/api/v1',  // Your computer's IP
    'http://10.0.2.2:8001/api/v1',       // Android emulator
    'http://localhost:8001/api/v1',      // Local/iOS simulator  
  ],
};