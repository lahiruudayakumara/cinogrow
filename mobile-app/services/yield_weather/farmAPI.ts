// Farm API Service
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
  created_at?: string;
}

export interface Plot {
  id?: number;
  farm_id: number;
  name: string;
  area: number;
  status: 'PREPARING' | 'PLANTED' | 'GROWING' | 'MATURE' | 'HARVESTING' | 'HARVESTED' | 'RESTING';
  crop_type?: string;
  planting_date?: string;
  expected_harvest_date?: string;
  age_months?: number;
  progress_percentage: number;
}

export interface Activity {
  id: number;
  farm_id: number;
  plot_id?: number;
  activity_type: string;
  description: string;
  activity_date: string;
  cost?: number;
  created_at?: string;
  plot_name?: string; // For display purposes
}

export interface DashboardStats {
  total_farms: number;
  total_area: number;
  active_plots: number;
  total_plots: number;
  farms: Farm[];
}

class FarmAPI {
  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📡 Making API request to: ${url}`);
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
      console.log(`✅ API response received:`, data);
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error('❌ Network connectivity issue:', error);
        throw new Error('Network connection failed. Please check your internet connection and ensure the backend server is running and accessible.');
      } else {
        console.error('❌ API request failed:', error);
        throw error;
      }
    }
  }

  // Farm CRUD operations
  async createFarm(farm: Omit<Farm, 'id' | 'created_at'>): Promise<Farm> {
    return this.request('/farms', {
      method: 'POST',
      body: JSON.stringify(farm),
    });
  }

  async getFarms(): Promise<Farm[]> {
    return this.request('/farms');
  }

  async getFarm(farmId: number): Promise<Farm> {
    return this.request(`/farms/${farmId}`);
  }

  async updateFarm(farmId: number, farm: Omit<Farm, 'id' | 'created_at'>): Promise<Farm> {
    return this.request(`/farms/${farmId}`, {
      method: 'PUT',
      body: JSON.stringify(farm),
    });
  }

  async deleteFarm(farmId: number): Promise<{ message: string }> {
    return this.request(`/farms/${farmId}`, {
      method: 'DELETE',
    });
  }

  // Plot operations
  async createPlot(plot: Omit<Plot, 'id'>): Promise<Plot> {
    return this.request('/plots', {
      method: 'POST',
      body: JSON.stringify(plot),
    });
  }

  async getFarmPlots(farmId: number): Promise<Plot[]> {
    return this.request(`/farms/${farmId}/plots`);
  }

  async getPlot(plotId: number): Promise<Plot> {
    return this.request(`/plots/${plotId}`);
  }

  async updatePlot(plotId: number, plotData: Partial<Plot>): Promise<Plot> {
    return this.request(`/plots/${plotId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plotData),
    });
  }

  async updatePlotStatus(plotId: number, status: string, progress_percentage?: number): Promise<{ message: string; plot: Plot }> {
    const params = new URLSearchParams({ status });
    if (progress_percentage !== undefined) {
      params.append('progress_percentage', progress_percentage.toString());
    }
    
    return this.request(`/plots/${plotId}/status?${params.toString()}`, {
      method: 'PUT',
    });
  }

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request('/stats/dashboard');
  }

  // Batch operations for creating multiple plots
  async createMultiplePlots(farmId: number, plotsData: { name: string; area: number; crop_type?: string }[]): Promise<Plot[]> {
    const plots: Plot[] = [];
    
    for (const plotData of plotsData) {
      const plot = await this.createPlot({
        farm_id: farmId,
        name: plotData.name,
        area: plotData.area,
        status: 'PREPARING' as const,
        crop_type: plotData.crop_type || 'Cinnamon',
        progress_percentage: 0,
      });
      plots.push(plot);
    }
    
    return plots;
  }

  async deletePlot(plotId: number): Promise<{ message: string }> {
    return this.request(`/plots/${plotId}`, {
      method: 'DELETE',
    });
  }

  // Delete all plots for a farm (used when changing plot count)
  async deleteAllFarmPlots(farmId: number): Promise<void> {
    const plots = await this.getFarmPlots(farmId);
    for (const plot of plots) {
      if (plot.id) {
        await this.deletePlot(plot.id);
      }
    }
  }

  // Test connection to backend
  async testConnection(): Promise<boolean> {
    try {
      // Health endpoint is at root level, not under /api/v1
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      const healthUrl = `${baseUrl}/health`;
      
      console.log(`🔍 Testing backend connection to: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout for mobile networks
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

export const farmAPI = new FarmAPI();