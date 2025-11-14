/**
 * Fertilizer API Service
 * Handles communication with the backend fertilizer detection ML API
 * Connects mobile app to real ML models for cinnamon leaf deficiency analysis
 */

import * as FileSystem from 'expo-file-system';

import apiConfig from '../config/api';

// Use configured API URL for all requests
const API_BASE_URL = apiConfig.API_BASE_URL;
const FERTILIZER_DETECTION_ENDPOINT = `${API_BASE_URL}${apiConfig.ENDPOINTS.FERTILIZER}`;

// Type definitions
export interface FertilizerRecommendation {
  id: string;
  category: string;
  title: string;
  items: string[];
  application: string;
  timing: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface DetectedIssue {
  id: string;
  type: 'leaf' | 'soil';
  issue: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  description: string;
  confidence: number;
  icon: string;
}

export interface FertilizerAnalysisResponse {
  success: boolean;
  analysis_id: string;
  session_id?: string;
  predicted_deficiency: string;
  confidence: number;
  severity: string;
  detected_issues: DetectedIssue[];
  recommendations: FertilizerRecommendation[];
  model_version: string;
  processing_time: number;
  metadata?: any;
}

export interface FertilizerAnalysisRequest {
  image_uri: string;
  sample_type: 'leaf' | 'soil';
  session_id?: string;
  metadata?: any;
}

export interface DetectedIssue {
  id: string;
  type: 'leaf' | 'soil';
  issue: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  description: string;
  confidence: number;
  icon: string;
}

export interface FertilizerRecommendation {
  id: string;
  category: string;
  title: string;
  items: string[];
  application: string;
  timing: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface FertilizerAnalysisResponse {
  success: boolean;
  analysis_id: string;
  session_id?: string;
  predicted_deficiency: string;
  confidence: number;
  severity: string;
  detected_issues: DetectedIssue[];
  recommendations: FertilizerRecommendation[];
  model_version: string;
  processing_time: number;
  metadata?: any;
}

export interface ModelInfo {
  model_type: string;
  version: string;
  last_trained: string;
  accuracy: number;
  features_count: number;
  classes: string[];
}

class FertilizerAPI {
  private readonly timeout: number = 30000; // 30 seconds for ML processing

  /**
   * Test connection to fertilizer detection API
   */
  async testConnection(): Promise<boolean> {
    const healthUrl = `${FERTILIZER_DETECTION_ENDPOINT}/real/health`;
    
    try {
      console.log('🔍 Testing fertilizer API connection...');
      console.log(`📡 API Base URL: ${API_BASE_URL}`);
      console.log(`🎯 Fertilizer Endpoint: ${FERTILIZER_DETECTION_ENDPOINT}`);
      console.log(`🏥 Health URL: ${healthUrl}`);
      
      // Create abort controller with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      console.log(`📊 Response Status: ${response.status}`);
      console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error ${response.status}: ${response.statusText}`);
        console.error(`📄 Error Response Body: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔬 Fertilizer API connection successful:', data);
      
      if (data.success === false || data.status === 'unhealthy') {
        console.warn('⚠ API responded but service is unhealthy:', data);
        return false;
      }
      
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Request timeout after 5 seconds');
        console.error(`   URL: ${healthUrl}`);
        return false;
      }
      
      console.error('❌ Fertilizer API connection failed:');
      console.error(`   URL: ${healthUrl}`);
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`   Full Error:`, error);
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<ModelInfo | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${FERTILIZER_DETECTION_ENDPOINT}/real/model-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Failed to get model info:', error);
      return null;
    }
  }

