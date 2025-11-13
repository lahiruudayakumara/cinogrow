/**
 * ML Metadata Storage Service - Database Version
 * Handles ML training data storage using backend database instead of local AsyncStorage
 * Provides secure, centralized storage for metadata collection
 */

import { ImageMetadata, LeafAnalysisMetadata, SoilAnalysisMetadata } from './imageAnalysisService';
import apiConfig from '../config/api';

const API_BASE_URL = apiConfig.API_BASE_URL;
const ML_METADATA_ENDPOINT = `${API_BASE_URL}/api/v1/ml-metadata`;

export interface AnalysisSession {
  id: string;
  timestamp: string;
  leafMetadata?: LeafAnalysisMetadata;
  soilMetadata?: SoilAnalysisMetadata;
  analysisType: 'leaf-only' | 'comprehensive';
  status: 'in-progress' | 'completed' | 'failed';
  results?: {
    detectedIssues: any[];
    recommendations: any[];
    confidence: number;
  };
  // Additional database fields
  session_id?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

interface DatabaseSession {
  id?: number;
  session_id: string;
  user_id: number;
  status: 'active' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  analysis_summary?: string;
  recommendation_data?: any;
  analyses?: AnalysisMetadata[];
}

interface AnalysisMetadata {
  analysis_id: string;
  sample_type: 'leaf' | 'soil';
  quality_metrics: any;
  created_at: string;
  is_labeled: boolean;
  quality_approved: boolean;
}

interface ExportedMLData {
  export_info: {
    timestamp: string;
    total_samples: number;
    quality_threshold: number;
    include_unapproved: boolean;
    user_filter?: number;
  };
  samples: Array<{
    analysis_id: string;
    sample_type: string;
    image_uri: string;
    stored_image_path?: string;
    metadata: any;
    features: any;
    labels: any;
    timestamp: string;
  }>;
}

class MetadataStorageService {
  private readonly MAX_SESSIONS = 50;
  private readonly DEFAULT_USER_ID = 1; // Default user for development

  /**
   * Create a new analysis session
   */
  async createSession(): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('user_id', this.DEFAULT_USER_ID.toString());

      const response = await fetch(`${ML_METADATA_ENDPOINT}/sessions`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create session');
      }

