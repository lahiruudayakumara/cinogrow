import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';

type FarmDetailsNavigationProp = StackNavigationProp<YieldWeatherStackParamList, 'FarmDetails'>;

interface FarmDetailsProps {
  navigation: FarmDetailsNavigationProp;
}

const FarmDetails = ({ navigation }: FarmDetailsProps) => {
  const [formData, setFormData] = useState({ 
    location: '', 
    area: '', 
    cinnamonType: '', 
    plantingDate: '' 
  });

  const handleNext = () => {
    navigation.navigate('PastYieldForm');
  };

  const handleSkip = () => {
    navigation.navigate('YieldPrediction');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Farm Details</Text>
          <Text style={styles.subtitle}>Please provide your farm information to get accurate yield predictions</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Farm Location</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Enter your farm location"
              value={formData.location} 
              onChangeText={(text) => setFormData({ ...formData, location: text })} 
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Area (Acres/Hectares)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Enter farm area"
              value={formData.area} 
              onChangeText={(text) => setFormData({ ...formData, area: text })} 
              keyboardType="numeric" 
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cinnamon Type</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                style={styles.picker} 
                selectedValue={formData.cinnamonType} 
                onValueChange={(itemValue) => setFormData({ ...formData, cinnamonType: itemValue })}
              >
                <Picker.Item label="Select Cinnamon Type" value="" />
                <Picker.Item label="Ceylon Cinnamon" value="Ceylon" />
                <Picker.Item label="Cassia Cinnamon" value="Cassia" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Planting Date</Text>
            <TextInput 
              style={styles.input} 
              placeholder="YYYY-MM-DD"
              value={formData.plantingDate} 
              onChangeText={(text) => setFormData({ ...formData, plantingDate: text })} 
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Get Yield Estimate</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
            <Text style={styles.secondaryButtonText}>Skip</Text>
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
  inputContainer: {
    marginBottom: 24,
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
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  picker: {
    height: 50,
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

export default FarmDetails;