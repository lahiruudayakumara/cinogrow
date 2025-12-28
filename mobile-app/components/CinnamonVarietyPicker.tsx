import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { CINNAMON_VARIETY_OPTIONS, DEFAULT_CINNAMON_VARIETY, CINNAMON_VARIETIES } from '../constants/CinnamonVarieties';

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
  label,
  placeholder,
  style,
  disabled = false,
  showDescription = false,
}) => {
  const { t } = useTranslation();
  const selectedVariety = CINNAMON_VARIETY_OPTIONS.find(option => option.value === value);
  
  const displayLabel = label || t('yield_weather.common.cinnamon_variety');
  const displayPlaceholder = placeholder || t('yield_weather.common.select_variety');

  return (
    <View style={[styles.container, style]}>
      {displayLabel && <Text style={styles.label}>{displayLabel}</Text>}
      
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          enabled={!disabled}
          style={styles.picker}
        >
          <Picker.Item 
            label={displayPlaceholder} 
            value="" 
            color="#9CA3AF"
          />
          {CINNAMON_VARIETIES.map((variety) => (
            <Picker.Item
              key={variety.value}
              label={t(variety.translationKey)}
              value={variety.value}
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
    height: 56,
    color: '#111827',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});