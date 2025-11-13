import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CINNAMON_VARIETY_OPTIONS, DEFAULT_CINNAMON_VARIETY } from '../constants/CinnamonVarieties';

interface CinnamonVarietyPickerProps {
  value?: string;
  onValueChange: (variety: string) => void;
  label?: string;
  placeholder?: string;
  style?: any;
  disabled?: boolean;
  showDescription?: boolean;
}

export const CinnamonVarietyPicker: React.FC<CinnamonVarietyPickerProps> = ({
  value = '',
  onValueChange,
  label = 'Cinnamon Variety',
  placeholder = 'Select variety',
  style,
  disabled = false,
  showDescription = false,
}) => {
  const selectedVariety = CINNAMON_VARIETY_OPTIONS.find(option => option.value === value);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          enabled={!disabled}
          style={styles.picker}
        >
          <Picker.Item 
            label={placeholder} 
            value="" 
            color="#9CA3AF"
          />
          {CINNAMON_VARIETY_OPTIONS.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>

      {showDescription && selectedVariety && (
        <Text style={styles.description}>
          {selectedVariety.description}
        </Text>
      )}
    </View>
  );
};

export default CinnamonVarietyPicker;

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#111827',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});