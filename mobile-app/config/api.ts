/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

// For local development with Expo - use your machine's IP address
// Change this to your actual local IP if testing on physical device
// Use localhost for web or emulator
const LOCAL_API_URL = 'http://localhost:8000';
// For production (replace with actual production URL when deploying)
const PRODUCTION_API_URL = 'https://api.cinogrow.com';

// Use environment-based configuration
const isDevelopment = true; // Force development mode for now

const apiConfig = {
    // Base URL for all API requests
    API_BASE_URL: isDevelopment ? LOCAL_API_URL : PRODUCTION_API_URL,
    
    // API Version (if needed)
    API_VERSION: 'v1',
    
    // Timeout for API requests (in milliseconds)
    REQUEST_TIMEOUT: 30000,
    
    // Headers that should be included in every request
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    
    // Feature flags for API-dependent features
    FEATURES: {
        USE_ML_ANALYSIS: true,
        ENABLE_SOIL_ANALYSIS: true,
        ENABLE_CONTINUOUS_LEARNING: true,
    },
    
    // Endpoints configuration (for easy reference)
    ENDPOINTS: {
        AUTH: '/auth',
        FERTILIZER: '/fertilizer',
        ML_METADATA: '/ml-metadata',
        ANALYSIS: '/analysis',
    },
};

export default apiConfig;