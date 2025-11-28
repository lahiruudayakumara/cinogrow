import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OilQualityGuide() {
  const [color, setColor] = useState('');
  const [clarity, setClarity] = useState('');
  const [density, setDensity] = useState('');
  const [aroma, setAroma] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const calculateQuality = () => {
    if (!color || !clarity || !density || !aroma) {
      Alert.alert('Missing data', 'Please select or enter all fields to evaluate quality.');
      return;
    }

    const d = parseFloat(density);
    if (isNaN(d) || d <= 0) {
      Alert.alert('Invalid density', 'Please enter a valid numeric density value.');
      return;
    }

    // scoring weights (0-100 scale)
    const colorScoreMap: Record<string, number> = {
      'pale_yellow': 90,
      'amber': 75,
      'golden': 80,
      'dark': 50,
    };
    const clarityScoreMap: Record<string, number> = {
      'clear': 90,
      'slightly_cloudy': 70,
      'cloudy': 40,
    };
    const aromaScoreMap: Record<string, number> = {
      'mild': 60,
      'aromatic': 90,
      'pungent': 75,
    };

    const colorScore = colorScoreMap[color] ?? 60;
    const clarityScore = clarityScoreMap[clarity] ?? 60;
    const aromaScore = aromaScoreMap[aroma] ?? 60;

    // density ideal window (example for cinnamon oil ~0.88-0.92 g/mL)
    let densityScore = 60;
    if (d >= 0.88 && d <= 0.92) densityScore = 95;
    else if (d >= 0.85 && d < 0.88) densityScore = 75;
    else if (d > 0.92 && d <= 0.95) densityScore = 70;
    else densityScore = 45;

    // weighted average
    const finalScore = Math.round(
      (colorScore * 0.25) + (clarityScore * 0.25) + (aromaScore * 0.25) + (densityScore * 0.25)
    );

    let qualityLabel = '';
    const recs: string[] = [];

    if (finalScore >= 85) {
      qualityLabel = 'Excellent';
      recs.push('Ready for commercial use', 'Store in dark, cool place to preserve aroma.');
    } else if (finalScore >= 70) {
      qualityLabel = 'Good';
      recs.push('Consider mild purification', 'Monitor storage conditions.');
    } else if (finalScore >= 50) {
      qualityLabel = 'Fair';
      recs.push('May require filtering or light refinement', 'Check raw materials and distillation parameters.');
    } else {
      qualityLabel = 'Poor';
      recs.push('Perform quality control steps', 'Investigate distillation/drying issues, discard if contaminated.');
    }

    setScore(finalScore);
    setLabel(qualityLabel);
    setRecommendations(recs);
  };

  const clearForm = () => {
    setColor('');
    setClarity('');
    setDensity('');
    setAroma('');
    setScore(null);
    setLabel('');
    setRecommendations([]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>
        Oil Quality Guide
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={color} onValueChange={(v) => setColor(v)} style={styles.picker}>
            <Picker.Item label="Select color" value="" />
            <Picker.Item label="Pale Yellow" value="pale_yellow" />
            <Picker.Item label="Golden" value="golden" />
            <Picker.Item label="Amber" value="amber" />
            <Picker.Item label="Dark" value="dark" />
          </Picker>
        </View>

        <Text style={styles.label}>Clarity</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={clarity} onValueChange={(v) => setClarity(v)} style={styles.picker}>
            <Picker.Item label="Select clarity" value="" />
            <Picker.Item label="Clear" value="clear" />
            <Picker.Item label="Slightly Cloudy" value="slightly_cloudy" />
            <Picker.Item label="Cloudy" value="cloudy" />
          </Picker>
        </View>

        <Text style={styles.label}>Density (g/mL)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 0.89"
          keyboardType="decimal-pad"
          value={density}
          onChangeText={setDensity}
        />

        <Text style={styles.label}>Aroma</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={aroma} onValueChange={(v) => setAroma(v)} style={styles.picker}>
            <Picker.Item label="Select aroma" value="" />
            <Picker.Item label="Mild" value="mild" />
            <Picker.Item label="Aromatic" value="aromatic" />
            <Picker.Item label="Pungent" value="pungent" />
          </Picker>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.calculateButton} onPress={calculateQuality}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#fff" />
            <Text style={styles.calculateButtonText}>  Evaluate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {score !== null ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Quality Score</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>{score}</Text>
            <Text style={styles.qualityLabel}>{label}</Text>
          </View>

          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {recommendations.map((r, i) => (
            <Text key={i} style={styles.recommendationText}>• {r}</Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fdf8' },
  contentContainer: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#1e3a2b', marginBottom: 12, textAlign: 'center' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 14, color: '#2f4f4f', marginBottom: 6, fontWeight: '600' },
  pickerContainer: { backgroundColor: '#f2f9f4', borderRadius: 10, marginBottom: 12 },
  picker: { height: 48, color: '#1c1c1e' },
  input: {
    backgroundColor: '#f2f9f4',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: '#1c1c1e',
    marginBottom: 12,
  },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5a4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  calculateButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  clearButtonText: { color: '#374151', fontSize: 15, fontWeight: '600' },

  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  resultLabel: { fontSize: 14, color: '#374151', fontWeight: '700', marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  scoreText: { fontSize: 36, fontWeight: '800', color: '#0f766e' },
  qualityLabel: { fontSize: 16, fontWeight: '700', color: '#065f46' },

  recommendationsTitle: { fontSize: 15, fontWeight: '700', color: '#1e3a2b', marginTop: 6, marginBottom: 6 },
  recommendationText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 4 },
});
