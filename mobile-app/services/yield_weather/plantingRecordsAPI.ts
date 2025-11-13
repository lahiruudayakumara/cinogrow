// PlantingRecords API Service
import { Alert } from 'react-native';
import apiConfig from '../../config/api';

const API_BASE_URL = apiConfig.API_BASE_URL;

export interface PlantingRecord {
  record_id?: number;
  user_id: number;
  plot_id: number;
  plot_name?: string;
  plot_area: number;
  cinnamon_variety: string;
  seedling_count: number;
  planted_date: string;
  created_at?: string;
  is_local_only?: boolean; // Flag to track if this record exists only locally
}

export interface Plot {
  id: number;
  name: string;
  area: number;
  status: string;
}

class PlantingRecordsAPI {
  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📡 Making PlantingRecords API request to: ${url}`);
      console.log(`🔧 Using base URL: ${API_BASE_URL}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`❌ HTTP Error ${response.status}: ${errorData}`);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log(`✅ PlantingRecords API response received:`, data);
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error('❌ Network connectivity issue:', error);
        throw new Error('Network connection failed. Please check your internet connection and ensure the backend server is running and accessible.');
      } else {
        console.error('❌ PlantingRecords API request failed:', error);
        throw error;
      }
    }
  }

  // Get all planting records for a user
  async getUserPlantingRecords(userId: number): Promise<PlantingRecord[]> {
    return this.request(`/users/${userId}/planting-records`);
  }

  // Create a new planting record
  async createPlantingRecord(record: Omit<PlantingRecord, 'record_id' | 'created_at' | 'plot_name'>): Promise<PlantingRecord> {
    return this.request('/planting-records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  // Update a planting record
  async updatePlantingRecord(
    recordId: number, 
    updates: Partial<Omit<PlantingRecord, 'record_id' | 'user_id' | 'created_at' | 'plot_name'>>
  ): Promise<PlantingRecord> {
    return this.request(`/planting-records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Delete a planting record
  async deletePlantingRecord(recordId: number): Promise<{ message: string }> {
    return this.request(`/planting-records/${recordId}`, {
      method: 'DELETE',
    });
  }

  // Get farm plots (for dropdown)
  async getFarmPlots(farmId: number): Promise<Plot[]> {
    return this.request(`/farms/${farmId}/plots`);
  }

  // Get all farms (to get plots)
  async getFarms(): Promise<any[]> {
    return this.request('/farms');
  }

  // Test connection to backend
  async testConnection(): Promise<boolean> {
    try {
      // Health endpoint is at root level, not under /api/v1
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      const healthUrl = `${baseUrl}/health`;
      
      console.log(`🔍 Testing planting records backend connection to: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Backend connection successful:`, data);
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      throw new Error('Backend connection failed. Please check if the server is running.');
    }
  }
}

export const plantingRecordsAPI = new PlantingRecordsAPI();