      console.log('📝 Database Session Created:', result.session_id);
      return result.session_id;

    } catch (error) {
      console.error('Session creation error:', error);
      // Fallback to local session ID
      return this.generateSessionId();
    }
  }

  /**
   * Store leaf analysis metadata
   */
  async storeLeafMetadata(sessionId: string, metadata: LeafAnalysisMetadata): Promise<void> {
    try {
      await this.storeImageAnalysis(sessionId, 'leaf', metadata);
      console.log('🍃 Leaf Metadata Stored to Database:', {
        sessionId,
        fileName: metadata.fileName,
        quality: metadata.quality,
        leafFeatures: metadata.leafFeatures
      });
    } catch (error) {
      console.error('Failed to store leaf metadata:', error);
      // Could implement local fallback here if needed
    }
  }

  /**
   * Store soil analysis metadata
   */
  async storeSoilMetadata(sessionId: string, metadata: SoilAnalysisMetadata): Promise<void> {
    try {
      await this.storeImageAnalysis(sessionId, 'soil', metadata);
      console.log('🌱 Soil Metadata Stored to Database:', {
        sessionId,
        fileName: metadata.fileName,
        quality: metadata.quality,
        soilFeatures: metadata.soilFeatures
      });
    } catch (error) {
      console.error('Failed to store soil metadata:', error);
      // Could implement local fallback here if needed
    }
  }

  /**
   * Internal method to store image analysis
   */
  private async storeImageAnalysis(
    sessionId: string, 
    sampleType: 'leaf' | 'soil', 
    metadata: LeafAnalysisMetadata | SoilAnalysisMetadata
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('sample_type', sampleType);
      formData.append('capture_method', 'camera'); // Default to camera
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch(`${ML_METADATA_ENDPOINT}/analyses`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to store analysis: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to store analysis');
      }

    } catch (error) {
      console.error('Analysis storage error:', error);
      throw error;
    }
  }

  /**
   * Complete an analysis session
   */
  async completeSession(
    sessionId: string,
    analysisResult: string,
    recommendationData?: any
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('analysis_summary', analysisResult);
      
      if (recommendationData) {
        formData.append('recommendation_data', JSON.stringify(recommendationData));
      }

      const response = await fetch(`${ML_METADATA_ENDPOINT}/sessions/${sessionId}/complete`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to complete session: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to complete session');
      }

      console.log('✅ Session Completed in Database:', sessionId);

    } catch (error) {
      console.error('Session completion error:', error);
      throw error;
    }
  }

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<AnalysisSession | null> {
    try {
      const response = await fetch(`${ML_METADATA_ENDPOINT}/sessions/${sessionId}?include_analyses=true`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get session: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get session');
      }

      return this.convertDatabaseSessionToLocal(result.data);

    } catch (error) {
      console.error('Session retrieval error:', error);
      return null;
    }
  }

  /**
   * Get all sessions for the current user
   */
  async getAllSessions(): Promise<AnalysisSession[]> {
    try {
      const response = await fetch(`${ML_METADATA_ENDPOINT}/sessions?user_id=${this.DEFAULT_USER_ID}&limit=50`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get sessions: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get sessions');
      }

      return result.data.sessions.map((session: any) => this.convertDatabaseSessionToLocal(session));

    } catch (error) {
      console.error('Sessions retrieval error:', error);
      return [];
    }
  }

  /**
   * Get recent completed sessions
   */
  async getRecentCompletedSessions(limit: number = 10): Promise<AnalysisSession[]> {
    try {
      const response = await fetch(
        `${ML_METADATA_ENDPOINT}/sessions?user_id=${this.DEFAULT_USER_ID}&status=completed&limit=${limit}`, 
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get recent sessions: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get recent sessions');
      }

      return result.data.sessions.map((session: any) => this.convertDatabaseSessionToLocal(session));

    } catch (error) {
      console.error('Recent sessions retrieval error:', error);
      return [];
    }
  }

  /**
   * Export metadata for ML training
   */
  async exportMetadataForML(): Promise<ExportedMLData> {
    try {
      const response = await fetch(
        `${ML_METADATA_ENDPOINT}/export/training-data?user_id=${this.DEFAULT_USER_ID}&quality_threshold=0.7`, 
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to export training data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to export training data');
      }

      console.log('📊 ML Data Exported:', {
        totalSamples: result.data.export_info.total_samples,
        qualityThreshold: result.data.export_info.quality_threshold
      });

      return result.data;

    } catch (error) {
      console.error('ML export error:', error);
      // Return empty dataset as fallback
      return {
        export_info: {
          timestamp: new Date().toISOString(),
          total_samples: 0,
          quality_threshold: 0.7,
          include_unapproved: false
        },
        samples: []
      };
    }
  }

  /**
   * Get metadata summary statistics
   */
  async getMetadataSummary(): Promise<{
    totalSessions: number;
    completedSessions: number;
    leafSamples: number;
    soilSamples: number;
    averageQuality: number;
    readyForTraining: number;
  }> {
    try {
      const response = await fetch(
        `${ML_METADATA_ENDPOINT}/stats/summary?user_id=${this.DEFAULT_USER_ID}&days_back=30`, 
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get metadata summary: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get metadata summary');
      }

      const data = result.data;
      return {
        totalSessions: data.collection_summary.total_sessions,
        completedSessions: data.collection_summary.completed_sessions,
        leafSamples: data.sample_distribution.leaf_samples,
        soilSamples: data.sample_distribution.soil_samples,
        averageQuality: data.quality_metrics.average_quality_score,
        readyForTraining: data.quality_metrics.samples_ready_for_training
      };

    } catch (error) {
      console.error('Metadata summary error:', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        leafSamples: 0,
        soilSamples: 0,
        averageQuality: 0,
        readyForTraining: 0
      };
    }
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(): Promise<void> {
    try {
      // This would typically be handled by the backend
      console.log('🧹 Cleanup handled by backend database retention policies');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Convert database session format to local format for compatibility
   */
  private convertDatabaseSessionToLocal(dbSession: any): AnalysisSession {
    return {
      id: dbSession.session_id,
      timestamp: dbSession.created_at,
      analysisType: (dbSession.analyses && dbSession.analyses.length > 1) ? 'comprehensive' : 'leaf-only',
      status: dbSession.status === 'active' ? 'in-progress' : dbSession.status,
      session_id: dbSession.session_id,
      user_id: dbSession.user_id,
      created_at: dbSession.created_at,
      updated_at: dbSession.updated_at,
      completed_at: dbSession.completed_at,
      results: dbSession.recommendation_data ? {
        detectedIssues: [],
        recommendations: [],
        confidence: 0.8
      } : undefined
    };
  }

  /**
   * Generate session ID (fallback for offline use)
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${randomString}`;
  }
}

// Export singleton instance
export const metadataStorageService = new MetadataStorageService();
export default metadataStorageService;
