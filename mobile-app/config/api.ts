import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || Constants.expoConfig?.extra?.[key] || fallback;
};

// Environment configuration - Single source from .env file
const API_HOST = getEnvVar('API_BASE_HOST', '192.168.1.2');
const API_PORT = getEnvVar('API_PORT', '8000');

const ENV_CONFIG = {
  API_BASE_HOST: API_HOST,
  API_PORT: API_PORT,
  API_BASE_URL: `http://${API_HOST}:${API_PORT}/api/v1`,
  PROD_API_BASE_URL: getEnvVar('PROD_API_BASE_URL', 'https://your-production-api.com/api/v1'),
  API_TIMEOUT: parseInt(getEnvVar('API_TIMEOUT', '10000')),
  PROD_API_TIMEOUT: parseInt(getEnvVar('PROD_API_TIMEOUT', '15000')),
  HEALTH_ENDPOINT: `http://${API_HOST}:${API_PORT}/health`,
};

// Detect the environment and platform
const getApiBaseUrl = (): string => {
  // Check if running in Expo Go or development build
  const isExpoGo = Constants.appOwnership === 'expo';
  
  if (__DEV__) {
    // Development environment - Use environment variable
    return ENV_CONFIG.API_BASE_URL;
  } else {
    // Production environment
    return ENV_CONFIG.PROD_API_BASE_URL;
  }
};

// API Configuration
export const API_CONFIG = {
  development: {
    baseUrl: getApiBaseUrl(),
    timeout: ENV_CONFIG.API_TIMEOUT,
  },
  production: {
    baseUrl: ENV_CONFIG.PROD_API_BASE_URL,
    timeout: ENV_CONFIG.PROD_API_TIMEOUT,
  },
};

// Get current environment
const getCurrentEnvironment = (): 'development' | 'production' => {
  return __DEV__ ? 'development' : 'production';
};

export const currentConfig = API_CONFIG[getCurrentEnvironment()];

// API Version (if needed)
const API_VERSION = 'v1';

// Timeout for API requests (in milliseconds)
const REQUEST_TIMEOUT = 30000;

// Headers that should be included in every request
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Feature flags for API-dependent features
const FEATURES = {
  USE_ML_ANALYSIS: true,
  ENABLE_SOIL_ANALYSIS: true,
  ENABLE_CONTINUOUS_LEARNING: true,
};

// Endpoints configuration (for easy reference)
const ENDPOINTS = {
  AUTH: '/auth',
  FERTILIZER: '/fertilizer',
  ML_METADATA: '/ml-metadata',
  ANALYSIS: '/analysis',
};

export default {
  API_BASE_URL: currentConfig.baseUrl,
  TIMEOUT: currentConfig.timeout,
  API_VERSION,
  REQUEST_TIMEOUT,
  DEFAULT_HEADERS,
  FEATURES,
  ENDPOINTS,
  
  // Additional URLs for fallback connectivity testing
  FALLBACK_URLS: [
    ENV_CONFIG.API_BASE_URL,             // Environment configured IP
    'http://10.0.2.2:8000/api/v1',       // Android emulator
    'http://localhost:8000/api/v1',      // Local/iOS simulator  
  ],
  
  // Export environment configuration for use in other files
  ENV: ENV_CONFIG,
};
