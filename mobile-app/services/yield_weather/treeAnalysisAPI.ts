/**
 * Tree Stem Analysis API Service
 * Communicates with backend to analyze tree images using Roboflow
 */

import apiConfig from '../../config/api';

const API_BASE_URL = apiConfig.API_BASE_URL;
const TREE_ANALYSIS_ENDPOINT = `${API_BASE_URL}/tree-analysis`;

export interface TreeAnalysisResult {
  success: boolean;
  stem_count: number;
  stem_circumference_inches: number;
  confidence: number;
  individual_stems: Array<{
    circumference_inches: number;
    confidence: number;
  }>;
  filename?: string;
  analyzed_at?: string;
}

export interface MultiTreeAnalysisResult {
  success: boolean;
  images_analyzed: number;
  average_stem_count: number;
  average_circumference_inches: number;
  overall_confidence: number;
  individual_results: TreeAnalysisResult[];
  tree_code?: string;
  analyzed_at?: string;
}

export interface BatchTreeAnalysisResult {
  success: boolean;
  trees_analyzed: number;
  images_per_tree: number;
  total_images: number;
  tree_results: MultiTreeAnalysisResult[];
  overall_statistics: {
    average_stem_count_across_trees: number;
    average_circumference_across_trees: number;
    overall_confidence: number;
  };
  analyzed_at: string;
}

class TreeAnalysisAPI {
  /**
   * Test tree analysis service health
   */
  async testConnection(): Promise<boolean> {
    const healthUrl = `${TREE_ANALYSIS_ENDPOINT}/health`;
    
    try {
      console.log('🔍 Testing tree analysis service...');
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
      console.log('🔬 Tree analysis service connected:', data);
      
      return data.success !== false && data.available === true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Request timeout after 5 seconds');
        return false;
      }
      
      console.error('❌ Tree analysis service connection failed:', error);
      return false;
    }
  }

  /**
   * Analyze a single tree image
   */
  async analyzeSingleImage(imageUri: string): Promise<TreeAnalysisResult> {
    const analyzeUrl = `${TREE_ANALYSIS_ENDPOINT}/analyze-single`;
    
    try {
      console.log('🌳 Starting single tree image analysis...');
      console.log(`📡 Endpoint: ${analyzeUrl}`);
      console.log(`🖼️ Image URI: ${imageUri}`);
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: 'tree.jpg',
        type: 'image/jpeg',
      } as any);
      
      console.log('📤 Uploading image...');
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Upload failed with status ${response.status}`);
        console.error(`📄 Error body: ${errorText}`);
        throw new Error(`Tree analysis failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Tree analysis completed:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Tree analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple images of a single tree (typically 3 images from different angles)
   */
  async analyzeMultipleImages(
    imageUris: string[],
    treeCode?: string
  ): Promise<MultiTreeAnalysisResult> {
    const analyzeUrl = `${TREE_ANALYSIS_ENDPOINT}/analyze-multiple`;
    
    try {
      console.log(`🌳 Starting multi-image tree analysis for ${imageUris.length} images...`);
      console.log(`📡 Endpoint: ${analyzeUrl}`);
      
      if (imageUris.length === 0) {
        throw new Error('No images provided');
      }
      
      if (imageUris.length > 5) {
        throw new Error('Maximum 5 images allowed per tree');
      }
      
      const formData = new FormData();
      
      // Add all images
      imageUris.forEach((uri, index) => {
        formData.append('files', {
          uri: uri,
          name: `tree_${index + 1}.jpg`,
          type: 'image/jpeg',
        } as any);
      });
      
      // Add tree code if provided
      if (treeCode) {
        formData.append('tree_code', treeCode);
      }
      
      console.log('📤 Uploading images...');
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Multi-image analysis failed with status ${response.status}`);
        console.error(`📄 Error body: ${errorText}`);
        throw new Error(`Multi-image tree analysis failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Multi-image tree analysis completed:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Multi-image tree analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a batch of trees (3 images per tree)
   * This is the recommended method for the yield prediction workflow
   */
  async analyzeBatch(
    imageUris: string[],
    treeCodes?: string[]
  ): Promise<BatchTreeAnalysisResult> {
    const analyzeUrl = `${TREE_ANALYSIS_ENDPOINT}/analyze-batch`;
    
    try {
      console.log(`🌳 Starting batch tree analysis for ${imageUris.length} images...`);
      console.log(`📡 Endpoint: ${analyzeUrl}`);
      
      if (imageUris.length === 0) {
        throw new Error('No images provided');
      }
      
      if (imageUris.length % 3 !== 0) {
        throw new Error('Number of images must be a multiple of 3');
      }
      
      const numTrees = imageUris.length / 3;
      console.log(`🌳 Analyzing ${numTrees} trees with 3 images each`);
      
      const formData = new FormData();
      
      // Add all images
      imageUris.forEach((uri, index) => {
        const treeNum = Math.floor(index / 3) + 1;
        const imageNum = (index % 3) + 1;
        formData.append('files', {
          uri: uri,
          name: `tree${treeNum}_${imageNum}.jpg`,
          type: 'image/jpeg',
        } as any);
      });
      
      // Add tree codes if provided
      if (treeCodes && treeCodes.length > 0) {
        formData.append('tree_codes', treeCodes.join(','));
      }
      
      console.log('📤 Uploading batch images...');
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Batch analysis failed with status ${response.status}`);
        console.error(`📄 Error body: ${errorText}`);
        throw new Error(`Batch tree analysis failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Batch tree analysis completed:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Batch tree analysis failed:', error);
      throw error;
    }
  }

  /**
   * Check if tree analysis service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    return this.testConnection();
  }
}

// Export singleton instance
export const treeAnalysisAPI = new TreeAnalysisAPI();
export default treeAnalysisAPI;
