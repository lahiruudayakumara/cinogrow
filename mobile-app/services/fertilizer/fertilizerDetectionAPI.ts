/**
 * Fertilizer Detection API Service
 * Handles communication with backend fertilizer detection endpoints
 */

import apiConfig from '../../config/api';

const API_BASE_URL = apiConfig.API_BASE_URL;
const DETECTION_ENDPOINT = ${API_BASE_URL}/fertilizer-detection;

export interface DeficiencyType {
  NITROGEN_DEFICIENCY: 'nitrogen_deficiency';
  POTASSIUM_DEFICIENCY: 'potassium_deficiency';
  POTASSIUM_DEFICIENCY: 'potassium_deficiency';
  HEALTHY: 'healthy';
}

export interface AnalysisResult {
  analysis_id: number;
  deficiency_type: string;
  confidence_score: number;
  detected_issues: string[];
  visual_signs: string[];
  expert_contact_required: boolean;
  processing_time_seconds: number;
  model_version: string;
  recommendation_id?: number;
}

export interface FertilizerRecommendation {
  id: number;
  deficiency_type: string;
  inorganic_fertilizer: {
    type: string;
    dosage_per_plant: number;
    application_method: string;
    frequency: string;
    split_schedule?: string;
  };
  organic_fertilizer: {
    type: string;
    application_rate: number;
    timing: string;
  };
  application_details: {
    method: string;
    best_season: string;
  };
  priority: {
    level: number;
    action_required_within_days?: number;
  };
  additional_notes?: string;
}

export interface ComprehensiveAnalysis {
  analysis: {
    id: number;
    deficiency_type: string;
    confidence_score: number;
    detected_issues: string[];
    visual_signs: string[];
    processing_time: number;
    expert_contact_required: boolean;
    analysis_date: string;
  };
  recommendation?: FertilizerRecommendation;
  expert_contact: {
    organization: string;
    phone: string;
    note: string;
  };
}

export interface AnalysisHistoryItem {
  id: number;
  deficiency_type: string;
  confidence_score: number;
  status: string;
  analysis_date: string;
  expert_contact_required: boolean;
  has_recommendation: boolean;
  farm_id?: number;
  plot_id?: number;
}

export interface DetectionStats {
  analysis_summary: {
    total_analyses: number;
    period_days: number;
    average_confidence: number;
    expert_contact_required: number;
  };
  deficiency_distribution: Record<string, number>;
  recommendation_effectiveness: {
    total_recommendations: number;
    applied_recommendations: number;
    application_rate_percent: number;
  };
  model_info: {
    version: string;
    architecture: string;
    supported_deficiencies: string[];
    confidence_threshold: number;
  };
}

export interface CinnamonRecommendationReference {
  plant: string;
  research_source: string;
  contact: string;
  detected_deficiencies: {
    [key: string]: {
      visual_signs: string[];
      leaf_nitrogen_threshold?: string;
      leaf_potassium_threshold?: string;
      recommended_fertilizer: {
        inorganic: {
          fertilizer_type: string;
          dosage_per_plant: string;
          application_method: string;
          frequency: string;
          split_schedule?: string;
        };
        organic: {
          fertilizer_type: string;
          application_rate: string;
          timing: string;
        };
      };
    };
  };
  note: string;
  dataset_source: string;
}

class FertilizerDetectionAPI {
  
