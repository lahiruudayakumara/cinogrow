// Yield API Service
import { Alert } from 'react-native';
import apiConfig from '../../config/api';

const API_BASE_URL = apiConfig.API_BASE_URL;

export interface YieldDatasetRecord {
  id?: number;
  location: string;
  variety: string;
  area: number;
  yield: number;
}

export interface UserYieldRecord {
  yield_id?: number;
  user_id: number;
  plot_id: number;
  plot_name?: string;
  yield_amount: number;
  yield_date: string;
  created_at?: string;
}

export interface PredictedYield {
  plot_id: number;
  plot_name: string;
  plot_area: number;
  predicted_yield: number;
  confidence_score?: number;
  prediction_source: 'dataset_match' | 'ai_model' | 'average';
}

class YieldAPI {
  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📡 Making Yield API request to: ${url}`);
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
      console.log(`✅ Yield API response received:`, data);
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error('❌ Network connectivity issue:', error);
        throw new Error('Network connection failed. Please check your internet connection and ensure the backend server is running and accessible.');
      } else {
        console.error('❌ Yield API request failed:', error);
        throw error;
      }
    }
  }

  // User Yield Records
  async createUserYieldRecord(record: Omit<UserYieldRecord, 'yield_id' | 'created_at' | 'plot_name'>): Promise<UserYieldRecord> {
    return this.request('/yield-records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  async getUserYieldRecords(userId: number): Promise<UserYieldRecord[]> {
    return this.request(`/users/${userId}/yield-records`);
  }

  async updateUserYieldRecord(
    yieldId: number, 
    updates: Partial<Omit<UserYieldRecord, 'yield_id' | 'user_id' | 'created_at' | 'plot_name'>>
  ): Promise<UserYieldRecord> {
    return this.request(`/yield-records/${yieldId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUserYieldRecord(yieldId: number): Promise<{ message: string }> {
    return this.request(`/yield-records/${yieldId}`, {
      method: 'DELETE',
    });
  }

  // Yield Predictions
  async getPredictedYields(userId: number, location?: string): Promise<PredictedYield[]> {
    const params = new URLSearchParams();
    if (location) {
      params.append('location', location);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/users/${userId}/predicted-yields${queryString}`);
  }

  // Dataset operations (for admin/testing)
  async getYieldDataset(): Promise<YieldDatasetRecord[]> {
    return this.request('/yield-dataset');
  }

  async createYieldDatasetRecord(record: Omit<YieldDatasetRecord, 'id'>): Promise<YieldDatasetRecord> {
    return this.request('/yield-dataset', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  // Fallback prediction logic (client-side)
  async calculateFallbackPrediction(plotArea: number, location?: string, variety?: string): Promise<number> {
    try {
      // Try to get dataset records for prediction
      const dataset = await this.getYieldDataset();
      
      // Find matching records based on location and variety
      let matchingRecords = dataset;
      
      if (location) {
        matchingRecords = matchingRecords.filter(record => 
          record.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (variety) {
        matchingRecords = matchingRecords.filter(record => 
          record.variety.toLowerCase().includes(variety.toLowerCase())
        );
      }
      
      if (matchingRecords.length === 0) {
        // No exact matches, use all dataset for average
        matchingRecords = dataset;
      }
      
      // Calculate yield per hectare average
      const yieldPerHectare = matchingRecords.reduce((sum, record) => {
        return sum + (record.yield / record.area);
      }, 0) / matchingRecords.length;
      
      // Apply to plot area (assuming area is in hectares)
      const predictedYield = yieldPerHectare * plotArea;
      
      console.log(`🎯 Fallback prediction: ${predictedYield} kg for ${plotArea} ha`);
      return Math.round(predictedYield);
    } catch (error) {
      console.warn('Fallback prediction failed, using default:', error);
      // Use mock dataset for demonstration
      return this.calculateWithMockData(plotArea, location, variety);
    }
  }

  // Mock dataset for demonstration purposes
  private calculateWithMockData(plotArea: number, location?: string, variety?: string): number {
    // Mock cinnamon yield dataset (typical yields in Sri Lanka)
    const mockDataset = [
      { location: 'Sri Lanka', variety: 'Ceylon Cinnamon', area: 1, yield: 2800 },
      { location: 'Sri Lanka', variety: 'Ceylon Cinnamon', area: 2, yield: 5200 },
      { location: 'Sri Lanka', variety: 'Ceylon Cinnamon', area: 0.5, yield: 1300 },
      { location: 'Sri Lanka', variety: 'Ceylon Cinnamon', area: 3, yield: 7500 },
      { location: 'Sri Lanka', variety: 'Cassia', area: 1, yield: 3200 },
      { location: 'Sri Lanka', variety: 'Cassia', area: 2, yield: 6100 },
    ];

    // Find matching records
    let matchingRecords = mockDataset;
    
    if (location) {
      matchingRecords = matchingRecords.filter(record => 
        record.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    if (variety && variety.toLowerCase().includes('ceylon')) {
      matchingRecords = matchingRecords.filter(record => 
        record.variety.toLowerCase().includes('ceylon')
      );
    }

    // Calculate yield per hectare average
    const yieldPerHectare = matchingRecords.reduce((sum, record) => {
      return sum + (record.yield / record.area);
    }, 0) / matchingRecords.length;
    
    // Apply to plot area with some variation
    const baseYield = yieldPerHectare * plotArea;
    // Add 5-10% variation to make it more realistic
    const variation = 0.05 + (Math.random() * 0.05);
    const predictedYield = baseYield * (1 + variation);
    
    console.log(`🎯 Mock prediction: ${predictedYield} kg for ${plotArea} ha (${yieldPerHectare} kg/ha average)`);
    return Math.round(predictedYield);
  }

  // Test connection to backend
  async testConnection(): Promise<boolean> {
    try {
      // Health endpoint is at root level, not under /api/v1
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      const healthUrl = `${baseUrl}/health`;
      
      console.log(`🔍 Testing yield backend connection to: ${healthUrl}`);
      
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

export const yieldAPI = new YieldAPI();