  /**
   * Analyze leaf using extracted features instead of image upload
   */
  async analyzeLeafFeatures(
    leafFeatures: any, 
    qualityMetrics: any, 
    sessionId?: string
  ): Promise<FertilizerAnalysisResponse | null> {
    const analyzeUrl = `${FERTILIZER_DETECTION_ENDPOINT}/real/analyze-leaf-features`;
    
    try {
      console.log('🍃 Starting feature-based leaf analysis...');
      console.log(`📡 Analysis URL: ${analyzeUrl}`);
      console.log('📊 Leaf features:', leafFeatures);
      console.log('📊 Quality metrics:', qualityMetrics);
      console.log(`📋 Session ID: ${sessionId || 'none'}`);

      const requestData = {
        color_distribution: leafFeatures.colorDistribution || {},
        visible_defects: leafFeatures.visibleDefects || [],
        leaf_shape: leafFeatures.leafShape || 'unknown',
        quality_metrics: qualityMetrics || {},
        estimated_leaf_area: leafFeatures.estimatedLeafArea || 0,
        session_id: sessionId,
        user_id: 1,
        save_to_db: true
      };

      console.log('📦 Sending feature analysis request...');
      console.log('📋 Request data:', requestData);

      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log(`📊 Feature analysis response: ${response.status} ${response.ok ? '✅' : '❌'}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`📄 Error response body: ${errorText}`);
        throw new Error(`Feature analysis failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📋 Feature analysis result received:', result);
      
      if (!result.success) {
        console.error('❌ Feature analysis result indicates failure:', result.message);
        throw new Error(result.message || 'Feature analysis failed');
      }

      console.log('✅ Feature-based analysis completed:', {
        deficiency: result.data?.prediction?.deficiency_type,
        confidence: result.data?.prediction?.confidence,
        method: result.data?.analysis_method
      });

      return this.formatAnalysisResponse(result, 'leaf');
      
    } catch (error) {
      console.error('❌ Feature-based analysis error:', error);
      console.error(`   URL: ${analyzeUrl}`);
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`   Full Error:`, error);
      return null;
    }
  }

