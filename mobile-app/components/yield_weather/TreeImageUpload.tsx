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
    confidence: number;
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
        setImage(result.assets[0].uri);
        setError(null);
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
        Alert.alert(
          t('yield_weather.my_yield.tree_image_upload.analysis_complete'),
          t('yield_weather.my_yield.tree_image_upload.detected_stems_message', {
            count: result.stem_count,
            circumference: result.stem_circumference_inches,
            confidence: Math.round(result.confidence * 100)
          }),
          [
            {
              text: t('yield_weather.my_yield.tree_image_upload.use_results'),
              onPress: () => {
                onAnalysisComplete({
                  stem_count: result.stem_count,
                  stem_circumference_inches: result.stem_circumference_inches,
                  confidence: result.confidence,
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

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#2196F3" />
        <Text style={styles.infoText}>
          {t('yield_weather.my_yield.tree_image_upload.info_text')}
        </Text>
      </View>

      <Text style={styles.treeCodeLabel}>{t('yield_weather.my_yield.tree_image_upload.tree_label')}: {treeCode}</Text>

      {/* Single Image Display */}
      <View style={styles.singleImageContainer}>
        {image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.singleImage} />
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
          style={[styles.button, styles.cameraButton]}
          onPress={pickImageFromCamera}
          disabled={analyzing || !!image}
        >
          <Ionicons name="camera" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>{t('yield_weather.my_yield.tree_image_upload.take_photo')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.libraryButton]}
          onPress={pickImageFromLibrary}
          disabled={analyzing || !!image}
        >
          <Ionicons name="image" size={20} color="#FFFFFF" />
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

      {/* Tips */}
      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>{t('yield_weather.my_yield.tree_image_upload.photo_tips_title')}:</Text>
        <Text style={styles.tipText}>• {t('yield_weather.my_yield.tree_image_upload.tip_lighting')}</Text>
        <Text style={styles.tipText}>• {t('yield_weather.my_yield.tree_image_upload.tip_steady')}</Text>
        <Text style={styles.tipText}>• {t('yield_weather.my_yield.tree_image_upload.tip_stem_area')}</Text>
        <Text style={styles.tipText}>• {t('yield_weather.my_yield.tree_image_upload.tip_front_view')}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
  },
  treeCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
  },
  singleImageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cameraButton: {
    backgroundColor: '#2196F3',
  },
  libraryButton: {
    backgroundColor: '#FF9800',
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
    borderRadius: 8,
    marginBottom: 20,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipsBox: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#F57C00',
    marginBottom: 4,
  },
});

export default TreeImageUpload;
