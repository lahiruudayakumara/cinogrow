/**
 * Fertilizer History Service
 * API client for fertilizer analysis history management
 */

import axios from 'axios';
import apiConfig from '../config/api';

// API Configuration - use shared config
const API_BASE_URL = apiConfig.API_BASE_URL;

// Types
export interface FertilizerDetection {
  class: string;
  confidence: number;
  deficiency: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface FertilizerHistoryRecord {
  id: number;
  primary_deficiency: string | null;
  severity: 'Low' | 'Medium' | 'High' | null;
  confidence: number | null;
  image_path: string | null;
  plant_age: number | null;
  recommendations: any | null;
  analyzed_at: string;
}

export interface FertilizerStatistics {
  total_analyses: number;
  deficiency_counts: Record<string, number>;
  severity_counts: {
    Low: number;
    Medium: number;
    High: number;
  };
  most_common_deficiency: {
    name: string | null;
    count: number;
  };
}

export interface HistoryFilters {
  severity?: 'Low' | 'Medium' | 'High';
  deficiency?: string;
}

// API Functions

/**
 * Fetch fertilizer analysis history with optional filtering and pagination
 */
export const fetchFertilizerHistory = async (
  skip: number = 0,
  limit: number = 10,
  filters?: HistoryFilters
): Promise<FertilizerHistoryRecord[]> => {
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (filters?.deficiency) {
      params.append('deficiency', filters.deficiency);
    }
    if (filters?.severity) {
      params.append('severity', filters.severity);
    }

    const response = await axios.get(
      `${API_BASE_URL}/fertilizer/roboflow/history?${params.toString()}`
    );

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch fertilizer history:', error);
    throw error;
  }
};

/**
 * Get a single fertilizer history record by ID
 */
export const getFertilizerRecord = async (
  historyId: number
): Promise<FertilizerHistoryRecord> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/fertilizer/roboflow/history/${historyId}`
    );

    return response.data;
  } catch (error) {
    console.error(`❌ Failed to fetch history record ${historyId}:`, error);
    throw error;
  }
};

/**
 * Delete a fertilizer history record
 */
export const deleteFertilizerRecord = async (
  historyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/fertilizer/roboflow/history/${historyId}`
    );

    return response.data;
  } catch (error) {
    console.error(`❌ Failed to delete history record ${historyId}:`, error);
    throw error;
  }
};

/**
 * Get fertilizer analysis statistics
 */
export const fetchFertilizerStats = async (): Promise<FertilizerStatistics> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/fertilizer/roboflow/history/stats/summary`
    );

    return response.data.statistics;
  } catch (error) {
    console.error('❌ Failed to fetch fertilizer statistics:', error);
    throw error;
  }
};

/**
 * Get recent analyses (convenience method)
 */
export const getRecentAnalyses = async (
  count: number = 5
): Promise<FertilizerHistoryRecord[]> => {
  return fetchFertilizerHistory(0, count);
};

/**
 * Get high severity analyses (convenience method)
 */
export const getHighSeverityAnalyses = async (
  limit: number = 10
): Promise<FertilizerHistoryRecord[]> => {
  return fetchFertilizerHistory(0, limit, { severity: 'High' });
};

/**
 * Search history by deficiency type
 */
export const searchByDeficiency = async (
  deficiency: string,
  limit: number = 20
): Promise<FertilizerHistoryRecord[]> => {
  return fetchFertilizerHistory(0, limit, { deficiency });
};

/**
 * Format date for display
 */
export const formatAnalysisDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

/**
 * Get severity color for UI
 */
export const getSeverityColor = (severity: string | null): string => {
  switch (severity) {
    case 'High':
      return '#EF4444'; // Red
    case 'Medium':
      return '#F59E0B'; // Orange
    case 'Low':
      return '#10B981'; // Green
    default:
      return '#6B7280'; // Gray
  }
};

/**
 * Get confidence percentage formatted
 */
export const formatConfidence = (confidence: number | null): string => {
  if (confidence === null) return 'N/A';
  return `${(confidence * 100).toFixed(1)}%`;
};
