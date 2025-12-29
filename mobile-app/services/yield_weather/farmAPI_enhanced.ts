/**
 * Enhanced Farm API Service with better error handling
 * This service now works with the improved backend cascade logic
 */
import { Alert } from 'react-native';
import apiConfig from '../../config/api';

const API_BASE_URL = apiConfig.API_BASE_URL;

export interface Farm {
  id?: number;
  name: string;
  owner_name: string;
  total_area: number;
  num_plots: number;
  location: string;
  latitude: number;
  longitude: number;
  
  // New computed fields from backend
  active_plots_count?: number;
  total_yield_kg?: number;
  last_activity_date?: string;
  
  created_at?: string;
  updated_at?: string;
}

export interface Plot {
  id?: number;
  farm_id: number;
  name: string;
  area: number;
  crop_type?: string;
  notes?: string;
  status: string;
  planting_date?: string;
  expected_harvest_date?: string;
  age_months?: number;
  progress_percentage: number;
  seedling_count: number;
  cinnamon_variety: string;
  
  // New computed fields from backend
  last_planting_date?: string;
  last_yield_date?: string;
  planting_records_count?: number;
  yield_records_count?: number;
  trees_count?: number;
  total_yield_kg?: number;
  average_yield_per_harvest?: number;
  best_yield_kg?: number;
  health_score?: number;
  estimated_next_harvest_date?: string;
  
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id?: number;
  farm_id: number;
  plot_id?: number;
  activity_type: string;
  description: string;
  activity_date: string;
  cost?: number;
  created_at?: string;
}

class FarmAPI {
  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📡 Farm API request: ${url}`);
      
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
      console.log(`✅ Farm API response:`, data);
      return data;
    } catch (error) {
      console.error('❌ Farm API request failed:', error);
      throw error;
    }
  }

  // Farm operations
  async createFarm(farm: Omit<Farm, 'id' | 'created_at' | 'updated_at'>): Promise<Farm> {
    return this.request('/yield-weather/farms', {
      method: 'POST',
      body: JSON.stringify(farm),
    });
  }

  async getFarms(): Promise<Farm[]> {
    return this.request('/yield-weather/farms');
  }

  async getFarm(farmId: number): Promise<Farm> {
    return this.request(`/yield-weather/farms/${farmId}`);
  }

  async updateFarm(farmId: number, farm: Omit<Farm, 'id' | 'created_at' | 'updated_at'>): Promise<Farm> {
    return this.request(`/yield-weather/farms/${farmId}`, {
      method: 'PUT',
      body: JSON.stringify(farm),
    });
  }

  async deleteFarm(farmId: number): Promise<{ message: string }> {
    return this.request(`/yield-weather/farms/${farmId}`, {
      method: 'DELETE',
    });
  }

  // Plot operations
  async createPlot(plot: Omit<Plot, 'id' | 'created_at' | 'updated_at'>): Promise<Plot> {
    return this.request('/yield-weather/plots', {
      method: 'POST',
      body: JSON.stringify(plot),
    });
  }

  async getFarmPlots(farmId: number): Promise<Plot[]> {
    return this.request(`/yield-weather/farms/${farmId}/plots`);
  }

  async getPlot(plotId: number): Promise<Plot> {
    return this.request(`/yield-weather/plots/${plotId}`);
  }

  async updatePlot(plotId: number, plot: Partial<Plot>): Promise<Plot> {
    return this.request(`/yield-weather/plots/${plotId}`, {
      method: 'PUT',
      body: JSON.stringify(plot),
    });
  }

  async deletePlot(plotId: number): Promise<{ message: string }> {
    return this.request(`/yield-weather/plots/${plotId}`, {
      method: 'DELETE',
    });
  }

  // Activity operations
  async createActivity(activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity> {
    return this.request('/yield-weather/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  }

  async getFarmActivities(farmId: number): Promise<Activity[]> {
    return this.request(`/yield-weather/farms/${farmId}/activities`);
  }

  async getPlotActivities(plotId: number): Promise<Activity[]> {
    return this.request(`/yield-weather/plots/${plotId}/activities`);
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      const healthUrl = `${baseUrl}/health`;
      
      console.log(`🔍 Testing farm backend connection to: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
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

export const farmAPI = new FarmAPI();