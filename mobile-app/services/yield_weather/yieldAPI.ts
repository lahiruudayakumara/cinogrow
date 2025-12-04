// Yield API Service
import { Alert } from 'react-native';
import apiConfig from '../../config/api';
import { DEFAULT_CINNAMON_VARIETY } from '../../constants/CinnamonVarieties';

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
  prediction_source: 'hybrid_model' | 'dataset_match' | 'ai_model' | 'ml_model' | 'average';
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
    return this.request('/yield-weather/yield-records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  async getUserYieldRecords(userId: number): Promise<UserYieldRecord[]> {
    return this.request(`/yield-weather/users/${userId}/yield-records`);
  }

  async updateUserYieldRecord(
    yieldId: number, 
    updates: Partial<Omit<UserYieldRecord, 'yield_id' | 'user_id' | 'created_at' | 'plot_name'>>
  ): Promise<UserYieldRecord> {
    return this.request(`/yield-weather/yield-records/${yieldId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUserYieldRecord(yieldId: number): Promise<{ message: string }> {
    return this.request(`/yield-weather/yield-records/${yieldId}`, {
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
    return this.request(`/yield-weather/users/${userId}/predicted-yields${queryString}`);
  }

  // ML Model Predictions
  async predictYieldML(
    location: string,
    variety: string,
    area: number,
    plotId?: number,
    rainfall?: number,
    temperature?: number,
    ageYears?: number
  ): Promise<{
    predicted_yield: number | null;
    confidence_score: number;
    prediction_source: string;
    model_version?: string;
    error?: string;
    message?: string;
    requires_planting?: boolean;
  }> {
    // Build query parameters for the ML API
    const params = new URLSearchParams();
    params.append('location', location);
    params.append('variety', variety);
    params.append('area', area.toString());
    
    if (plotId) params.append('plot_id', plotId.toString());
    if (rainfall) params.append('rainfall', rainfall.toString());
    if (temperature) params.append('temperature', temperature.toString());
    if (ageYears) params.append('age_years', ageYears.toString());

    const queryString = params.toString();
    return this.request(`/ml/predict-single?${queryString}`, {
      method: 'POST',
    });
  }

  // Real Hybrid Yield Prediction with actual tree sampling data
  async predictHybridYield(
    plotId: number,
    sampleTrees: Array<{
      tree_code?: string;
      stem_diameter_mm: number;
      fertilizer_used: boolean;
      fertilizer_type?: 'organic' | 'npk' | 'urea' | 'compost' | null;
      disease_status: 'none' | 'mild' | 'severe';
      num_existing_stems: number;
      tree_age_years?: number;
    }>,
    environmentalFactors?: {
      rainfall?: number;
      temperature?: number;
    },
    treesPerPlot?: number // New parameter for total trees in plot
  ): Promise<{
    plot_id: number;
    plot_area: number;
    sample_size: number;
    final_hybrid_yield_kg: number;
    yield_per_hectare: number;
    confidence_score: number;
    tree_model_yield_kg: number;
    plot_model_yield_kg: number;
    avg_predicted_canes_per_tree: number;
    avg_predicted_fresh_weight_per_tree: number;
    avg_predicted_dry_weight_per_tree: number;
    estimated_trees_per_hectare: number;
    total_estimated_trees: number;
    tree_model_confidence: number;
    plot_model_confidence: number;
    blending_weight_tree: number;
    blending_weight_plot: number;
    prediction_date: string;
    model_versions: any;
    features_used: any;
    estimated_dry_bark_percentage: number;
    estimated_market_price_per_kg?: number;
    estimated_revenue?: number;
    notes?: string;
    error?: string;
  }> {
    const requestBody = {
      plot_id: plotId,
      sample_trees: sampleTrees.map(tree => ({
        tree_code: tree.tree_code,
        stem_diameter_mm: tree.stem_diameter_mm,
        fertilizer_used: tree.fertilizer_used,
        fertilizer_type: tree.fertilizer_type,
        disease_status: tree.disease_status,
        num_existing_stems: tree.num_existing_stems,
        tree_age_years: tree.tree_age_years || 4.0,
      })),
      trees_per_plot: treesPerPlot, // Include total trees count
      rainfall_recent_mm: environmentalFactors?.rainfall || 2500,
      temperature_recent_c: environmentalFactors?.temperature || 26,
      notes: `Mobile app tree sampling with ${sampleTrees.length} trees${treesPerPlot ? ` out of ${treesPerPlot} total trees` : ''}`
    };

    console.log('🌳 Making real hybrid prediction request:', requestBody);
    
    return this.request('/yield-weather/hybrid-prediction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  }

  // Quick hybrid prediction without detailed tree sampling
  async predictQuickHybrid(
    plotId: number
  ): Promise<{
    predicted_yield: number;
    confidence_score: number;
    prediction_source: string;
    estimated_trees_count: number;
    error?: string;
  }> {
    const params = new URLSearchParams();
    params.append('plot_id', plotId.toString());

    return this.request(`/hybrid-prediction/quick-predict?${params.toString()}`, {
      method: 'POST',
    });
  }

  async getModelInfo(): Promise<any> {
    return this.request('/yield-weather/ml/model-info');
  }

  async trainModel(retrain: boolean = false): Promise<any> {
    return this.request(`/ml/train-model?retrain=${retrain}`, {
      method: 'POST',
    });
  }

  // Comprehensive prediction method (tries Hybrid first, then ML, then fallback)
  async predictYield(
    plotArea: number,
    location: string = 'Sri Lanka',
    variety: string = DEFAULT_CINNAMON_VARIETY,
    plotId?: number,
    rainfall?: number,
    temperature?: number,
    ageYears?: number
  ): Promise<{
    predicted_yield: number | null;
    confidence_score: number;
    prediction_source: 'hybrid_model' | 'ml_model' | 'historical_data' | 'mock_data' | 'not_planted';
    method_used: string;
    error?: string;
    message?: string;
    requires_planting?: boolean;
  }> {
    console.log('🤖 Starting comprehensive yield prediction for:', { plotArea, location, variety });
    
    // Step 1: Try Hybrid Model first if plotId is available
    if (plotId) {
      try {
        console.log('🌳 Attempting hybrid yield prediction...');
        const hybridResult = await this.predictQuickHybrid(plotId);
        
        console.log('📊 Hybrid API Response:', hybridResult);
        
        if (hybridResult.predicted_yield && hybridResult.predicted_yield > 0) {
          console.log('✅ Hybrid prediction successful');
          return {
            predicted_yield: hybridResult.predicted_yield,
            confidence_score: hybridResult.confidence_score,
            prediction_source: 'hybrid_model',
            method_used: `Hybrid Model (${hybridResult.estimated_trees_count} trees estimated)`,
            message: `Advanced hybrid prediction using tree-level and plot-level ML models`
          };
        }
      } catch (hybridError) {
        console.warn('⚠️ Hybrid prediction failed, falling back to standard ML:', hybridError);
        // Continue to next method
      }
    }
    
    // Step 2: Try Standard ML Model
    try {
      console.log('🔬 Attempting standard ML model prediction...');
      const mlResult = await this.predictYieldML(
        location,
        variety,
        plotArea,
        plotId,
        rainfall,
        temperature,
        ageYears
      );
      
      console.log('📊 ML API Response:', mlResult);
      
      // Check if plot is not planted
      if (mlResult.error === 'Plot not planted' || mlResult.requires_planting) {
        console.log('🚫 Plot not planted - cannot predict yield');
        return {
          predicted_yield: null,
          confidence_score: 0.0,
          prediction_source: 'not_planted',
          method_used: 'Validation Check',
          error: mlResult.error || 'Plot not planted',
          message: mlResult.message || 'Cannot predict yield for a plot that hasn\'t been planted yet',
          requires_planting: true
        };
      }
      
      // Check if ML actually worked or fell back
      if (mlResult.prediction_source === 'ml_model' || mlResult.prediction_source === 'enhanced_ml_model') {
        console.log('✅ ML Model prediction successful!');
        return {
          predicted_yield: mlResult.predicted_yield,
          confidence_score: mlResult.confidence_score,
          prediction_source: 'ml_model',
          method_used: `ML Model (${mlResult.model_version || 'v2.0'})`
        };
      } else {
        console.warn('⚠️ ML API returned fallback result, trying historical data...');
        throw new Error('ML API used fallback');
      }
      
    } catch (mlError) {
      console.warn('⚠️ ML model prediction failed:', mlError);
      console.log('📊 Falling back to historical data method...');
      
      // Step 2: Fallback to historical data
      try {
        const fallbackResult = await this.calculateFallbackPrediction(plotArea, location, variety);
        
        return {
          predicted_yield: fallbackResult,
          confidence_score: 0.75, // Good confidence for historical data
          prediction_source: 'historical_data',
          method_used: 'Historical Data Average'
        };
        
      } catch (fallbackError) {
        console.warn('⚠️ Historical data prediction failed:', fallbackError);
        console.log('🎯 Using final mock data fallback...');
        
        // Step 3: Final fallback to mock data
        const mockResult = this.calculateWithMockData(plotArea, location, variety);
        
        return {
          predicted_yield: mockResult,
          confidence_score: 0.5, // Lower confidence for mock data
          prediction_source: 'mock_data',
          method_used: 'Mock Data (Default Values)'
        };
      }
    }
  }

  // Dataset operations (for admin/testing)
  async getYieldDataset(): Promise<YieldDatasetRecord[]> {
    return this.request('/yield-weather/yield-dataset');
  }

  async createYieldDatasetRecord(record: Omit<YieldDatasetRecord, 'id'>): Promise<YieldDatasetRecord> {
    return this.request('/yield-weather/yield-dataset', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  // Fallback prediction logic (client-side)
  async calculateFallbackPrediction(plotArea: number, location?: string, variety?: string): Promise<number> {
    try {
      // Validate input parameters
      if (!plotArea || plotArea <= 0 || !isFinite(plotArea)) {
        console.warn('Invalid plot area provided to fallback prediction, using mock data');
        return this.calculateWithMockData(plotArea || 1, location, variety);
      }
      
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
      
      // If still no records or empty dataset, use mock data
      if (!matchingRecords || matchingRecords.length === 0) {
        console.warn('No yield records available, using mock data for fallback prediction');
        return this.calculateWithMockData(plotArea, location, variety);
      }
      
      // Filter out invalid records (area must be positive)
      // Handle both 'yield' and 'yield_amount' field names for backend compatibility
      const validRecords = matchingRecords.filter(record => {
        if (!record) return false;
        
        const yieldValue = (record as any).yield_amount || record.yield;
        const areaValue = record.area;
        
        return typeof yieldValue === 'number' && 
               typeof areaValue === 'number' && 
               areaValue > 0 && 
               !isNaN(yieldValue) && 
               !isNaN(areaValue) &&
               yieldValue > 0;
      });
      
      if (validRecords.length === 0) {
        console.warn('No valid yield records found, using mock data for fallback prediction');
        return this.calculateWithMockData(plotArea, location, variety);
      }
      
      // Calculate yield per hectare average
      const totalYieldPerHectare = validRecords.reduce((sum, record) => {
        // Handle both 'yield' and 'yield_amount' field names
        const yieldValue = (record as any).yield_amount || record.yield;
        const yieldPerHa = yieldValue / record.area;
        return sum + yieldPerHa;
      }, 0);
      
      const yieldPerHectare = totalYieldPerHectare / validRecords.length;
      
      // Validate the calculated yield per hectare
      if (!isFinite(yieldPerHectare) || isNaN(yieldPerHectare) || yieldPerHectare <= 0) {
        console.warn('Invalid yield per hectare calculated, using mock data for fallback prediction');
        return this.calculateWithMockData(plotArea, location, variety);
      }
      
      // Apply to plot area (assuming area is in hectares)
      const predictedYield = yieldPerHectare * plotArea;
      
      // Validate final prediction
      if (!isFinite(predictedYield) || isNaN(predictedYield) || predictedYield <= 0) {
        console.warn('Invalid prediction calculated, using mock data for fallback prediction');
        return this.calculateWithMockData(plotArea, location, variety);
      }
      
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

    // Ensure we have valid records
    if (!matchingRecords || matchingRecords.length === 0) {
      matchingRecords = mockDataset; // Use all mock data if no matches
    }
    
    // Validate plot area
    if (!plotArea || plotArea <= 0 || !isFinite(plotArea)) {
      console.warn('Invalid plot area provided, using default 1 hectare');
      plotArea = 1;
    }
    
    // Calculate yield per hectare average with validation
    let totalYieldPerHa = 0;
    let validRecordCount = 0;
    
    for (const record of matchingRecords) {
      if (record.area > 0 && record.yield > 0 && isFinite(record.yield) && isFinite(record.area)) {
        totalYieldPerHa += (record.yield / record.area);
        validRecordCount++;
      }
    }
    
    // Fallback to default yield if no valid records
    const yieldPerHectare = validRecordCount > 0 
      ? totalYieldPerHa / validRecordCount 
      : 2500; // Default: 2500 kg/ha for cinnamon
    
    // Apply to plot area with some variation
    const baseYield = yieldPerHectare * plotArea;
    // Add 5-10% variation to make it more realistic
    const variation = 0.05 + (Math.random() * 0.05);
    const predictedYield = baseYield * (1 + variation);
    
    // Final validation
    const finalYield = isFinite(predictedYield) && predictedYield > 0 
      ? Math.round(predictedYield) 
      : Math.round(2500 * plotArea); // Absolute fallback
    
    console.log(`🎯 Mock prediction: ${finalYield} kg for ${plotArea} ha (${yieldPerHectare.toFixed(1)} kg/ha average)`);
    return finalYield;
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