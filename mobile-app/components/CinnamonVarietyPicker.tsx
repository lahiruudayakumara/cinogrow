import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CINNAMON_VARIETY_OPTIONS, DEFAULT_CINNAMON_VARIETY, CINNAMON_VARIETIES } from '../constants/CinnamonVarieties';
import CustomDropdown from './ui/CustomDropdown';

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

  const dropdownOptions = CINNAMON_VARIETIES.map((variety) => ({
    label: t(variety.translationKey),
    value: variety.value,
  }));

  return (
    <View style={[styles.container, style]}>
      <CustomDropdown
        options={dropdownOptions}
        selectedValue={value}
        onValueChange={onValueChange}
        label={displayLabel}
        placeholder={displayPlaceholder}
        disabled={disabled}
        modalTitle={displayLabel}
      />

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
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});