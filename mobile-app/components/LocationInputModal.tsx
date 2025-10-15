import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import locationService from '../services/locationService';

interface LocationInputModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSet: () => void;
}

const LocationInputModal: React.FC<LocationInputModalProps> = ({
  visible,
  onClose,
  onLocationSet,
}) => {
  const [cityName, setCityName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [inputType, setInputType] = useState<'city' | 'coordinates'>('city');

  const handleSetCity = () => {
    if (!cityName.trim()) {
      Alert.alert('Error', 'Please enter a city name');
      return;
    }
    locationService.setManualLocationByCity(cityName.trim());
    setCityName('');
    onLocationSet();
    onClose();
    Alert.alert('Success', `Location set to: ${cityName.trim()}`);
  };

  const handleSetCoordinates = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert('Error', 'Please enter a valid latitude (-90 to 90)');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert('Error', 'Please enter a valid longitude (-180 to 180)');
      return;
    }

    locationService.setManualLocation({ latitude: lat, longitude: lng });
    setLatitude('');
    setLongitude('');
    onLocationSet();
    onClose();
    Alert.alert('Success', `Location set to: ${lat}, ${lng}`);
  };

  const handleUseGPS = () => {
    locationService.clearManualLocation();
    onLocationSet();
    onClose();
    Alert.alert('Success', 'Switched to GPS location');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, inputType === 'city' && styles.activeTab]}
              onPress={() => setInputType('city')}
            >
              <Text style={[styles.tabText, inputType === 'city' && styles.activeTabText]}>
                City Name
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, inputType === 'coordinates' && styles.activeTab]}
              onPress={() => setInputType('coordinates')}
            >
              <Text style={[styles.tabText, inputType === 'coordinates' && styles.activeTabText]}>
                Coordinates
              </Text>
            </TouchableOpacity>
          </View>

          {inputType === 'city' ? (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>City Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., New York or London,UK"
                value={cityName}
                onChangeText={setCityName}
                autoCapitalize="words"
              />
              <TouchableOpacity style={styles.setButton} onPress={handleSetCity}>
                <Text style={styles.setButtonText}>Set City Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Coordinates</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Latitude (-90 to 90)"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.textInput}
                placeholder="Longitude (-180 to 180)"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.setButton} onPress={handleSetCoordinates}>
                <Text style={styles.setButtonText}>Set Coordinates</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          <TouchableOpacity style={styles.gpsButton} onPress={handleUseGPS}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.gpsButtonText}>Use GPS Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
  },
  setButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  setButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8F0',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  gpsButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default LocationInputModal;
