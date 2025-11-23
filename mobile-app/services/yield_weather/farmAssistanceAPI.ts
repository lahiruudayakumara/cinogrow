// Farm Assistance API Service
import { Platform } from 'react-native';
import apiConfig from '../../config/api';

// Multiple fallback URLs for better connectivity
const getApiUrls = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return [
        apiConfig.ENV.API_BASE_URL,           // Environment configured IP (PRIMARY)
        'http://10.0.2.2:8000/api/v1',       // Android emulator special IP
        'http://127.0.0.1:8000/api/v1'       // Localhost fallback
      ];
    } else if (Platform.OS === 'ios') {
      return [
        apiConfig.ENV.API_BASE_URL,          // Environment configured IP (PRIMARY)
        'http://127.0.0.1:8000/api/v1',      // Localhost fallback
        'http://10.0.2.2:8000/api/v1'        // iOS simulator fallback
      ];
    } else {
      return [
        apiConfig.ENV.API_BASE_URL,          // Environment configured IP (PRIMARY)
        'http://127.0.0.1:8000/api/v1'       // Localhost fallback
      ];
    }
  } else {
    return [apiConfig.ENV.PROD_API_BASE_URL];
  }
};

const API_URLS = getApiUrls();
const PRIMARY_API_URL = API_URLS[0];

export interface Recommendation {
  id: string;
  activityName: string;
  recommendedAction: string;
  triggerCondition: string;
  reason: string;
  suggestedDate: string;
  priority: 'high' | 'medium' | 'low';
}

export interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  weather_description: string;
}

export interface ActivityRecord {
  id?: number;
  user_id: number;
  plot_id: number;
  activity_name: string;
  activity_date: string;
  trigger_condition: string;
  weather_snapshot: WeatherSnapshot;
  plot_name?: string;
  formatted_date?: string;
}

export interface PlotWithAge {
  plot_id: number;
  plot_name: string;
  farm_id: number;
  farm_name: string;
  planting_record_id: number;
  planted_date: string;
  days_old: number;
  growth_stage: {
    name: string;
    stage_number: number;
    days_old: number;
  };
  cinnamon_variety: string;
  seedling_count: number;
  plot_area: number;
  plot_status: string;
  farm_location: string;
}

export interface PlotsWithAgeResponse {
  success: boolean;
  data?: PlotWithAge[];
  message: string;
}

export interface ActivityHistoryResponse {
  success: boolean;
  data?: ActivityRecord[];
  message: string;
}

export interface CreateActivityResponse {
  success: boolean;
  data?: ActivityRecord;
  message: string;
}

class FarmAssistanceAPI {
  private baseUrl: string;
  private fallbackUrls: string[];

  constructor() {
    this.fallbackUrls = API_URLS;
    this.baseUrl = PRIMARY_API_URL;
    console.log(`🔗 Farm Assistance API initialized with primary URL: ${this.baseUrl}`);
  }

