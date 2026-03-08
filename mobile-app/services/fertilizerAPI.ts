/**
 * Fertilizer API Service - Roboflow Only
 * Simplified to use only Roboflow deficiency detection through backend
 */

import apiConfig from '../config/api';

const API_BASE_URL = apiConfig.API_BASE_URL;
const ROBOFLOW_ENDPOINT = `${API_BASE_URL}/fertilizer/roboflow`;

export interface RoboflowPrediction {
  class: string;
  confidence: number;
}

export interface FertilizerRecommendation {
  summary: string;
  plant_information: {
    age_category: string;
    ring_distance: string;
  };
  fertilizer_recommendation: {
    primary_nutrient: string;
    nutrient_amount: string;
    fertilizer_name: string;
    fertilizer_composition: string;
    actual_fertilizer_amount: string;
  };
  application_guidelines: {
    timing: string;
    placement: string;
    coverage: string;
  };
  symptoms_identified: string[];
  additional_notes?: string;
  organic_alternatives?: string;
}

export interface RoboflowAnalysisResponse {
  success: boolean;
  message: string;
  primary_deficiency?: string;
  confidence?: number;
  severity?: string;
  plant_age?: number;
  recommendations?: FertilizerRecommendation;
  history_id?: number;
  roboflow_output: Array<{
    predictions: {
      predictions: RoboflowPrediction[];
      top: string;
      confidence: number;
    };
  }>;
  metadata: {
    filename: string;
    content_type: string;
    model_type: string;
    workflow_id: string;
    workspace: string;
  };
}

export interface SoilAnalysisResponse {
  success: boolean;
  message: string;
  analysis_flow: string;
  soil_type: string;
  confidence: number;
  soil_characteristics?: any;
  soil_improvement_actions?: string[];
  recommendations?: any;
  recommend_soil_lab_test: boolean;
  option_to_proceed?: string;
  history_id?: number;
  roboflow_output?: any;
  metadata?: any;
}

export interface CombinedAnalysisResponse {
  success: boolean;
  message: string;
  analysis_flow: string;
  leaf_analysis: {
    detected_deficiency: string;
    confidence: number;
    severity: string;
    recommendations: FertilizerRecommendation;
  };
  soil_analysis: {
    soil_type: string;
    confidence: number;
    confidence_level: string;
    characteristics?: string[];
    common_issues?: string[];
    improvement_actions?: string[];
    recommendations?: any;
    message?: string;
  };
  combined_confidence: number;
  cross_validated_recommendation: any;
  fertilizer_and_soil_amendment_plan: any;
  soil_lab_test_recommendation: any;
  history_id?: number;
  metadata?: any;
}

export interface AnalysisOption {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  outputs: string[];
  requires: string[];
}

class FertilizerAPI {
  /**
   * Test Roboflow service health
   */
  async testConnection(): Promise<boolean> {
    const healthUrl = `${ROBOFLOW_ENDPOINT}/health`;
    
    try {
      console.log('🔍 Testing Roboflow service...');
      console.log(`🏥 Health URL: ${healthUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📊 Response Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error ${response.status}: ${errorText}`);
        return false;
      }

      const data = await response.json();
      console.log('🔬 Roboflow service connected:', data);
      
      return data.success !== false;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Request timeout after 5 seconds');
        return false;
      }
      
      console.error('❌ Roboflow service connection failed:', error);
      return false;
    }
  }

  /**
   * Analyze leaf image using Roboflow workflow
   */
  async analyzeLeafWithRoboflow(imageUri: string, plantAge: number = 1): Promise<RoboflowAnalysisResponse> {
    const analyzeUrl = `${ROBOFLOW_ENDPOINT}/analyze?plant_age=${plantAge}`;
    
    try {
      console.log('🤖 Starting Roboflow analysis via backend...');
      console.log(`📡 Roboflow endpoint: ${analyzeUrl}`);
      console.log(`🖼️ Image URI: ${imageUri}`);
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: 'leaf.jpg',
        type: 'image/jpeg',
      } as any);
      
      console.log('📤 Uploading image using FormData...');
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Upload failed with status ${response.status}`);
        console.error(`📄 Error body: ${errorText}`);
        throw new Error(`Roboflow analysis failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Roboflow analysis completed via backend:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Roboflow analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get Roboflow service status
   */
  async getStatus(): Promise<any> {
    const statusUrl = `${ROBOFLOW_ENDPOINT}/status`;
    
    try {
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get Roboflow status:', error);
      return null;
    }
  }

  /**
   * Check if Roboflow service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    return this.testConnection();
  }

  /**
   * Analyze soil image using Roboflow soil detection workflow
   */
  async analyzeSoilWithRoboflow(imageUri: string): Promise<SoilAnalysisResponse> {
    const analyzeUrl = `${ROBOFLOW_ENDPOINT}/analyze-soil`;
    
    try {
      console.log('🌍 Starting soil analysis via backend...');
      console.log(`📡 Soil analysis endpoint: ${analyzeUrl}`);
      console.log(`🖼️ Image URI: ${imageUri}`);
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: 'soil.jpg',
        type: 'image/jpeg',
      } as any);
      
      console.log('📤 Uploading soil image...');
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Soil analysis failed with status ${response.status}`);
        console.error(`📄 Error body: ${errorText}`);
        throw new Error(`Soil analysis failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Soil analysis completed:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Soil analysis failed:', error);
      throw error;
    }
  }

  /**
   * Perform combined leaf + soil analysis
   */
  async analyzeCombined(leafImageUri: string, soilImageUri: string, plantAge: number): Promise<CombinedAnalysisResponse> {
    const analyzeUrl = `${ROBOFLOW_ENDPOINT}/analyze-combined?plant_age=${plantAge}`;
    
    try {
      console.log('🔬 Starting combined analysis via backend...');
      console.log(`📡 Combined analysis endpoint: ${analyzeUrl}`);
      console.log(`🍃 Leaf image URI: ${leafImageUri}`);
      console.log(`🌍 Soil image URI: ${soilImageUri}`);
      
      const formData = new FormData();
      formData.append('leaf_file', {
        uri: leafImageUri,
        name: 'leaf.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('soil_file', {
        uri: soilImageUri,
        name: 'soil.jpg',
        type: 'image/jpeg',
      } as any);
      
      console.log('📤 Uploading leaf and soil images...');
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Combined analysis failed with status ${response.status}`);
        console.error(`📄 Error body: ${errorText}`);
        throw new Error(`Combined analysis failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Combined analysis completed:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Combined analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get available analysis options
   */
  async getAnalysisOptions(): Promise<{ success: boolean; analysis_options: AnalysisOption[] }> {
    const optionsUrl = `${ROBOFLOW_ENDPOINT}/analysis-options`;
    
    try {
      console.log('📋 Fetching analysis options...');
      
      const response = await fetch(optionsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get analysis options: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Analysis options retrieved:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to get analysis options:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const fertilizerAPI = new FertilizerAPI();
export default fertilizerAPI;
