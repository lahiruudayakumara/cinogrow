// Weather API service for Cinogrow mobile app
import { Platform } from 'react-native';

// Multiple fallback URLs for better connectivity
const getApiUrls = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return [
        'http://10.0.2.2:8001/api/v1',        // Android emulator special IP
        'http://192.168.53.65:8001/api/v1',   // Your actual Wi-Fi IP
        'http://127.0.0.1:8001/api/v1'        // Localhost fallback
      ];
    } else if (Platform.OS === 'ios') {
      return [
        'http://192.168.53.65:8001/api/v1',   // Your actual Wi-Fi IP
        'http://127.0.0.1:8001/api/v1',       // Localhost fallback
        'http://10.0.2.2:8001/api/v1'         // iOS simulator fallback
      ];
    } else {
      return ['http://127.0.0.1:8001/api/v1'];
    }
  } else {
    return ['https://your-production-domain.com/api/v1'];
  }
};

const API_URLS = getApiUrls();
const PRIMARY_API_URL = API_URLS[0];

export interface WeatherData {
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  rainfall: number;
  weather_main: string;
  weather_description: string;
  icon: string;
  visibility: number;
}

export interface WeatherResponse {
  success: boolean;
  data?: WeatherData;
  message: string;
  location: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

class WeatherAPI {
  private baseUrl: string;
  private fallbackUrls: string[];

  constructor() {
    this.fallbackUrls = API_URLS;
    this.baseUrl = PRIMARY_API_URL;
    console.log(`🔗 Weather API initialized with primary URL: ${this.baseUrl}`);
    console.log(`🔄 Fallback URLs available: ${this.fallbackUrls.length - 1}`);
  }

  /**
   * Try multiple URLs until one works
   */
  private async tryMultipleUrls<T>(
    requestFn: (baseUrl: string) => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.fallbackUrls.length; i++) {
      const url = this.fallbackUrls[i];
      try {
        console.log(`🔄 Trying API URL [${i + 1}/${this.fallbackUrls.length}]: ${url}`);
        const result = await requestFn(url);
        
        // If successful and not the primary URL, update it
        if (i > 0) {
          console.log(`✅ Found working URL: ${url}`);
          this.baseUrl = url;
        }
        
        return result;
      } catch (error) {
        console.log(`❌ Failed with URL ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }
    
    throw lastError || new Error('All API URLs failed');
  }

  /**
   * Get current weather by coordinates
   */
  async getCurrentWeather(coordinates: LocationCoords): Promise<WeatherResponse> {
    try {
      console.log(`🌤️  Fetching weather for coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
      
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/weather/current?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: WeatherResponse = await response.json();
        console.log('✅ Weather data received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching weather data:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch weather data',
        location: 'Unknown'
      };
    }
  }

  /**
   * Get current weather by city name
   */
  async getWeatherByCity(cityName: string): Promise<WeatherResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/weather/city?city=${encodeURIComponent(cityName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: WeatherResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching weather data by city:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch weather data',
        location: 'Unknown'
      };
    }
  }

  /**
   * Post coordinates to get weather data
   */
  async postCurrentWeather(coordinates: LocationCoords): Promise<WeatherResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/weather/current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coordinates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: WeatherResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error posting weather data:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch weather data',
        location: 'Unknown'
      };
    }
  }

  /**
   * Check if weather service is healthy
   */
  async checkHealth(): Promise<{ status: string; service: string; message: string }> {
    try {
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/weather/health`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      });
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'weather',
        message: error instanceof Error ? error.message : 'Service unavailable'
      };
    }
  }
}

// Export singleton instance
export const weatherAPI = new WeatherAPI();
export default weatherAPI;
