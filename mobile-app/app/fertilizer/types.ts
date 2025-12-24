// Type definitions for Fertilizer navigation routes
import { RoboflowAnalysisResponse } from '../../services/fertilizerAPI';
import { LeafAnalysisMetadata } from '../../services/imageAnalysisService';

// Route parameter types for each fertilizer screen
export type FertilizerHomeParams = {
    leafImage?: string;
    soilImage?: string;
};

export type UploadLeafParams = undefined;

export type UploadSoilParams = {
    fromLeaf?: string;
    leafImage?: string;
};

export type PhotoPreviewParams = {
    imageUri: string;
    imageType: 'leaf' | 'soil';
    leafImage?: string;
    soilImage?: string;
    leafMetadata?: string; // JSON stringified LeafAnalysisMetadata
};

export type ResultParams = {
    leafImage?: string;
    soilImage?: string;
    analysisType?: 'leaf-only' | 'comprehensive';
    mlAnalysis?: string; // JSON stringified RoboflowAnalysisResponse
    roboflowAnalysis?: string; // JSON stringified data
    plantAge?: number;
};

// Helper functions to serialize/deserialize complex params
export const serializePhotoPreviewParams = (params: {
    imageUri: string;
    imageType: 'leaf' | 'soil';
    leafImage?: string;
    soilImage?: string;
    leafMetadata?: LeafAnalysisMetadata;
}) => ({
    imageUri: params.imageUri,
    imageType: params.imageType,
    leafImage: params.leafImage,
    soilImage: params.soilImage,
    leafMetadata: params.leafMetadata ? JSON.stringify(params.leafMetadata) : undefined,
});

export const deserializePhotoPreviewParams = (params: PhotoPreviewParams): {
    imageUri: string;
    imageType: 'leaf' | 'soil';
    leafImage?: string;
    soilImage?: string;
    leafMetadata?: LeafAnalysisMetadata;
} => ({
    imageUri: params.imageUri,
    imageType: params.imageType,
    leafImage: params.leafImage,
    soilImage: params.soilImage,
    leafMetadata: params.leafMetadata ? JSON.parse(params.leafMetadata) : undefined,
});

export const serializeResultParams = (params: {
    leafImage?: string;
    soilImage?: string;
    analysisType?: 'leaf-only' | 'comprehensive';
    mlAnalysis?: RoboflowAnalysisResponse;
    roboflowAnalysis?: any;
    plantAge?: number;
}) => ({
    leafImage: params.leafImage,
    soilImage: params.soilImage,
    analysisType: params.analysisType,
    mlAnalysis: params.mlAnalysis ? JSON.stringify(params.mlAnalysis) : undefined,
    roboflowAnalysis: params.roboflowAnalysis ? JSON.stringify(params.roboflowAnalysis) : undefined,
    plantAge: params.plantAge,
});

export const deserializeResultParams = (params: ResultParams): {
    leafImage?: string;
    soilImage?: string;
    analysisType?: 'leaf-only' | 'comprehensive';
    mlAnalysis?: RoboflowAnalysisResponse;
    roboflowAnalysis?: any;
    plantAge?: number;
} => ({
    leafImage: params.leafImage,
    soilImage: params.soilImage,
    analysisType: params.analysisType as 'leaf-only' | 'comprehensive' | undefined,
    mlAnalysis: params.mlAnalysis ? JSON.parse(params.mlAnalysis) : undefined,
    roboflowAnalysis: params.roboflowAnalysis ? JSON.parse(params.roboflowAnalysis) : undefined,
    plantAge: params.plantAge,
});
