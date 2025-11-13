import * as FileSystem from 'expo-file-system';
// Note: For production, you'll want to add: expo install expo-image-manipulator
// For now, we'll use basic analysis without image manipulation

export interface ImageMetadata {
  // Basic image properties
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  fileName: string;
  mimeType: string;
  
  // Image analysis data for ML
  timestamp: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  
  // Image quality metrics
  quality: {
    brightness: number;
    contrast: number;
    sharpness: number;
    colorfulness: number;
  };
  
  // Color analysis
  dominantColors: string[];
  averageColor: string;
  
  // Sample type specific data
  sampleType: 'leaf' | 'soil';
  analysisRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Environmental context
  captureMethod: 'camera' | 'library';
  deviceInfo: {
    platform: string;
    model?: string;
  };
}

export interface LeafAnalysisMetadata extends ImageMetadata {
  sampleType: 'leaf';
  leafFeatures: {
    estimatedLeafArea: number;
    leafShape: 'oval' | 'elongated' | 'round' | 'irregular';
    visibleDefects: string[];
    colorDistribution: {
      green: number;
      yellow: number;
      brown: number;
      other: number;
    };
  };
}

export interface SoilAnalysisMetadata extends ImageMetadata {
  sampleType: 'soil';
  soilFeatures: {
    texture: 'clay' | 'sandy' | 'loam' | 'mixed';
    moisture: 'dry' | 'moist' | 'wet';
    organicMatter: 'low' | 'medium' | 'high';
    colorProfile: {
      lightness: number;
      redness: number;
      yellowness: number;
    };
  };
}

class ImageAnalysisService {
  
  /**
   * Extract comprehensive metadata from an image for ML processing
   */
  async extractImageMetadata(
    imageUri: string, 
    sampleType: 'leaf' | 'soil',
    captureMethod: 'camera' | 'library' = 'camera'
  ): Promise<LeafAnalysisMetadata | SoilAnalysisMetadata> {
    
    try {
      // Get basic image info
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      
      // For now, we'll extract basic metadata without image manipulation
      // In production, uncomment and install expo-image-manipulator for full analysis
      const imageResult = {
        uri: imageUri,
        width: 1024, // Default analysis size
        height: 1024,
        base64: null // We'll work without base64 for now
      };

      // Extract basic metadata
      const basicMetadata: ImageMetadata = {
        uri: imageUri,
        width: imageResult.width,
        height: imageResult.height,
        fileSize: imageInfo.exists ? imageInfo.size || 0 : 0,
        fileName: this.extractFileName(imageUri),
        mimeType: 'image/jpeg',
        timestamp: new Date().toISOString(),
        quality: this.generateQualityMetrics(), // Simplified for demo
        dominantColors: this.generateDominantColors(sampleType), // Sample-based
        averageColor: this.generateAverageColor(sampleType), // Sample-based
        sampleType,
        analysisRegion: this.calculateAnalysisRegion(imageResult.width, imageResult.height),
        captureMethod,
        deviceInfo: {
          platform: 'mobile',
        }
      };

      // Add sample-specific analysis
      if (sampleType === 'leaf') {
        return {
          ...basicMetadata,
          sampleType: 'leaf',
          leafFeatures: this.generateLeafFeatures() // Simplified for demo
        } as LeafAnalysisMetadata;
      } else {
        return {
          ...basicMetadata,
          sampleType: 'soil',
          soilFeatures: this.generateSoilFeatures() // Simplified for demo
        } as SoilAnalysisMetadata;
      }
      
    } catch (error) {
      console.error('Error extracting image metadata:', error);
      throw new Error('Failed to extract image metadata');
    }
  }

  /**
   * Analyze image quality metrics
   */
  private async analyzeImageQuality(base64Image: string): Promise<ImageMetadata['quality']> {
    // This is a simplified implementation
    // In a real app, you'd use more sophisticated image analysis
    
    const imageData = this.base64ToImageData(base64Image);
    
    return {
      brightness: this.calculateBrightness(imageData),
      contrast: this.calculateContrast(imageData),
      sharpness: this.calculateSharpness(imageData),
      colorfulness: this.calculateColorfulness(imageData)
    };
  }