  /**
   * Try multiple URLs until one works
   */
  private async tryMultipleUrls<T>(
    requestFn: (baseUrl: string) => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    let connectivityErrors: string[] = [];
    
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Failed with URL ${url}: ${errorMessage}`);
        connectivityErrors.push(`${url}: ${errorMessage}`);
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }
    
    // Provide detailed connectivity information
    const detailedError = new Error(
      `Network request failed - tried all API URLs:\n${connectivityErrors.join('\n')}\n\nMake sure the backend server is running on one of these addresses.`
    );
    
    throw lastError || detailedError;
  }

  /**
   * Create a new activity record
   */
  async createActivityRecord(activityRecord: Omit<ActivityRecord, 'id'>): Promise<CreateActivityResponse> {
    try {
      console.log(`📝 Creating activity record:`, activityRecord);
      
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/activity-records`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(activityRecord),
            // Add timeout to prevent hanging
          }
        );

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          // Get error details from response body
          let errorDetail = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.message || errorDetail;
          } catch (parseError) {
            const responseText = await response.text();
            if (responseText) {
              errorDetail = responseText;
            }
          }
          
          throw new Error(`API Error: ${errorDetail}`);
        }

        const data: CreateActivityResponse = await response.json();
        console.log('✅ Activity record created successfully:', data);
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error creating activity record:', error);
      
      // Don't wrap the error again - throw it for the caller to handle
      throw error;
    }
  }

  /**
   * Get activity history for a user
   */
  async getActivityHistory(userId: number, limit?: number): Promise<ActivityHistoryResponse> {
    try {
      console.log(`📜 Fetching activity history for user: ${userId}`);
      
      const params = new URLSearchParams();
      if (limit) {
        params.append('limit', limit.toString());
      }

      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/activity-records/${userId}?${params.toString()}`,
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

        const data: ActivityHistoryResponse = await response.json();
        console.log('✅ Activity history received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching activity history:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch activity history'
      };
    }
  }

  /**
   * Get activity history for a specific plot
   */
  async getPlotActivityHistory(plotId: number, limit?: number): Promise<ActivityHistoryResponse> {
    try {
      console.log(`📜 Fetching activity history for plot: ${plotId}`);
      
      const params = new URLSearchParams();
      if (limit) {
        params.append('limit', limit.toString());
      }

      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/activity-records/plot/${plotId}?${params.toString()}`,
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

        const data: ActivityHistoryResponse = await response.json();
        console.log('✅ Plot activity history received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching plot activity history:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch plot activity history'
      };
    }
  }

  /**
   * Delete an activity record
   */
  async deleteActivityRecord(recordId: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Deleting activity record: ${recordId}`);
      
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/activity-records/${recordId}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Activity record deleted successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error deleting activity record:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete activity record'
      };
    }
  }

  /**
   * Get plots with age information
   */
  async getPlotsWithAge(userId: number): Promise<PlotsWithAgeResponse> {
    try {
      console.log(`📊 Fetching plots with age info for user: ${userId}`);
      
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/plots-with-age/${userId}`,
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

        const data: PlotsWithAgeResponse = await response.json();
        console.log('✅ Plots with age info received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching plots with age info:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch plots with age info'
      };
    }
  }

  /**
   * Get activity history for home screen display
   */
  async getHomeActivityHistory(userId: number, limit?: number): Promise<ActivityHistoryResponse> {
    try {
      console.log(`🏠 Fetching home activity history for user: ${userId}`);
      
      const params = new URLSearchParams();
      if (limit) {
        params.append('limit', limit.toString());
      }

      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/activity-records/home/${userId}?${params.toString()}`,
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

        const data: ActivityHistoryResponse = await response.json();
        console.log('✅ Home activity history received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching home activity history:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch home activity history'
      };
    }
  }

  /**
   * Get demo farm assistance cards
   */
  async getDemoFarmCards(): Promise<any> {
    try {
      console.log(`🎭 Fetching demo farm assistance cards`);
      
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/demo-farm-cards`,
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

        const data = await response.json();
        console.log('✅ Demo farm cards received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching demo farm cards:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch demo farm cards'
      };
    }
  }

  /**
   * Get contact information for Cinnamon Research Center
   */
  async getContactInfo(): Promise<any> {
    try {
      console.log(`📞 Fetching contact information`);
      
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/contact-info`,
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

        const data = await response.json();
        console.log('✅ Contact information received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching contact information:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch contact information'
      };
    }
  }

  /**
   * Get real-time plot updates
   */
  async getRealtimePlotUpdates(userId: number): Promise<any> {
    try {
      console.log(`🔄 Fetching real-time plot updates for user: ${userId}`);
      
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/farm-assistance/plots/realtime-updates/${userId}`,
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

        const data = await response.json();
        console.log('✅ Real-time plot updates received successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error fetching real-time plot updates:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch real-time plot updates'
      };
    }
  }

  /**
   * Check if farm assistance service is healthy
   */
  async checkHealth(): Promise<{ status: string; service: string; message: string }> {
    try {
      return await this.tryMultipleUrls(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/farm-assistance/health`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      });
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'farm-assistance',
        message: error instanceof Error ? error.message : 'Service unavailable'
      };
    }
  }
}

// Export singleton instance
export const farmAssistanceAPI = new FarmAssistanceAPI();
export default farmAssistanceAPI;