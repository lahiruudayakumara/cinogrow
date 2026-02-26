import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DropdownOption {
  label: string;
  value: string | number;
  subtitle?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  selectedValue: string | number | null;
  onValueChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  style?: any;
  disabled?: boolean;
  error?: string;
  modalTitle?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option',
  label,
  style,
  disabled = false,
  error,
  modalTitle,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (value: string | number) => {
    onValueChange(value);
    setIsVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.dropdown,
          disabled && styles.dropdownDisabled,
          error && styles.dropdownError,
        ]}
        onPress={() => !disabled && setIsVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dropdownText,
          !selectedValue && styles.placeholderText
        ]}>
          {displayText}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={disabled ? '#9CA3AF' : '#6B7280'} 
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalTitle || label || placeholder}
              </Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === selectedValue && styles.optionItemSelected
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionLabel,
                      item.value === selectedValue && styles.optionLabelSelected
                    ]}>
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  {item.value === selectedValue && (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default CustomDropdown;

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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    minHeight: 56,
  },
  dropdownDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  dropdownError: {
    borderColor: '#EF4444',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
});
