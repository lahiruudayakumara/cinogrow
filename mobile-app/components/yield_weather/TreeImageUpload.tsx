/**
 * TreeImageUpload Component
 * 
 * Allows users to upload 1 image of a tree to automatically detect
 * stem count and circumference using Roboflow workflow
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { treeAnalysisAPI, MultiTreeAnalysisResult } from '../../services/yield_weather/treeAnalysisAPI';

interface TreeImageUploadProps {
  treeCode: string;
  onAnalysisComplete: (result: {
    stem_count: number;
    stem_circumference_inches: number;
    harvestable_stems: number;
    total_stems: number;
  }) => void;
  onCancel?: () => void;
}

export const TreeImageUpload: React.FC<TreeImageUploadProps> = ({
  treeCode,
  onAnalysisComplete,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert(
        t('yield_weather.my_yield.tree_image_upload.permissions_required'),
        t('yield_weather.my_yield.tree_image_upload.camera_permission_message'),
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    if (image) {
      Alert.alert(
        t('yield_weather.my_yield.tree_image_upload.image_already_selected'),
        t('yield_weather.my_yield.tree_image_upload.remove_current_image')
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📸 Camera image URI:', imageUri);
        console.log('📸 Image dimensions:', result.assets[0].width, 'x', result.assets[0].height);
        setImage(imageUri);
        setError(null);
      } else {
        console.log('❌ Camera capture canceled');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        t('yield_weather.my_yield.tree_image_upload.error'),
        t('yield_weather.my_yield.tree_image_upload.failed_capture')
      );
    }
  };

  const pickImageFromLibrary = async () => {
    if (image) {
      Alert.alert(
        t('yield_weather.my_yield.tree_image_upload.image_already_selected'),
        t('yield_weather.my_yield.tree_image_upload.remove_current_image')
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setError(null);
      }
    } catch (error) {
      console.error('Library error:', error);
      Alert.alert(
        t('yield_weather.my_yield.tree_image_upload.error'),
        t('yield_weather.my_yield.tree_image_upload.failed_select')
      );
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const analyzeImage = async () => {
    if (!image) {
      Alert.alert(
        t('yield_weather.my_yield.tree_image_upload.no_image'),
        t('yield_weather.my_yield.tree_image_upload.add_image_to_analyze')
      );
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      console.log(`Analyzing image for tree: ${treeCode}`);
      
      const result = await treeAnalysisAPI.analyzeSingleImage(image);
      
      console.log('Analysis result:', result);

      if (result.success) {
        // Calculate average circumference from individual stems
        const avgCircumference = result.individual_stems.length > 0
          ? result.individual_stems.reduce((sum, stem) => sum + stem.circumference_inches, 0) / result.individual_stems.length
          : 0;
        
        // Calculate overall confidence
        const avgConfidence = result.individual_stems.length > 0
          ? result.individual_stems.reduce((sum, stem) => sum + stem.confidence, 0) / result.individual_stems.length
          : 0;
        
        Alert.alert(
          t('yield_weather.my_yield.tree_image_upload.analysis_complete'),
          t('yield_weather.my_yield.tree_image_upload.detected_stems_message', {
            count: result.total_stems_detected,
            circumference: avgCircumference.toFixed(2),
            confidence: Math.round(avgConfidence * 100)
          }) + '\n\n' + 
          t('yield_weather.my_yield.tree_image_upload.harvestable_stems_message', {
            harvestable: result.harvestable_stems,
            total: result.total_stems_detected
          }),
          [
            {
              text: t('yield_weather.my_yield.tree_image_upload.use_results'),
              onPress: () => {
                onAnalysisComplete({
                  stem_count: result.total_stems_detected,
                  stem_circumference_inches: avgCircumference,
                  harvestable_stems: result.harvestable_stems,
                  total_stems: result.total_stems_detected,
                });
              },
            },
            {
              text: t('yield_weather.my_yield.tree_image_upload.retake_photo'),
              style: 'cancel',
              onPress: () => setImage(null),
            },
          ]
        );
      } else {
        setError(t('yield_weather.my_yield.tree_image_upload.analysis_failed'));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : t('yield_weather.my_yield.tree_image_upload.failed_analyze'));
      Alert.alert(
        t('yield_weather.my_yield.tree_image_upload.analysis_complete'),
        t('yield_weather.my_yield.tree_image_upload.failed_analyze')
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="camera" size={24} color="#4CAF50" />
          <Text style={styles.title}>{t('yield_weather.my_yield.tree_image_upload.title')}</Text>
        </View>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.treeCodeLabel}>
        {t('yield_weather.my_yield.tree_image_upload.tree_label')}: <Text style={styles.treeCodeValue}>{treeCode}</Text>
      </Text>

      {/* Photography Instructions */}
      <View style={styles.instructionsBox}>
        <View style={styles.instructionsHeader}>
          <Ionicons name="information-circle" size={22} color="#4CAF50" />
          <Text style={styles.instructionsTitle}>
            {t('yield_weather.my_yield.tree_image_upload.photo_instructions_title')}
          </Text>
        </View>
        <Text style={styles.instructionsSubtitle}>
          {t('yield_weather.my_yield.tree_image_upload.photo_instructions_subtitle')}
        </Text>
        
        <View style={styles.instructionItem}>
          <Ionicons name="arrow-down-circle" size={18} color="#4CAF50" />
          <Text style={styles.instructionText}>
            {t('yield_weather.my_yield.tree_image_upload.instruction_distance_ground')}
          </Text>
        </View>
        
        <View style={styles.instructionItem}>
          <Ionicons name="resize" size={18} color="#4CAF50" />
          <Text style={styles.instructionText}>
            {t('yield_weather.my_yield.tree_image_upload.instruction_distance_stem')}
          </Text>
        </View>
        
        <View style={styles.instructionItem}>
          <Ionicons name="sunny" size={18} color="#4CAF50" />
          <Text style={styles.instructionText}>
            {t('yield_weather.my_yield.tree_image_upload.instruction_lighting')}
          </Text>
        </View>
        
        <View style={styles.instructionItem}>
          <Ionicons name="eye" size={18} color="#4CAF50" />
          <Text style={styles.instructionText}>
            {t('yield_weather.my_yield.tree_image_upload.instruction_focus')}
          </Text>
        </View>
        
        <View style={styles.instructionItem}>
          <Ionicons name="image" size={18} color="#4CAF50" />
          <Text style={styles.instructionText}>
            {t('yield_weather.my_yield.tree_image_upload.instruction_angle')}
          </Text>
        </View>
      </View>

      {/* Single Image Display */}
      <View style={styles.singleImageContainer}>
        {image ? (
          <View style={styles.imageContainer}>
            <Image 
              key={image}
              source={{ uri: image }} 
              style={styles.singleImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('Image load error:', error.nativeEvent.error);
                Alert.alert('Error', 'Failed to load image. Please try again.');
              }}
              onLoad={() => console.log('✅ Image loaded successfully:', image)}
              onLoadStart={() => console.log('🔄 Image loading started...')}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeImage}
            >
              <Ionicons name="close-circle" size={28} color="#FF5252" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyImageSlot}>
            <Ionicons name="image-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptySlotText}>{t('yield_weather.my_yield.tree_image_upload.no_image_selected')}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cameraButton, (analyzing || !!image) && styles.buttonDisabled]}
          onPress={pickImageFromCamera}
          disabled={analyzing || !!image}
        >
          <Ionicons name="camera" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>{t('yield_weather.my_yield.tree_image_upload.take_photo')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.libraryButton, (analyzing || !!image) && styles.buttonDisabled]}
          onPress={pickImageFromLibrary}
          disabled={analyzing || !!image}
        >
          <Ionicons name="images" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>{t('yield_weather.my_yield.tree_image_upload.choose_photo')}</Text>
        </TouchableOpacity>
      </View>

      {/* Analyze Button */}
      {image && (
        <TouchableOpacity
          style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
          onPress={analyzeImage}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>{t('yield_weather.my_yield.tree_image_upload.analyzing')}...</Text>
            </>
          ) : (
            <>
              <Ionicons name="analytics" size={20} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>{t('yield_weather.my_yield.tree_image_upload.analyze_image')}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  treeCodeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    marginBottom: 16,
  },
  treeCodeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  instructionsBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  instructionsSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    marginLeft: 30,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    lineHeight: 20,
  },
  imageGrid: {
    flexDirection: 'row',
  },
  singleImageContainer: {
    marginBottom: 20,
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  singleImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  imageNumber: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    padding: 2,
  },
  emptyImageSlot: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
  },
  emptySlotText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
  },
  libraryButton: {
    backgroundColor: '#66BB6A',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#C62828',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TreeImageUpload;