  /**
   * Extract dominant colors from image
   */
  private async extractDominantColors(base64Image: string): Promise<string[]> {
    // Simplified color extraction - in production use a proper color quantization algorithm
    const imageData = this.base64ToImageData(base64Image);
    const colors = this.getDominantColorsFromImageData(imageData);
    return colors.slice(0, 5); // Top 5 dominant colors
  }

  /**
   * Calculate average color
   */
  private async calculateAverageColor(base64Image: string): Promise<string> {
    const imageData = this.base64ToImageData(base64Image);
    return this.getAverageColorFromImageData(imageData);
  }

  /**
   * Analyze leaf-specific features
   */
  private async analyzeLeafFeatures(base64Image: string): Promise<LeafAnalysisMetadata['leafFeatures']> {
    // This would integrate with your ML model for leaf analysis
    const imageData = this.base64ToImageData(base64Image);
    
    return {
      estimatedLeafArea: this.estimateLeafArea(imageData),
      leafShape: this.classifyLeafShape(imageData),
      visibleDefects: this.detectLeafDefects(imageData),
      colorDistribution: this.analyzeLeafColorDistribution(imageData)
    };
  }

  /**
   * Analyze soil-specific features
   */
  private async analyzeSoilFeatures(base64Image: string): Promise<SoilAnalysisMetadata['soilFeatures']> {
    // This would integrate with your ML model for soil analysis
    const imageData = this.base64ToImageData(base64Image);
    
    return {
      texture: this.classifySoilTexture(imageData),
      moisture: this.assessSoilMoisture(imageData),
      organicMatter: this.assessOrganicMatter(imageData),
      colorProfile: this.analyzeSoilColorProfile(imageData)
    };
  }

  // Utility methods for image analysis
  
  private extractFileName(uri: string): string {
    return uri.split('/').pop() || `image_${Date.now()}.jpg`;
  }

  private calculateAnalysisRegion(width: number, height: number) {
    // Define central region for analysis (80% of image)
    const margin = 0.1;
    return {
      x: Math.round(width * margin),
      y: Math.round(height * margin),
      width: Math.round(width * (1 - 2 * margin)),
      height: Math.round(height * (1 - 2 * margin))
    };
  }

  private base64ToImageData(base64: string): number[] {
    // Simplified - in production you'd properly decode base64 to image data
    // This is a placeholder for actual image processing
    return Array(100).fill(0).map(() => Math.floor(Math.random() * 255));
  }

  // Image quality analysis methods
  private calculateBrightness(imageData: number[]): number {
    const avg = imageData.reduce((sum, val) => sum + val, 0) / imageData.length;
    return Math.round((avg / 255) * 100); // Convert to percentage
  }

  private calculateContrast(imageData: number[]): number {
    const max = Math.max(...imageData);
    const min = Math.min(...imageData);
    return Math.round(((max - min) / 255) * 100);
  }

  private calculateSharpness(imageData: number[]): number {
    // Simplified sharpness calculation
    return Math.round(Math.random() * 100); // Placeholder
  }

  private calculateColorfulness(imageData: number[]): number {
    // Simplified colorfulness calculation
    return Math.round(Math.random() * 100); // Placeholder
  }

  // Color analysis methods
  private getDominantColorsFromImageData(imageData: number[]): string[] {
    // Simplified dominant color extraction
    const colors = ['#2D5016', '#4A7C59', '#8FBC8F', '#228B22', '#32CD32'];
    return colors;
  }

  private getAverageColorFromImageData(imageData: number[]): string {
    // Simplified average color calculation
    return '#4A7C59'; // Placeholder green
  }

  // Leaf analysis methods
  private estimateLeafArea(imageData: number[]): number {
    // Simplified leaf area estimation in cm²
    return Math.round(15 + Math.random() * 20); // 15-35 cm²
  }