  /**
   * Analyze leaf image using real ML model (original image upload method)
   */
  async analyzeLeafImage(imageUri: string, sessionId?: string): Promise<FertilizerAnalysisResponse | null> {
    const analyzeUrl = `${FERTILIZER_DETECTION_ENDPOINT}/real/analyze-leaf`;
    const uploadTimeout = 60000; // 60 seconds for file upload
    let timeoutId: any = null;
    
    try {
      console.log('🔬 Starting leaf analysis with real ML model...');
      console.log(`📡 Analysis URL: ${analyzeUrl}`);
      console.log(`🖼️ Image URI: ${imageUri}`);
      console.log(`📋 Session ID: ${sessionId || 'none'}`);

      // Convert image URI to blob for size checking (not for upload)
      console.log('📷 Converting image URI to blob...');
      const imageResponse = await fetch(imageUri);
      const imageBlob = await imageResponse.blob();
      console.log('✅ Image converted to blob successfully');
      console.log(`📊 Blob info: size=${imageBlob.size} bytes, type=${imageBlob.type}`);
      
      // Check if blob is too large (e.g., > 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageBlob.size > maxSize) {
        console.warn(`⚠ Large image: ${(imageBlob.size / 1024 / 1024).toFixed(2)}MB`);
      }
      
      console.log('📦 Preparing FileSystem upload...');
      console.log(`⏱ Starting upload with ${uploadTimeout/1000}s timeout...`);
      
      // Try Expo FileSystem for better React Native file upload support
      console.log('📤 Using Expo FileSystem.uploadAsync...');
      
      const uploadOptions = {
        fieldName: 'leaf_image',
        httpMethod: FileSystem.FileSystemUploadType.MULTIPART,
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        parameters: {
          user_id: '1',
          save_to_db: 'true',
          ...(sessionId && { session_id: sessionId })
        },
        headers: {
          'Accept': 'application/json',
        },
      } as any; // Type assertion to bypass strict typing
      
      console.log('📋 Upload options:', uploadOptions);
      
      // Copy file to app directory for better access
      const fileName = `leaf_${Date.now()}.jpg`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('📁 Copying image to app directory...');
      await FileSystem.copyAsync({
        from: imageUri,
        to: localUri
      });
      console.log(`✅ Image copied to: ${localUri}`);
      
      console.log('🖼 Image URI for upload:', localUri);
      
      const uploadResult = await FileSystem.uploadAsync(analyzeUrl, localUri, uploadOptions);
      
      console.log('✅ FileSystem upload completed successfully');
      console.log('📊 Upload result:', uploadResult);
      console.log('📄 Response body:', uploadResult.body);
      
      if (uploadResult.status !== 200) {
        console.error(`❌ Upload failed with status ${uploadResult.status}`);
        console.error(`📄 Error body: ${uploadResult.body}`);
        throw new Error(`Upload failed with status: ${uploadResult.status} - ${uploadResult.body}`);
      }
      
      const analysisResult = JSON.parse(uploadResult.body);
      
      if (!analysisResult.success) {
        throw new Error(`Analysis failed: ${analysisResult.message || 'Unknown error'}`);
      }

      console.log('✅ Leaf analysis completed:', {
        deficiency: analysisResult.data?.prediction?.deficiency_type,
        confidence: analysisResult.data?.prediction?.confidence,
      });

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(localUri);
        console.log('🗑 Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('⚠ Could not delete temporary file:', cleanupError);
      }

      return this.formatAnalysisResponse(analysisResult, 'leaf');
    } catch (error) {
      console.error('❌ FileSystem upload failed:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Analysis request timeout');
        console.error(`   URL: ${analyzeUrl}`);
        console.error(`   Timeout: ${uploadTimeout}ms`);
        return null;
      }
      
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('❌ Network request failed - possible causes:');
        console.error('   - Backend server is down');
        console.error('   - Network connectivity issues');
        console.error('   - File too large for upload');
        console.error('   - CORS or security restrictions');
        console.error(`   URL: ${analyzeUrl}`);
        return null;
      }
      
      console.error('❌ Leaf analysis error:');
      console.error(`   URL: ${analyzeUrl}`);
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`   Full Error:`, error);
      return null;
    }
  }

  /**
   * Alternative image analysis using base64 encoding (fallback method)
   */
  async analyzeLeafImageBase64(imageUri: string, sessionId?: string): Promise<FertilizerAnalysisResponse | null> {
    try {
      console.log('🔄 Trying base64 upload as fallback...');
      
      // Convert image to base64
      const imageResponse = await fetch(imageUri);
      const imageBlob = await imageResponse.blob();
      
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data:image/jpeg;base64, prefix if present
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Data);
        };
        reader.readAsDataURL(imageBlob);
      });
      
      console.log(`📊 Base64 data size: ${base64.length} characters`);
      console.log('❌ Base64 method requires backend modification - not implemented yet');
      return null;
      
    } catch (error) {
      console.error('❌ Base64 conversion failed:', error);
      return null;
    }
  }

  /**
   * Get detailed recommendations for specific deficiency
   */
  async getDetailedRecommendations(
    deficiency: string, 
    severity: string, 
    sessionId?: string
  ): Promise<FertilizerRecommendation[]> {
    console.log('💡 Getting detailed recommendations:', { deficiency, severity, sessionId });
    
    try {
      const formData = new FormData();
      formData.append('deficiency_type', deficiency);
      formData.append('severity', severity);
      
      if (sessionId) {
        formData.append('session_id', sessionId);
      }

      console.log('📤 Sending recommendations request...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${FERTILIZER_DETECTION_ENDPOINT}/real/recommendations`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 Recommendations response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Raw recommendations result:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get recommendations');
      }

      console.log('✅ Recommendations API success, formatting...');
      const formattedRecs = this.formatRecommendations(result.recommendations);
      console.log('✅ Formatted recommendations:', formattedRecs);
      return formattedRecs;
      
    } catch (error) {
      console.error('❌ Failed to get detailed recommendations:', error);
      console.log('🔄 Falling back to default recommendations...');
      return this.getFallbackRecommendations(deficiency, severity);
    }
  }

  /**
   * Format the raw API response into the mobile app format
   */
  private formatAnalysisResponse(
    apiResponse: any, 
    sampleType: 'leaf' | 'soil'
  ): FertilizerAnalysisResponse {
    console.log('🔄 Formatting analysis response:', apiResponse);
    
    // Extract data from nested structure
    const data = apiResponse.data || apiResponse;
    const prediction = data.prediction || {};
    const recommendations = data.recommendations || {};
    const modelInfo = data.metadata || apiResponse.model_info || {};
    
    // Get deficiency information
    const deficiencyType = prediction.deficiency_type || apiResponse.predicted_deficiency || 'unknown';
    const confidence = prediction.confidence || apiResponse.confidence || 0;
    const severity = recommendations.severity || apiResponse.severity || 'moderate';
    
    console.log('📊 Extracted info:', { deficiencyType, confidence, severity });
    
    const severityLevel = this.mapSeverityLevel(severity);
    
    // Create detected issues from the analysis
    const detectedIssues: DetectedIssue[] = [
      {
        id: '1',
        type: sampleType,
        issue: this.formatDeficiencyName(deficiencyType),
        severity: severityLevel,
        description: this.getDeficiencyDescription(deficiencyType, severityLevel),
        confidence: confidence / 100, // Ensure decimal format
        icon: sampleType === 'leaf' ? 'leaf-outline' : 'earth-outline'
      }
    ];

    // Add additional issues from secondary predictions if available
    if (prediction.all_probabilities) {
      Object.entries(prediction.all_probabilities).forEach(([type, prob], index) => {
        if (type !== deficiencyType && typeof prob === 'number' && prob > 30) {
          detectedIssues.push({
            id: (index + 2).toString(),
            type: sampleType,
            issue: this.formatDeficiencyName(type),
            severity: 'Low',
            description: `Secondary detection: ${this.formatDeficiencyName(type)}`,
            confidence: prob / 100,
            icon: 'warning-outline'
          });
        }
      });
    }

    const formattedResponse: FertilizerAnalysisResponse = {
      success: true,
      analysis_id: data.analysis_id || `analysis_${Date.now()}`,
      session_id: data.session_id || `session_${Date.now()}`,
      predicted_deficiency: this.formatDeficiencyName(deficiencyType),
      confidence: confidence,
      severity: severity,
      detected_issues: detectedIssues,
      recommendations: [], // Will be filled by separate recommendations call
      model_version: modelInfo.model_type || 'real_rf_v1.0',
      processing_time: 0,
      metadata: {
        original_response: data,
        model_info: modelInfo
      }
    };
    
    console.log('✅ Formatted response:', formattedResponse);
    return formattedResponse;
  }

  /**
   * Format recommendations from API response
   */
  private formatRecommendations(apiRecommendations: any[]): FertilizerRecommendation[] {
    console.log('🔄 Formatting recommendations:', apiRecommendations);
    
    return apiRecommendations.map((rec, index) => {
      const formatted = {
        id: (index + 1).toString(),
        category: rec.category || 'Fertilizer',
        title: rec.fertilizer || rec.title || 'Fertilizer Recommendation',
        items: [
          rec.fertilizer || 'NPK 15-15-15',
          `Rate: ${rec.application_rate || 'As needed'}`,
          `Frequency: ${rec.frequency || 'Monthly'}`,
          `Cost: ${rec.cost_estimate || 'Contact supplier'}`
        ],
        application: rec.instructions || rec.application || 'Apply around base of plants',
        timing: rec.timing || 'Apply as recommended',
        priority: rec.priority || 'High'
      };
      
      console.log(`📋 Formatted recommendation ${index + 1}:`, formatted);
      return formatted;
    });
  }

  /**
   * Format deficiency name for display
   */
  private formatDeficiencyName(deficiency: string): string {
    const nameMap: { [key: string]: string } = {
      'healthy': 'Healthy Plant',
      'nitrogen_deficiency': 'Nitrogen Deficiency',
      'potassium_deficiency': 'Potassium Deficiency',
      'potassium_deficiency': 'Potassium Deficiency',
      'magnesium_deficiency': 'Magnesium Deficiency',
      'calcium_deficiency': 'Calcium Deficiency',
      'iron_deficiency': 'Iron Deficiency'
    };
    
    const formatted = nameMap[deficiency.toLowerCase()] || deficiency;
    console.log(`🏷 Formatted deficiency name: ${deficiency} -> ${formatted}`);
    return formatted;
  }

  /**
   * Map API severity to mobile app severity levels
   */
  private mapSeverityLevel(severity: string): 'Low' | 'Moderate' | 'High' | 'Critical' {
    const severityMap: { [key: string]: 'Low' | 'Moderate' | 'High' | 'Critical' } = {
      'low': 'Low',
      'moderate': 'Moderate', 
      'high': 'High',
      'critical': 'Critical',
      'mild': 'Low',
      'severe': 'High'
    };
    
    return severityMap[severity.toLowerCase()] || 'Moderate';
  }

  /**
   * Get description for deficiency type
   */
  private getDeficiencyDescription(deficiency: string, severity: string): string {
    const descriptions: { [key: string]: string } = {
      'nitrogen_deficiency': 'Yellowing of older leaves, reduced growth rate, and pale green coloration.',
      'potassium_deficiency': 'Brown edges on leaves, leaf tip and margin burn, and reduced drought resistance.',
      'potassium_deficiency': 'Brown edges on leaves, leaf tip and margin burn, and reduced drought resistance.',
      'magnesium_deficiency': 'Yellowing between leaf veins while veins remain green.',
      'calcium_deficiency': 'Brown spots on leaves, tip burn, and poor fruit development.',
      'iron_deficiency': 'Yellowing of young leaves while veins remain green.',
      'healthy': 'Plant appears healthy with good nutrient balance.'
    };

    const key = deficiency?.toLowerCase().replace(' ', '_') || 'unknown';
    return descriptions[key] || `${deficiency} detected with ${severity.toLowerCase()} severity.`;
  }

  /**
   * Fallback recommendations when API fails
   */
  private getFallbackRecommendations(deficiency: string, severity: string): FertilizerRecommendation[] {
    return [
      {
        id: '1',
        category: 'Basic NPK Treatment',
        title: 'Leaf-based NPK Recommendation',
        items: [
          'NPK 15-15-15 at 150kg/ha',
          'Foliar spray NPK 19-19-19 at 2g/L',
          'Potassium sulphate 50kg/ha'
        ],
        application: 'Apply around base of plants and foliar spray on leaves',
        timing: 'Monthly application for 3 months',
        priority: 'High'
      },
      {
        id: '2',
        category: 'Organic Support',
        title: 'Natural Fertilizer Enhancement',
        items: [
          'Compost 2-3 kg per plant',
          'Bone meal 100g per plant',
          'Vermicompost 1kg per plant'
        ],
        application: 'Mix into soil around the root zone',
        timing: 'Apply every 2 months',
        priority: 'Medium'
      }
    ];
  }

  /**
   * Check if fertilizer detection service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    const healthUrl = `${FERTILIZER_DETECTION_ENDPOINT}/real/health`;
    
    try {
      console.log('🩺 Quick health check for fertilizer service...');
      console.log(`🏥 Testing: ${healthUrl}`);
      
      // Create abort controller with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId); // Clear timeout if request completes
      
      console.log(`📊 Health check response: ${response.status} ${response.ok ? '✅' : '❌'}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Service unhealthy: ${response.status} - ${errorText}`);
        return false;
      }

      // Try to parse response to check service status
      try {
        const data = await response.json();
        console.log('📋 Service status:', data);
        
        if (data.success === false || data.status === 'unhealthy') {
          console.warn('⚠ Service responded but status is unhealthy');
          return false;
        }
        
        return true;
      } catch (parseError) {
        console.warn('⚠ Could not parse health response, but HTTP status was OK');
        return response.ok;
      }    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Health check timeout after 3 seconds');
        console.error(`   URL: ${healthUrl}`);
        return false;
      }
      
      console.error('❌ Health check failed:');
      console.error(`   URL: ${healthUrl}`);
      console.error(`   Error:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

// Export singleton instance
export const fertilizerAPI = new FertilizerAPI();
export default fertilizerAPI;
