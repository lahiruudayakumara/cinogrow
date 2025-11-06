// Farm Assistance API Service
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
          }
        );

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CreateActivityResponse = await response.json();
        console.log('✅ Activity record created successfully');
        return data;
      });
      
    } catch (error) {
      console.error('❌ Error creating activity record:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create activity record'
      };
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