import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function OilYieldPredictorSecond() {
  const [cinnamonType, setCinnamonType] = useState('');
  const [plantPart, setPlantPart] = useState('');
  const [mass, setMass] = useState('');
  const [predictedYield, setPredictedYield] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const handlePredict = () => {
    // Removed local prediction math. Predictions must come from an external model/API.
    if (!cinnamonType || !plantPart || !mass) {
      setPredictedYield(null);
      setRecommendation(null);
      return;
    }

    // Provide a placeholder message instead of calculating values locally
    setPredictedYield('Prediction requires model/API (local math removed)');
    setRecommendation('Connect to the prediction service or provide model output to obtain actual yield.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Oil Yield Predictor 🌿</Text>

      {/* Input Section */}
      <Text style={styles.sectionTitle}>Input Details</Text>

      <BlurView intensity={30} tint="light" style={styles.card}>
        <Text style={styles.label}>Cinnamon Type</Text>
        <Picker
          selectedValue={cinnamonType}
          onValueChange={(itemValue) => setCinnamonType(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select Type" value="" />
          <Picker.Item label="Sri Gamunu" value="Sri Gamunu" />
          <Picker.Item label="Sri Wijaya" value="Sri Wijaya" />
        </Picker>
      </BlurView>

      <BlurView intensity={30} tint="light" style={styles.card}>
        <Text style={styles.label}>Plant Part</Text>
        <Picker
          selectedValue={plantPart}
          onValueChange={(itemValue) => setPlantPart(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select Part" value="" />
          <Picker.Item label="Bark" value="Bark" />
          <Picker.Item label="Leaf" value="Leaf" />
          <Picker.Item label="Twigs" value="Twigs" />
        </Picker>
      </BlurView>

      <BlurView intensity={30} tint="light" style={styles.card}>
        <Text style={styles.label}>Dried Mass (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter mass (e.g., 15)"
          placeholderTextColor="#A0A0A0"
          keyboardType="numeric"
          value={mass}
          onChangeText={setMass}
        />
      </BlurView>

      {/* Predict Button */}
      <TouchableOpacity style={styles.predictButton} onPress={handlePredict} activeOpacity={0.85}>
        <Text style={styles.predictText}>Predict Yield</Text>
      </TouchableOpacity>

      {/* Output Section */}
      {predictedYield && (
        <>
          <Text style={styles.sectionTitle}>Predicted Output</Text>

          <BlurView intensity={30} tint="light" style={styles.outputCard}>
            <MaterialCommunityIcons name="flask-outline" size={30} color="#2E7D32" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.outputTitle}>Predicted Oil Yield</Text>
              <Text style={styles.outputValue}>{predictedYield}</Text>
            </View>
          </BlurView>

          <BlurView intensity={30} tint="light" style={styles.outputCard}>
            <MaterialCommunityIcons name="leaf" size={28} color="#2E7D32" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.outputTitle}>Recommendations</Text>
              <Text style={styles.outputText}>{recommendation}</Text>
            </View>
          </BlurView>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 30,
    letterSpacing: 0.4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  picker: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    borderWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#000000',
  },
  predictButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 24,
    shadowColor: '#34C759',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  predictText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  outputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  outputTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  outputValue: {
    fontSize: 17,
    color: '#34C759',
    fontWeight: '600',
  },
  outputText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
  },
});
