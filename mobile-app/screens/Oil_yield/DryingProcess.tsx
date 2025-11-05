import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function DryingProcess() {
  const [plantPart, setPlantPart] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🔄 Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // 🌿 Simple algorithm for estimated drying time
  useEffect(() => {
    if (plantPart === 'Bark') setEstimatedDuration(36);
    else if (plantPart === 'Leaf') setEstimatedDuration(24);
    else if (plantPart === 'Twigs') setEstimatedDuration(30);
    else setEstimatedDuration(null);
  }, [plantPart]);

  const toggleTimer = () => setIsRunning((prev) => !prev);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Drying Process ☀️</Text>

      {/* Input Section */}
      <Text style={styles.sectionTitle}>Select Plant Part</Text>
      <BlurView intensity={30} tint="light" style={styles.card}>
        <Picker
          selectedValue={plantPart}
          onValueChange={(value) => setPlantPart(value)}
          style={styles.picker}
        >
          <Picker.Item label="Choose part" value="" />
          <Picker.Item label="Bark" value="Bark" />
          <Picker.Item label="Leaf" value="Leaf" />
          <Picker.Item label="Twigs" value="Twigs" />
        </Picker>
      </BlurView>

      {/* Drying Timer Section */}
      <Text style={styles.sectionTitle}>Drying Timer</Text>
      <BlurView intensity={30} tint="light" style={styles.timerCard}>
        <Feather name="clock" size={36} color="#2E7D32" />
        <View style={{ marginLeft: 14 }}>
          <Text style={styles.timerText}>{formatTime(time)}</Text>
          <Text style={styles.timerLabel}>
            {isRunning ? 'Drying in progress...' : 'Timer paused'}
          </Text>
        </View>
      </BlurView>

      {/* Start / Pause Button */}
      <TouchableOpacity
        style={[styles.button, isRunning ? styles.pauseButton : styles.startButton]}
        onPress={toggleTimer}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>{isRunning ? 'Pause' : 'Start Drying'}</Text>
      </TouchableOpacity>

      {/* Output Section */}
      {estimatedDuration && (
        <>
          <Text style={styles.sectionTitle}>Estimated Drying Time</Text>
          <BlurView intensity={30} tint="light" style={styles.outputCard}>
            <MaterialCommunityIcons name="timer-sand" size={30} color="#2E7D32" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.outputTitle}>Optimal Drying Duration</Text>
              <Text style={styles.outputValue}>{estimatedDuration} hours</Text>
            </View>
          </BlurView>

          <BlurView intensity={30} tint="light" style={styles.outputCard}>
            <MaterialCommunityIcons name="leaf" size={28} color="#2E7D32" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.outputTitle}>Recommendations</Text>
              <Text style={styles.outputText}>
                {plantPart === 'Bark'
                  ? 'Ensure steady air flow and sunlight exposure.'
                  : plantPart === 'Leaf'
                  ? 'Avoid overheating; maintain shade-drying for color retention.'
                  : 'Rotate twigs evenly for uniform drying results.'}
              </Text>
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
    backgroundColor: '#FAFAF5',
  },
  scrollContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 25,
    fontFamily: 'serif',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    marginVertical: 12,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 0.6,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  picker: {
    color: '#1B5E20',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(240,255,240,0.9)',
    borderWidth: 0.6,
    borderColor: 'rgba(76,175,80,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B5E20',
  },
  timerLabel: {
    fontSize: 13,
    color: '#4E7048',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#2E7D32',
  },
  pauseButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 0.6,
    borderColor: 'rgba(76,175,80,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  outputTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 3,
  },
  outputValue: {
    fontSize: 15,
    color: '#4E7048',
    fontWeight: '500',
  },
  outputText: {
    fontSize: 14,
    color: '#4E7048',
    lineHeight: 20,
  },
});
