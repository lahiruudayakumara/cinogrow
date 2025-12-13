import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions for metadata (moved from imageAnalysisService)
export interface ImageMetadata {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  fileName: string;
  mimeType: string;
  timestamp: string;
  location?: { latitude?: number; longitude?: number };
  quality: { brightness: number; contrast: number; sharpness: number; colorfulness: number };
  dominantColors: string[];
  averageColor: string;
  sampleType: 'leaf' | 'soil';
  analysisRegion: { x: number; y: number; width: number; height: number };
  captureMethod: 'camera' | 'library';
  deviceInfo: { platform: string; model?: string };
}

export interface LeafAnalysisMetadata extends ImageMetadata {
  sampleType: 'leaf';
  leafFeatures: {
    estimatedLeafArea: number;
    leafShape: 'oval' | 'elongated' | 'round' | 'irregular';
    visibleDefects: string[];
    colorDistribution: { green: number; yellow: number; brown: number; other: number };
  };
}

export interface SoilAnalysisMetadata extends ImageMetadata {
  sampleType: 'soil';
  soilFeatures: {
    texture: 'clay' | 'sandy' | 'loam' | 'mixed';
    moisture: 'dry' | 'moist' | 'wet';
    organicMatter: 'low' | 'medium' | 'high';
    colorProfile: { lightness: number; redness: number; yellowness: number };
  };
}

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
}

class MetadataStorageService {
  private readonly STORAGE_KEY = 'fertilizer_analysis_sessions';
  private readonly MAX_SESSIONS = 50; // Limit storage

  /**
   * Create a new analysis session
   */
  async createSession(): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: AnalysisSession = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      analysisType: 'leaf-only',
      status: 'in-progress'
    };

    await this.saveSession(session);
    return sessionId;
  }

  /**
   * Store leaf metadata for a session
   */
  async storeLeafMetadata(sessionId: string, metadata: LeafAnalysisMetadata): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.leafMetadata = metadata;
    session.status = 'in-progress';
    
    await this.saveSession(session);
    
    // Log metadata for debugging
    console.log('📸 Leaf Metadata Stored:', {
      sessionId,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      quality: metadata.quality,
      leafFeatures: metadata.leafFeatures
    });
  }

  /**
   * Store soil metadata for a session
   */
  async storeSoilMetadata(sessionId: string, metadata: SoilAnalysisMetadata): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.soilMetadata = metadata;
    session.analysisType = 'comprehensive';
    session.status = 'in-progress';
    
    await this.saveSession(session);
    
    // Log metadata for debugging
    console.log('🌱 Soil Metadata Stored:', {
      sessionId,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      quality: metadata.quality,
      soilFeatures: metadata.soilFeatures
    });
  }

  /**
   * Complete a session with analysis results
   */
  async completeSession(
    sessionId: string, 
    results: AnalysisSession['results']
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.results = results;
    session.status = 'completed';
    
    await this.saveSession(session);
    
    console.log('✅ Analysis Session Completed:', {
      sessionId,
      analysisType: session.analysisType,
      issueCount: results?.detectedIssues.length || 0,
      recommendationCount: results?.recommendations.length || 0,
      confidence: results?.confidence || 0
    });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AnalysisSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Get all stored sessions
   */
  async getAllSessions(): Promise<AnalysisSession[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  /**
   * Get recent completed sessions
   */
  async getRecentCompletedSessions(limit: number = 10): Promise<AnalysisSession[]> {
    const sessions = await this.getAllSessions();
    return sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Export metadata for ML training
   */
  async exportMetadataForML(): Promise<{
    leafSamples: LeafAnalysisMetadata[];
    soilSamples: SoilAnalysisMetadata[];
    sessions: AnalysisSession[];
  }> {
    const sessions = await this.getAllSessions();
    
    const leafSamples: LeafAnalysisMetadata[] = [];
    const soilSamples: SoilAnalysisMetadata[] = [];
    
    sessions.forEach(session => {
      if (session.leafMetadata) {
        leafSamples.push(session.leafMetadata);
      }
      if (session.soilMetadata) {
        soilSamples.push(session.soilMetadata);
      }
    });

    console.log('📊 ML Data Export:', {
      leafSamples: leafSamples.length,
      soilSamples: soilSamples.length,
      totalSessions: sessions.length
    });

    return {
      leafSamples,
      soilSamples,
      sessions: sessions.filter(s => s.status === 'completed')
    };
  }

  /**
   * Clear old sessions to manage storage
   */
  async cleanupOldSessions(): Promise<void> {
    const sessions = await this.getAllSessions();
    
    if (sessions.length > this.MAX_SESSIONS) {
      // Keep only the most recent sessions
      const sortedSessions = sessions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.MAX_SESSIONS);
      
      await this.saveSessions(sortedSessions);
      
      console.log(`🧹 Cleaned up ${sessions.length - sortedSessions.length} old sessions`);
    }
  }

  /**
   * Get metadata summary for debugging
   */
  async getMetadataSummary(): Promise<{
    totalSessions: number;
    completedSessions: number;
    leafOnlySessions: number;
    comprehensiveSessions: number;
    avgImageSize: number;
    avgQualityScore: number;
  }> {
    const sessions = await this.getAllSessions();
    
    const completed = sessions.filter(s => s.status === 'completed');
    const leafOnly = sessions.filter(s => s.analysisType === 'leaf-only');
    const comprehensive = sessions.filter(s => s.analysisType === 'comprehensive');
    
    const allMetadata = sessions.flatMap(s => [s.leafMetadata, s.soilMetadata]).filter(Boolean);
    const avgImageSize = allMetadata.length > 0 
      ? allMetadata.reduce((sum, m) => sum + (m?.fileSize || 0), 0) / allMetadata.length 
      : 0;
    
    const avgQuality = allMetadata.length > 0
      ? allMetadata.reduce((sum, m) => sum + ((m?.quality.brightness || 0) + (m?.quality.contrast || 0)) / 2, 0) / allMetadata.length
      : 0;

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      leafOnlySessions: leafOnly.length,
      comprehensiveSessions: comprehensive.length,
      avgImageSize: Math.round(avgImageSize),
      avgQualityScore: Math.round(avgQuality)
    };
  }

  // Private utility methods

  private async saveSession(session: AnalysisSession): Promise<void> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    await this.saveSessions(sessions);
  }

  private async saveSessions(sessions: AnalysisSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving sessions:', error);
      throw new Error('Failed to save analysis session');
    }
  }

  private generateSessionId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const metadataStorageService = new MetadataStorageService();
