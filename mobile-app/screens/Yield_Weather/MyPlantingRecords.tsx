import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';
import { plantingRecordsAPI, PlantingRecord, Plot } from '../../services/yield_weather/plantingRecordsAPI';
import DatePicker from '../../components/ui/DatePicker';

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

interface DropdownItem {
  id: number;
  name: string;
  area: number;
}

const MyPlantingRecords = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plantingRecords, setPlantingRecords] = useState<PlantingRecord[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PlantingRecord | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Form state
  const [selectedPlot, setSelectedPlot] = useState<DropdownItem | null>(null);
  const [plotArea, setPlotArea] = useState('');
  const [variety, setVariety] = useState('');
  const [seedlingCount, setSeedlingCount] = useState('');
  const [plantedDate, setPlantedDate] = useState<Date | null>(null);

  // Mock user ID - in a real app, this would come from authentication
  const USER_ID = 1;

  // Load data
  const loadData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Test backend connection and load data
      try {
        const isBackendAvailable = await plantingRecordsAPI.testConnection();
        setBackendAvailable(isBackendAvailable);
        
        if (isBackendAvailable) {
          // Load plots and planting records
          await Promise.all([loadPlots(true), loadPlantingRecords(true)]);
        }
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendAvailable(false);
        Alert.alert(
          'Connection Error', 
          'Unable to connect to the server. Please check your internet connection and ensure the backend server is running.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPlots = async (useBackend = false) => {
    if (!useBackend) {
      console.warn('Backend not available, skipping plots loading');
      return;
    }
    
    try {
      // Try to get plots from first farm
      const farms = await plantingRecordsAPI.getFarms();
      if (farms && farms.length > 0) {
        const plots = await plantingRecordsAPI.getFarmPlots(farms[0].id);
        setPlots(plots || []);
      } else {
        console.warn('No farms found');
        setPlots([]);
      }
    } catch (error) {
      console.error('Failed to load plots from backend:', error);
      setPlots([]);
      // Don't show alert here as it's handled in loadData
    }
  };

  const loadPlantingRecords = async (useBackend = false) => {
    if (!useBackend) {
      console.warn('Backend not available, skipping planting records loading');
      return;
    }
    
    try {
      const records = await plantingRecordsAPI.getUserPlantingRecords(USER_ID);
      setPlantingRecords(records || []);
    } catch (error) {
      console.error('Failed to load planting records from backend:', error);
      setPlantingRecords([]);
      // Don't show alert here as it's handled in loadData
    }
  };

  const clearForm = () => {
    setSelectedPlot(null);
    setPlotArea('');
    setVariety('');
    setSeedlingCount('');
    setPlantedDate(null);
  };

  const handlePlotSelect = (plot: DropdownItem) => {
    setSelectedPlot(plot);
    setPlotArea(plot.area.toString());
    setDropdownVisible(false);

    // Check if there's already a record for this plot
    const existingRecord = plantingRecords.find(record => record.plot_id === plot.id);
    if (existingRecord && !isEditing) {
      Alert.alert(
        'Plot Already Has Record',
        `Plot ${plot.name} already has a planting record. Do you want to edit it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit Record',
            onPress: () => handleEditRecord(existingRecord),
          },
        ]
      );
    }
  };

  const handleSaveRecord = async () => {
    try {
      // Validate form
      if (!selectedPlot || !variety.trim() || !seedlingCount.trim() || !plantedDate) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const seedlingValue = parseInt(seedlingCount);
      const areaValue = parseFloat(plotArea);
      
      if (isNaN(seedlingValue) || seedlingValue <= 0) {
        Alert.alert('Error', 'Please enter a valid seedling count');
        return;
      }

      if (isNaN(areaValue) || areaValue <= 0) {
        Alert.alert('Error', 'Please enter a valid plot area');
        return;
      }

      // Format date for API (YYYY-MM-DD)
      const formattedDate = plantedDate.toISOString().split('T')[0];

      setLoading(true);

      const recordData: PlantingRecord = {
        user_id: USER_ID,
        plot_id: selectedPlot.id,
        plot_name: selectedPlot.name,
        plot_area: areaValue,
        cinnamon_variety: variety.trim(),
        seedling_count: seedlingValue,
        planted_date: formattedDate,
      };

      if (isEditing && editingRecord?.record_id) {
        // Update existing record
        if (editingRecord.is_local_only) {
          // Update local-only record
          recordData.record_id = editingRecord.record_id;
          recordData.is_local_only = true;
          recordData.created_at = editingRecord.created_at;
          
          setPlantingRecords(prev => 
            prev.map(record => 
              record.record_id === editingRecord.record_id ? recordData : record
            )
          );
        } else {
          // Update backend record
          const updatedRecord = await saveRecordToBackend(recordData, true, editingRecord.record_id);
          
          if (updatedRecord) {
            // Update local state with backend response
            setPlantingRecords(prev => 
              prev.map(record => 
                record.record_id === editingRecord.record_id ? updatedRecord : record
              )
            );
          } else {
            // Fallback to local update if backend fails
            recordData.record_id = editingRecord.record_id;
            recordData.created_at = editingRecord.created_at;
            recordData.is_local_only = true;
            
            setPlantingRecords(prev => 
              prev.map(record => 
                record.record_id === editingRecord.record_id ? recordData : record
              )
            );
          }
        }
        Alert.alert('Success', 'Planting record updated successfully');
      } else {
        // Create new record
        const createdRecord = await saveRecordToBackend(recordData, false);
        
        if (createdRecord) {
          // Add to local state with backend response
          setPlantingRecords(prev => [...prev, createdRecord]);
        } else {
          // Fallback for offline mode - mark as local-only
          recordData.record_id = Date.now();
          recordData.created_at = new Date().toISOString();
          recordData.is_local_only = true;
          setPlantingRecords(prev => [...prev, recordData]);
        }
        Alert.alert('Success', 'Planting record saved successfully');
      }

      setModalVisible(false);
      clearForm();
      setIsEditing(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error saving record:', error);
      Alert.alert('Error', 'Failed to save planting record');
    } finally {
      setLoading(false);
    }
  };

  const saveRecordToBackend = async (record: PlantingRecord, isUpdate: boolean, recordId?: number): Promise<PlantingRecord | null> => {
    if (backendAvailable) {
      try {
        if (isUpdate && recordId) {
          const updatedRecord = await plantingRecordsAPI.updatePlantingRecord(recordId, {
            plot_area: record.plot_area,
            cinnamon_variety: record.cinnamon_variety,
            seedling_count: record.seedling_count,
            planted_date: record.planted_date,
          });
          return updatedRecord;
        } else {
          const createdRecord = await plantingRecordsAPI.createPlantingRecord({
            user_id: record.user_id,
            plot_id: record.plot_id,
            plot_area: record.plot_area,
            cinnamon_variety: record.cinnamon_variety,
            seedling_count: record.seedling_count,
            planted_date: record.planted_date,
          });
          return createdRecord;
        }
      } catch (error) {
        console.warn('Backend operation failed, continuing with local data:', error);
        return null;
      }
    }
    
    // Return null for offline mode - let caller handle fallback
    return null;
  };

  const handleEditRecord = (record: PlantingRecord) => {
    setEditingRecord(record);
    setIsEditing(true);
    
    // Find and set the plot
    const plot = plots.find(p => p.id === record.plot_id);
    if (plot) {
      setSelectedPlot({ id: plot.id, name: plot.name, area: plot.area });
    }
    
    // Set form values
    setPlotArea(record.plot_area.toString());
    setVariety(record.cinnamon_variety);
    setSeedlingCount(record.seedling_count.toString());
    setPlantedDate(new Date(record.planted_date));
    
    setModalVisible(true);
  };

  const handleDeleteRecord = (record: PlantingRecord) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete the planting record for ${record.plot_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Try to delete from backend only if record exists in backend
              if (backendAvailable && record.record_id && !record.is_local_only) {
                try {
                  await plantingRecordsAPI.deletePlantingRecord(record.record_id);
                  console.log('✅ Record deleted from backend successfully');
                } catch (error) {
                  console.warn('Backend delete failed, continuing with local removal:', error);
                }
              } else if (record.is_local_only) {
                console.log('🔧 Deleting local-only record, skipping backend call');
              }
              
              // Remove from local state
              setPlantingRecords(prev => 
                prev.filter(r => r.record_id !== record.record_id)
              );
              
              Alert.alert('Success', 'Planting record deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete record');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onRefresh = () => {
    loadData(true);
  };

  const handleAddRecord = () => {
    setIsEditing(false);
    setEditingRecord(null);
    clearForm();
    setModalVisible(true);
  };

  // Sync local-only records with backend
  const syncLocalRecords = async () => {
    if (!backendAvailable) return;

    const localOnlyRecords = plantingRecords.filter(record => record.is_local_only);
    if (localOnlyRecords.length === 0) return;

    console.log(`🔄 Syncing ${localOnlyRecords.length} local-only records with backend`);

    for (const record of localOnlyRecords) {
      try {
        const createdRecord = await plantingRecordsAPI.createPlantingRecord({
          user_id: record.user_id,
          plot_id: record.plot_id,
          plot_area: record.plot_area,
          cinnamon_variety: record.cinnamon_variety,
          seedling_count: record.seedling_count,
          planted_date: record.planted_date,
        });

        if (createdRecord) {
          // Replace local record with backend record
          setPlantingRecords(prev => 
            prev.map(r => 
              r.record_id === record.record_id ? createdRecord : r
            )
          );
          console.log('✅ Synced local record to backend');
        }
      } catch (error) {
        console.error('❌ Failed to sync local record:', error);
      }
    }
  };

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadData().then(() => {
        // Try to sync local records after loading
        syncLocalRecords();
      });
    }, [])
  );

  const renderRecordItem = ({ item }: { item: PlantingRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.plotNameContainer}>
          <Text style={styles.plotName}>{item.plot_name}</Text>
          {item.is_local_only && (
            <View style={styles.localOnlyBadge}>
              <Text style={styles.localOnlyText}>Local Only</Text>
            </View>
          )}
        </View>
        <View style={styles.recordActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditRecord(item)}
          >
            <Ionicons name="create-outline" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteRecord(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.recordDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Variety:</Text>
          <Text style={styles.detailValue}>{item.cinnamon_variety}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Planted Date:</Text>
          <Text style={styles.detailValue}>{formatDate(item.planted_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Seedling Count:</Text>
          <Text style={styles.detailValue}>{item.seedling_count.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plot Area:</Text>
          <Text style={styles.detailValue}>{item.plot_area} ha</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading planting records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Planting Records</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddRecord}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Records List */}
        {plantingRecords.length > 0 ? (
          <View style={styles.recordsSection}>
            <Text style={styles.sectionTitle}>Planting History</Text>
            <FlatList
              data={plantingRecords}
              renderItem={renderRecordItem}
              keyExtractor={(item) => item.record_id!.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              style={styles.recordsList}
            />
          </View>
        ) : (
          <View style={styles.noRecordsContainer}>
            <Ionicons name="leaf-outline" size={64} color="#6B7280" />
            <Text style={styles.noRecordsText}>No planting records yet</Text>
            <Text style={styles.noRecordsSubtext}>
              Add your first planting record to track your cinnamon cultivation
            </Text>
            <TouchableOpacity
              style={styles.addRecordButton}
              onPress={handleAddRecord}
            >
              <Text style={styles.addRecordButtonText}>Add Planting Record</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Record Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Record' : 'Add Planting Record'}
            </Text>
            <TouchableOpacity onPress={handleSaveRecord}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Plot Dropdown */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Plot *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setDropdownVisible(true)}
              >
                <Text style={[styles.dropdownText, !selectedPlot && styles.placeholderText]}>
                  {selectedPlot ? selectedPlot.name : 'Choose a plot'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Plot Area */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Plot Area (ha) *</Text>
              <TextInput
                style={styles.input}
                value={plotArea}
                onChangeText={setPlotArea}
                placeholder="Enter plot area"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                editable={!!selectedPlot}
              />
            </View>

            {/* Cinnamon Variety */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cinnamon Variety *</Text>
              <TextInput
                style={styles.input}
                value={variety}
                onChangeText={setVariety}
                placeholder="e.g., Ceylon Cinnamon (Alba)"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Seedling Count */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Seedling Count *</Text>
              <TextInput
                style={styles.input}
                value={seedlingCount}
                onChangeText={setSeedlingCount}
                placeholder="Enter number of seedlings"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
            </View>

            {/* Planted Date */}
            <DatePicker
              label="Planted Date *"
              value={plantedDate}
              onChange={setPlantedDate}
              placeholder="Select planting date"
              maximumDate={new Date()} // Can't plant in the future
              style={styles.formGroup}
            />

            <Text style={styles.requiredNote}>* Required fields</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Plot Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>Select Plot</Text>
            <FlatList
              data={plots.map(plot => ({ id: plot.id, name: plot.name, area: plot.area }))}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handlePlotSelect(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                  <Text style={styles.dropdownItemSubtext}>{item.area} ha</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordsSection: {
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  recordsList: {
    flex: 1,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  plotNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plotName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  localOnlyBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  localOnlyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  recordDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  noRecordsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noRecordsText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  noRecordsSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  addRecordButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addRecordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  requiredNote: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    maxHeight: 300,
    minWidth: 250,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  dropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default MyPlantingRecords;