  private classifyLeafShape(imageData: number[]): 'oval' | 'elongated' | 'round' | 'irregular' {
    const shapes: ('oval' | 'elongated' | 'round' | 'irregular')[] = ['oval', 'elongated', 'round', 'irregular'];
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  private detectLeafDefects(imageData: number[]): string[] {
    const possibleDefects = ['yellowing', 'brown_spots', 'holes', 'curling', 'discoloration'];
    return possibleDefects.filter(() => Math.random() > 0.7); // Random defects for demo
  }

  private analyzeLeafColorDistribution(imageData: number[]) {
    return {
      green: Math.round(60 + Math.random() * 30), // 60-90%
      yellow: Math.round(Math.random() * 20), // 0-20%
      brown: Math.round(Math.random() * 15), // 0-15%
      other: Math.round(Math.random() * 10) // 0-10%
    };
  }

  // Soil analysis methods
  private classifySoilTexture(imageData: number[]): 'clay' | 'sandy' | 'loam' | 'mixed' {
    const textures: ('clay' | 'sandy' | 'loam' | 'mixed')[] = ['clay', 'sandy', 'loam', 'mixed'];
    return textures[Math.floor(Math.random() * textures.length)];
  }

  private assessSoilMoisture(imageData: number[]): 'dry' | 'moist' | 'wet' {
    const moistureLevels: ('dry' | 'moist' | 'wet')[] = ['dry', 'moist', 'wet'];
    return moistureLevels[Math.floor(Math.random() * moistureLevels.length)];
  }

  private assessOrganicMatter(imageData: number[]): 'low' | 'medium' | 'high' {
    const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private analyzeSoilColorProfile(imageData: number[]) {
    return {
      lightness: Math.round(30 + Math.random() * 40), // 30-70
      redness: Math.round(10 + Math.random() * 20), // 10-30
      yellowness: Math.round(15 + Math.random() * 25) // 15-40
    };
  }

  // Simplified methods for demo (replace with actual ML analysis)
  
  private generateQualityMetrics(): ImageMetadata['quality'] {
    return {
      brightness: Math.round(50 + Math.random() * 40), // 50-90
      contrast: Math.round(40 + Math.random() * 50), // 40-90
      sharpness: Math.round(60 + Math.random() * 30), // 60-90
      colorfulness: Math.round(50 + Math.random() * 40) // 50-90
    };
  }

  private generateDominantColors(sampleType: 'leaf' | 'soil'): string[] {
    if (sampleType === 'leaf') {
      return ['#2D5016', '#4A7C59', '#8FBC8F', '#228B22', '#32CD32'];
    } else {
      return ['#8B4513', '#A0522D', '#D2691E', '#CD853F', '#DEB887'];
    }
  }

  private generateAverageColor(sampleType: 'leaf' | 'soil'): string {
    return sampleType === 'leaf' ? '#4A7C59' : '#A0522D';
  }

  private generateLeafFeatures(): LeafAnalysisMetadata['leafFeatures'] {
    return {
      estimatedLeafArea: Math.round(15 + Math.random() * 20), // 15-35 cm²
      leafShape: (['oval', 'elongated', 'round', 'irregular'] as const)[Math.floor(Math.random() * 4)],
      visibleDefects: ['yellowing', 'brown_spots'].filter(() => Math.random() > 0.7),
      colorDistribution: {
        green: Math.round(60 + Math.random() * 30), // 60-90%
        yellow: Math.round(Math.random() * 20), // 0-20%
        brown: Math.round(Math.random() * 15), // 0-15%
        other: Math.round(Math.random() * 10) // 0-10%
      }
    };
  }

  private generateSoilFeatures(): SoilAnalysisMetadata['soilFeatures'] {
    return {
      texture: (['clay', 'sandy', 'loam', 'mixed'] as const)[Math.floor(Math.random() * 4)],
      moisture: (['dry', 'moist', 'wet'] as const)[Math.floor(Math.random() * 3)],
      organicMatter: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
      colorProfile: {
        lightness: Math.round(30 + Math.random() * 40), // 30-70
        redness: Math.round(10 + Math.random() * 20), // 10-30
        yellowness: Math.round(15 + Math.random() * 25) // 15-40
      }
    };
  }
}

export const imageAnalysisService = new ImageAnalysisService();
