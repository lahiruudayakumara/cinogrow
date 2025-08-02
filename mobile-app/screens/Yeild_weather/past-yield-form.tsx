import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';

type PastYieldFormNavigationProp = StackNavigationProp<YieldWeatherStackParamList, 'PastYieldForm'>;

interface PastYieldFormProps {
  navigation: PastYieldFormNavigationProp;
}

const PastYieldForm = ({ navigation }: PastYieldFormProps) => {
  const [yields, setYields] = useState([{ year: '', yield: '' }]);

  const handleAddYear = () => {
    setYields([...yields, { year: '', yield: '' }]);
  };

  const handleChange = (index: number, field: 'year' | 'yield', value: string) => {
    const newYields = [...yields];
    newYields[index][field] = value;
    setYields(newYields);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Past Yield Data</Text>
          <Text style={styles.subtitle}>Enter your past cinnamon yield data to get your yield estimate accuracy.</Text>
        </View>

        <View style={styles.form}>
          {yields.map((item, index) => (
            <View key={index} style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2023"
                  value={item.year}
                  onChangeText={(text) => handleChange(index, 'year', text)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Yield (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1200"
                  value={item.yield}
                  onChangeText={(text) => handleChange(index, 'yield', text)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={handleAddYear}>
            <Ionicons name="add" size={20} color="#4CAF50" style={styles.addIcon} />
            <Text style={styles.addButtonText}>Add Another Year</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('YieldPrediction')}>
            <Text style={styles.primaryButtonText}>Get Prediction</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  form: {
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  inputContainer: {
    flex: 0.48,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PastYieldForm;