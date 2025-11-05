import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function DistillationProcess() {
  const [plantPart, setPlantPart] = useState('');
  const [cinnamonType, setCinnamonType] = useState('');
  const [stillCapacity, setStillCapacity] = useState('');
  const [optimalTime, setOptimalTime] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // --- Calculation Logic ---
  const calculateOptimalTime = () => {
    if (!plantPart || !cinnamonType || !stillCapacity) {
      Alert.alert('Missing Data', 'Please select all inputs to calculate optimal time.');
      return;
    }

    const capacity = parseFloat(stillCapacity);
    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid still capacity.');
      return;
    }

    // Base times (in hours) by plant part
    let baseTime = 0;
    switch (plantPart) {
      case 'bark':
        baseTime = 7;
        break;
      case 'leaf':
        baseTime = 5;
        break;
      case 'twigs':
        baseTime = 6;
        break;
      default:
        baseTime = 6;
    }

    // Cinnamon variety adjustment
    if (cinnamonType === 'sri_gamunu') baseTime += 0.5;
    if (cinnamonType === 'sri_wijaya') baseTime -= 0.3;

    // Capacity factor
    const adjustedTime = baseTime + capacity * 0.05;
    const hours = adjustedTime.toFixed(1);

    setOptimalTime(`${hours} hours`);
    setRemainingTime(Math.round(adjustedTime * 60)); // convert to minutes
  };

  // --- Countdown timer ---
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunning && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prev) => (prev > 0 ? prev - 1 : 0));
      }, 60000); // every minute
    }
    return () => clearInterval(timer);
  }, [isRunning, remainingTime]);

  const handleStartPause = () => {
    if (!optimalTime) {
      Alert.alert('No Calculation', 'Please calculate optimal time first.');
      return;
    }
    setIsRunning(!isRunning);
  };

  // --- Helper to display countdown nicely ---
  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Distillation Process 🌿</Text>

        {/* Input Elements */}
        <View style={styles.card}>
          <Text style={styles.label}>Plant Part</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={plantPart}
              onValueChange={(value) => setPlantPart(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select Plant Part" value="" />
              <Picker.Item label="Bark" value="bark" />
              <Picker.Item label="Leaf" value="leaf" />
              <Picker.Item label="Twigs" value="twigs" />
            </Picker>
          </View>

          <Text style={styles.label}>Cinnamon Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={cinnamonType}
              onValueChange={(value) => setCinnamonType(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select Cinnamon Type" value="" />
              <Picker.Item label="Sri Gamunu" value="sri_gamunu" />
              <Picker.Item label="Sri Wijaya" value="sri_wijaya" />
            </Picker>
          </View>

          <Text style={styles.label}>Still Capacity (L)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter still capacity"
            keyboardType="numeric"
            value={stillCapacity}
            onChangeText={setStillCapacity}
          />

          <TouchableOpacity style={styles.calculateButton} onPress={calculateOptimalTime}>
            <Text style={styles.calculateButtonText}>Calculate Optimal Time ⏱️</Text>
          </TouchableOpacity>
        </View>

        {/* Output Elements */}
        {optimalTime ? (
          <View style={styles.card}>
            <Text style={styles.label}>Optimal Distillation Time</Text>
            <View style={styles.outputCard}>
              <Text style={styles.outputText}>{optimalTime}</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleStartPause}>
              <Text style={styles.buttonText}>{isRunning ? 'Pause ⏸️' : 'Start ▶️'}</Text>
            </TouchableOpacity>

            <Text style={styles.timerText}>
              {isRunning
                ? `Time Remaining: ${formatTime(remainingTime)}`
                : remainingTime > 0
                ? `Ready to start: ${formatTime(remainingTime)}`
                : ''}
            </Text>

            <Text style={styles.recommendationsTitle}>Recommendations</Text>
            <Text style={styles.recommendationText}>
              • Maintain temperature around 105°C{'\n'}
              • Monitor steam pressure closely{'\n'}
              • Avoid overfilling the still
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fdf8',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // Add extra padding at bottom for better scrolling
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e3a2b',
    marginBottom: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    color: '#2f4f4f',
    marginBottom: 6,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#f2f9f4',
    borderRadius: 10,
    marginBottom: 12,
  },
  picker: {
    height: 50,
    color: '#1c1c1e',
  },
  input: {
    backgroundColor: '#f2f9f4',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: '#1c1c1e',
  },
  calculateButton: {
    backgroundColor: '#34d399',
    borderRadius: 25,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  outputCard: {
    backgroundColor: '#eaf8ee',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  outputText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a2b',
  },
  button: {
    backgroundColor: '#4ade80',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 25,
    alignSelf: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#1e3a2b',
    marginBottom: 8,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a2b',
    marginTop: 10,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
