/**
 * ROBOFLOW DIRECT USAGE EXAMPLE
 * 
 * This is a standalone example showing how to directly call Roboflow
 * from React Native without going through the backend.
 * 
 * Use this if you want to bypass the backend and call Roboflow directly.
 */

import React, { useState } from 'react';
import { Button, Text, View, ScrollView, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function DirectRoboflowExample() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Step 1: Request camera permissions and capture/select image
   */
  const pickImage = async () => {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    // Launch camera to capture image
    let pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1, // High quality
      allowsEditing: false,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      uploadToRoboflow(pickerResult.assets[0].uri);
    }
  };

  /**
   * Alternative: Select from gallery
   */
  const selectFromGallery = async () => {
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      uploadToRoboflow(pickerResult.assets[0].uri);
    }
  };

  /**
   * Step 2: Upload image directly to Roboflow Workflow
   * 
   * IMPORTANT: This example uses direct Roboflow API call.
   * In production, you should call through your backend for security.
   */
  const uploadToRoboflow = async (imageUri: string) => {
    // Your Roboflow configuration
    const ROBOFLOW_WORKFLOW_URL = 'https://serverless.roboflow.com/custom-workflow-2';
    const ROBOFLOW_API_KEY = 'DXgqf5LWaCPUOYZkNzEt'; // ⚠️ Should be in backend, not exposed

    setLoading(true);
    setResult(null);

    try {
      console.log('📸 Uploading image to Roboflow...');
      console.log(`🖼️ Image URI: ${imageUri}`);

      // Create FormData for image upload
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'leaf.jpg', // Or extract extension from URI if needed
        type: 'image/jpeg',
      } as any);

      // ⚠️ CRITICAL: Do NOT set Content-Type header manually
      // React Native will automatically set it with the correct boundary
      const response = await fetch(ROBOFLOW_WORKFLOW_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ROBOFLOW_API_KEY}`,
          // DO NOT add 'Content-Type': 'multipart/form-data'
        },
        body: formData,
      });

      console.log(`📊 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Roboflow error: ${errorText}`);
        throw new Error(`Roboflow API failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Roboflow response:', data);

      // Save result to state to display
      setResult(data);

      Alert.alert('Success', 'Analysis complete! See results below.');

    } catch (error) {
      console.error('❌ Upload error:', error);
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      Alert.alert('Error', `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Display the results
   */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌿 Direct Roboflow Example</Text>
      <Text style={styles.subtitle}>Capture leaf image and get AI analysis</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="📷 Capture with Camera"
          onPress={pickImage}
          disabled={loading}
        />
        <Button
          title="🖼️ Select from Gallery"
          onPress={selectFromGallery}
          disabled={loading}
        />
      </View>

      {loading && (
        <Text style={styles.loading}>🔄 Analyzing image with Roboflow AI...</Text>
      )}

      {result && (
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.resultTitle}>
            {result.error ? '❌ Error' : '✅ Roboflow Output'}
          </Text>
          <Text style={styles.jsonText} selectable>
            {JSON.stringify(result, null, 2)}
          </Text>
        </ScrollView>
      )}

      {/* Example of parsing specific fields */}
      {result && !result.error && (
        <View style={styles.parsedResults}>
          <Text style={styles.parsedTitle}>📊 Parsed Results:</Text>
          {result.predictions && result.predictions.length > 0 ? (
            result.predictions.map((pred: any, index: number) => (
              <View key={index} style={styles.predictionCard}>
                <Text style={styles.predictionClass}>
                  Class: {pred.class || 'Unknown'}
                </Text>
                <Text style={styles.predictionConfidence}>
                  Confidence: {((pred.confidence || 0) * 100).toFixed(1)}%
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noPredictions}>No predictions found</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  loading: {
    fontSize: 16,
    color: '#D97706',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 16,
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  parsedResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  parsedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  predictionCard: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  predictionClass: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  predictionConfidence: {
    fontSize: 13,
    color: '#6B7280',
  },
  noPredictions: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

/**
 * USAGE NOTES:
 * 
 * 1. Permissions:
 *    - Add camera permissions in app.json:
 *      "permissions": ["CAMERA", "CAMERA_ROLL"]
 *    - Request permissions before using camera
 * 
 * 2. File Format:
 *    - Ensure images are JPEG or PNG
 *    - Keep file size under 10MB for best performance
 * 
 * 3. Security (IMPORTANT):
 *    - ⚠️ DO NOT expose API keys in production apps
 *    - Move API calls to backend server
 *    - Use backend to proxy Roboflow requests
 *    - This example is for development/testing only
 * 
 * 4. Error Handling:
 *    - Always wrap API calls in try-catch
 *    - Provide user feedback for all states (loading, success, error)
 *    - Log errors for debugging
 * 
 * 5. Response Format:
 *    - Roboflow workflow returns JSON with predictions
 *    - Parse the response based on your workflow configuration
 *    - Example structure: { predictions: [{class, confidence}], time_ms: 245 }
 * 
 * 6. React Native Specific:
 *    - ⚠️ Never set Content-Type header manually with FormData
 *    - Let React Native handle multipart boundary automatically
 *    - Use 'as any' type assertion for FormData file object
 */
