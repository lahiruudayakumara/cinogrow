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

export interface RoboflowAnalysisResponse {
  success: boolean;
  message: string;
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
    size_bytes: number;
    image_dimensions: string;
    model_type: string;
    workflow_id: string;
    workspace: string;
  };
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
  async analyzeLeafWithRoboflow(imageUri: string): Promise<RoboflowAnalysisResponse> {
    const analyzeUrl = `${ROBOFLOW_ENDPOINT}/analyze`;
    
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
}

// Export singleton instance
export const fertilizerAPI = new FertilizerAPI();
export default fertilizerAPI;
