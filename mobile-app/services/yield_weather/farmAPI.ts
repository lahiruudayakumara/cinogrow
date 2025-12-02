// Farm API Service
import { Alert } from 'react-native';
import apiConfig from '../../config/api';
import { DEFAULT_CINNAMON_VARIETY } from '../../constants/CinnamonVarieties';

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
  plot_name?: string; 
}

export interface DashboardStats {
  total_farms: number;
  total_area: number;
  active_plots: number;
  total_plots: number;
  farms: Farm[];
}

class FarmAPI {
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if fetch is available
        if (typeof fetch === 'undefined') {
          throw new Error('Fetch API is not available');
        }

        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`🚀 Making API request to: ${url}`);
        console.log(`🔧 Using base URL: ${API_BASE_URL}`);
        
        const requestOptions: RequestInit = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
          },
          ...options,
        };

        // Add timeout functionality using AbortController
        const timeoutMs = 30000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutMs);
        
        requestOptions.signal = controller.signal;

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          let errorData: string;
          try {
            errorData = await response.text();
          } catch (textError) {
            errorData = `${response.status} ${response.statusText}`;
          }
          console.error(`❌ HTTP Error ${response.status}: ${errorData}`);
          reject(new Error(`HTTP ${response.status}: ${errorData}`));
          return;
        }

        // Check if response has content
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            console.log(`✅ API response received:`, data);
            resolve(data);
          } catch (jsonError) {
            console.error('❌ JSON parsing error:', jsonError);
            reject(new Error('Invalid JSON response from server'));
          }
        } else {
          try {
            const text = await response.text();
            console.log(`📄 API response (text):`, text);
            resolve(text);
          } catch (textError) {
            console.error('❌ Text parsing error:', textError);
            reject(new Error('Failed to parse response'));
          }
        }
      } catch (error) {
        console.error('❌ API request failed:', error);
        
        if (error instanceof Error && (
          error.message.includes('Network request failed') ||
          error.message.includes('undefined is not a function') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('The operation was aborted') ||
          error.name === 'AbortError'
        )) {
          console.error('🔌 Network connectivity issue:', error);
          reject(new Error('Network connection failed. Please check your internet connection and ensure the backend server is running and accessible.'));
        } else {
          reject(error);
        }
      }
    });
  }

  // Farm CRUD operations
  async createFarm(farm: Omit<Farm, 'id' | 'created_at'>): Promise<Farm> {
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

  async updateFarm(farmId: number, farm: Omit<Farm, 'id' | 'created_at'>): Promise<Farm> {
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
  async createPlot(plot: Omit<Plot, 'id'>): Promise<Plot> {
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

  async updatePlot(plotId: number, plotData: Partial<Plot>): Promise<Plot> {
    return this.request(`/yield-weather/plots/${plotId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plotData),
    });
  }

  async updateFarmPlotAreas(farmId: number, plotsData: Partial<Plot>[]): Promise<{ message: string; plots: Plot[] }> {
    return this.request(`/yield-weather/farms/${farmId}/plots/areas`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plotsData),
    });
  }

  async updatePlotStatus(plotId: number, status: string, progress_percentage?: number): Promise<{ message: string; plot: Plot }> {
    const params = new URLSearchParams({ status });
    if (progress_percentage !== undefined) {
      params.append('progress_percentage', progress_percentage.toString());
    }
    
    return this.request(`/yield-weather/plots/${plotId}/status?${params.toString()}`, {
      method: 'PUT',
    });
  }

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request('/yield-weather/stats/dashboard');
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
        crop_type: plotData.crop_type || DEFAULT_CINNAMON_VARIETY,
        progress_percentage: 0,
      });
      plots.push(plot);
    }
    
    return plots;
  }

  async deletePlot(plotId: number): Promise<{ message: string }> {
    return this.request(`/yield-weather/plots/${plotId}`, {
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
      console.log('🔍 Testing backend connection...');
      
      // Health endpoint is at root level, not under /api/v1
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      const healthUrl = `${baseUrl}/health`;
      
      console.log(`🔍 Testing backend connection to: ${healthUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // Shorter timeout for connection test
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Backend connection successful:`, data);
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false; // Don't throw error, just return false
    }
  }
}

export const farmAPI = new FarmAPI();