  /**
   * Analyze leaf image for nutrient deficiencies
   */
  async analyzeLeafImage(
    leafImageUri: string,
    userId: number = 1,
    farmId?: number,
    plotId?: number
  ): Promise<AnalysisResult> {
    try {
      const formData = new FormData();
      
      // Create file object from URI
      const response = await fetch(leafImageUri);
      const blob = await response.blob();
      
      formData.append('leaf_image', blob, 'leaf_sample.jpg');
      formData.append('user_id', userId.toString());
      
      if (farmId) formData.append('farm_id', farmId.toString());
      if (plotId) formData.append('plot_id', plotId.toString());

      const apiResponse = await fetch(${DETECTION_ENDPOINT}/analyze-leaf, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        throw new Error(Analysis failed: ${apiResponse.statusText});
      }

      const result = await apiResponse.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Analysis failed');
      }

      return result.data;
      
    } catch (error) {
      console.error('Leaf analysis error:', error);
      throw error;
    }
  }

  /**
   * Add soil image to existing analysis
   */
  async addSoilImage(
    analysisId: number,
    soilImageUri: string
  ): Promise<{ success: boolean; message: string; soil_image_path: string }> {
    try {
      const formData = new FormData();
      
      const response = await fetch(soilImageUri);
      const blob = await response.blob();
      
      formData.append('soil_image', blob, 'soil_sample.jpg');

      const apiResponse = await fetch(${DETECTION_ENDPOINT}/add-soil-image/${analysisId}, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        throw new Error(Failed to add soil image: ${apiResponse.statusText});
      }

      return await apiResponse.json();
      
    } catch (error) {
      console.error('Soil image addition error:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analysis results
   */
  async getAnalysisResults(
    analysisId: number,
    includeRecommendations: boolean = true
  ): Promise<ComprehensiveAnalysis> {
    try {
      const params = new URLSearchParams({
        include_recommendations: includeRecommendations.toString()
      });

      const response = await fetch(${DETECTION_ENDPOINT}/analysis/${analysisId}?${params}, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(Failed to get analysis: ${response.statusText});
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to retrieve analysis');
      }

      return result.data;
      
    } catch (error) {
      console.error('Analysis retrieval error:', error);
      throw error;
    }
  }

  /**
   * Get user's analysis history
   */
  async getUserAnalyses(
    userId: number,
    options: {
      skip?: number;
      limit?: number;
      status?: string;
      deficiency_type?: string;
    } = {}
  ): Promise<{
    analyses: AnalysisHistoryItem[];
    pagination: {
      total: number;
      skip: number;
      limit: number;
      has_more: boolean;
    };
  }> {
    try {
      const params = new URLSearchParams({
        user_id: userId.toString(),
        skip: (options.skip || 0).toString(),
        limit: (options.limit || 10).toString(),
      });

      if (options.status) params.append('status', options.status);
      if (options.deficiency_type) params.append('deficiency_type', options.deficiency_type);

      const response = await fetch(${DETECTION_ENDPOINT}/analyses?${params}, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(Failed to get history: ${response.statusText});
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to retrieve history');
      }

      return result.data;
      
    } catch (error) {
      console.error('Analysis history error:', error);
      throw error;
    }
  }

  /**
   * Update recommendation feedback
   */
  async updateRecommendationFeedback(
    recommendationId: number,
    feedback: {
      is_applied?: boolean;
      application_date?: string;
      effectiveness_rating?: number;
      user_feedback?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(${DETECTION_ENDPOINT}/recommendation/${recommendationId}/feedback, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error(Failed to update feedback: ${response.statusText});
      }

      return await response.json();
      
    } catch (error) {
      console.error('Feedback update error:', error);
      throw error;
    }
  }

  /**
   * Get detection statistics
   */
  async getDetectionStats(
    userId?: number,
    daysBack: number = 30
  ): Promise<DetectionStats> {
    try {
      const params = new URLSearchParams({
        days_back: daysBack.toString()
      });

      if (userId) params.append('user_id', userId.toString());

      const response = await fetch(${DETECTION_ENDPOINT}/stats/summary?${params}, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(Failed to get stats: ${response.statusText});
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to retrieve stats');
      }

      return result.data;
      
    } catch (error) {
      console.error('Stats retrieval error:', error);
      throw error;
    }
  }

  /**
   * Get cinnamon fertilizer recommendation reference
   */
  async getCinnamonRecommendationReference(): Promise<CinnamonRecommendationReference> {
    try {
      const response = await fetch(${DETECTION_ENDPOINT}/reference/cinnamon-recommendations, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(Failed to get reference: ${response.statusText});
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to retrieve reference');
      }

      return result.data;
      
    } catch (error) {
      console.error('Reference retrieval error:', error);
      throw error;
    }
  }

  /**
   * Delete analysis and associated data
   */
  async deleteAnalysis(analysisId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(${DETECTION_ENDPOINT}/analysis/${analysisId}, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(Failed to delete analysis: ${response.statusText});
      }

      return await response.json();
      
    } catch (error) {
      console.error('Analysis deletion error:', error);
      throw error;
    }
  }

  /**
   * Complete analysis workflow with both leaf and soil images
   */
  async performCompleteAnalysis(
    leafImageUri: string,
    soilImageUri: string,
    userId: number = 1,
    farmId?: number,
    plotId?: number
  ): Promise<ComprehensiveAnalysis> {
    try {
      console.log('Starting complete fertilizer analysis...');
      
      // Step 1: Analyze leaf image
      console.log('Step 1: Analyzing leaf image...');
      const analysisResult = await this.analyzeLeafImage(leafImageUri, userId, farmId, plotId);
      
      // Step 2: Add soil image
      console.log('Step 2: Adding soil image...');
      await this.addSoilImage(analysisResult.analysis_id, soilImageUri);
      
      // Step 3: Get complete results
      console.log('Step 3: Getting comprehensive results...');
      const comprehensiveResults = await this.getAnalysisResults(analysisResult.analysis_id);
      
      console.log('Complete analysis finished successfully');
      return comprehensiveResults;
      
    } catch (error) {
      console.error('Complete analysis error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const fertilizerDetectionAPI = new FertilizerDetectionAPI();
export default fertilizerDetectionAPI;
