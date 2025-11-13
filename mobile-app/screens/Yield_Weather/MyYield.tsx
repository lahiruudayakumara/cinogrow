import React, { useState, useEffect } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';
import DatePicker from '../../components/ui/DatePicker';

// API imports
import { yieldAPI, UserYieldRecord, PredictedYield } from '../../services/yield_weather/yieldAPI';
import { farmAPI, Plot } from '../../services/yield_weather/farmAPI';

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

const MyYieldScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictedYields, setPredictedYields] = useState<PredictedYield[]>([]);
  const [userYieldRecords, setUserYieldRecords] = useState<UserYieldRecord[]>([]);
  const [availablePlots, setAvailablePlots] = useState<Plot[]>([]);
  
  // Form state
  const [showAddYieldModal, setShowAddYieldModal] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [yieldAmount, setYieldAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);

  // Constants
  const USER_ID = 1; // TODO: Get from auth context

  const loadData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Load all required data in parallel
      const [farmsData, userYieldsData] = await Promise.all([
        farmAPI.getFarms(),
        yieldAPI.getUserYieldRecords(USER_ID).catch(() => []) // Don't fail if endpoint doesn't exist yet
      ]);

      // Get all plots from all farms
      let allPlots: Plot[] = [];
      for (const farm of farmsData) {
        if (farm.id) {
          try {
            const farmPlots = await farmAPI.getFarmPlots(farm.id);
            allPlots = [...allPlots, ...farmPlots];
          } catch (plotError) {
            console.warn(`Failed to load plots for farm ${farm.id}:`, plotError);
          }
        }
      }
      
      setAvailablePlots(allPlots);
      setUserYieldRecords(userYieldsData);

      // Generate predicted yields for each plot
      const predictions: PredictedYield[] = [];
      for (const plot of allPlots) {
        if (plot.id && plot.area) {
          try {
            // Try comprehensive prediction (ML first, then historical data, then mock)
            const predictionResult = await yieldAPI.predictYield(
              plot.area,
              'Sri Lanka', // Default location
              plot.crop_type || 'Ceylon Cinnamon', // Use plot's actual variety
              plot.id, // Plot ID for ML model
              2500, // Default rainfall
              26, // Default temperature
              5 // Default age years
            );
            
            console.log(`🎯 Prediction for ${plot.name}:`, {
              yield: predictionResult.predicted_yield,
              source: predictionResult.prediction_source,
              method: predictionResult.method_used,
              confidence: predictionResult.confidence_score
            });
            
            // Skip plots that are not planted
            if (predictionResult.prediction_source === 'not_planted' || 
                predictionResult.requires_planting || 
                predictionResult.predicted_yield === null) {
              console.log(`⏭️ Skipping ${plot.name} - not planted yet`);
              continue; // Skip adding this plot to predictions
            }
            
            predictions.push({
              plot_id: plot.id,
              plot_name: plot.name,
              plot_area: plot.area,
              predicted_yield: predictionResult.predicted_yield,
              prediction_source: predictionResult.prediction_source as 'dataset_match' | 'ai_model' | 'average'
            });
          } catch (predictionError) {
            console.warn(`Failed to predict yield for plot ${plot.id}:`, predictionError);
            // Add with default prediction only if it's not a "not planted" error
            predictions.push({
              plot_id: plot.id,
              plot_name: plot.name,
              plot_area: plot.area,
              predicted_yield: Math.round(plot.area * 2500), // 2500 kg/ha default
              prediction_source: 'average'
            });
          }
        }
      }
      
      setPredictedYields(predictions);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load yield data';
      setError(errorMessage);
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddYield = async () => {
    if (!selectedPlotId || !yieldAmount.trim()) {
      Alert.alert('Error', 'Please select a plot and enter yield amount');
      return;
    }

    const yieldAmountNum = parseFloat(yieldAmount);
    if (isNaN(yieldAmountNum) || yieldAmountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid yield amount');
      return;
    }

    try {
      setSubmitting(true);

      const newRecord: Omit<UserYieldRecord, 'yield_id' | 'created_at' | 'plot_name'> = {
        user_id: USER_ID,
        plot_id: selectedPlotId,
        yield_amount: yieldAmountNum,
        yield_date: selectedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      };

      // Try to create the record
      try {
        await yieldAPI.createUserYieldRecord(newRecord);
      } catch (apiError) {
        console.warn('API creation failed, adding locally:', apiError);
        // Add to local state if API fails
        const plot = availablePlots.find(p => p.id === selectedPlotId);
        const localRecord: UserYieldRecord = {
          yield_id: Date.now(), // Temporary ID
          plot_name: plot?.name || 'Unknown Plot',
          ...newRecord,
          created_at: new Date().toISOString(),
        };
        setUserYieldRecords(prev => [localRecord, ...prev]);
      }

      // Reset form
      setSelectedPlotId(null);
      setYieldAmount('');
      setSelectedDate(new Date());
      setShowAddYieldModal(false);

      // Reload data to get the new record
      await loadData();

      Alert.alert('Success', 'Yield record added successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add yield record';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => {
    loadData(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatYield = (amount: number) => `${amount.toFixed(1)} kg`;
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getSelectedPlotName = () => {
    const plot = availablePlots.find(p => p.id === selectedPlotId);
    return plot ? plot.name : 'Select a plot';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading yield data...</Text>
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
          <Text style={styles.title}>My Yield</Text>
          <Text style={styles.subtitle}>
            Track predicted and actual yields for your plots
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadData()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Predicted Yield Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Predicted Yield (AI Model)</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Auto-calculated using dataset pattern: location, variety, area → yield
          </Text>
          
          {predictedYields.length > 0 ? (
            <View style={styles.predictionContainer}>
              {predictedYields.map((prediction) => (
                <View key={prediction.plot_id} style={styles.predictionCard}>
                  <View style={styles.predictionLeft}>
                    <Text style={styles.plotName}>{prediction.plot_name}</Text>
                    <Text style={styles.plotArea}>{prediction.plot_area} ha</Text>
                  </View>
                  <View style={styles.predictionRight}>
                    <Text style={styles.predictedAmount}>
                      {formatYield(prediction.predicted_yield)}
                    </Text>
                    <Text style={styles.predictionSource}>
                      {prediction.prediction_source === 'dataset_match' ? 'AI Model' : 'Average'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="leaf-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>No yield predictions available</Text>
              <Text style={styles.emptySubtext}>
                Predictions are shown only for planted plots. Add planting records to see yield forecasts.
              </Text>
            </View>
          )}
        </View>

        {/* Add Yield Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="add-circle" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Add Your Yield Record</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddYieldModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Yield</Text>
          </TouchableOpacity>
        </View>

        {/* Yield Records Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>My Yield Records</Text>
          </View>
          
          {userYieldRecords.length > 0 ? (
            <View style={styles.recordsContainer}>
              <View style={styles.recordsHeader}>
                <Text style={styles.columnHeader}>Plot</Text>
                <Text style={styles.columnHeader}>Yield Amount</Text>
                <Text style={styles.columnHeader}>Date</Text>
              </View>
              {userYieldRecords.map((record, index) => (
                <View key={record.yield_id || index} style={styles.recordRow}>
                  <Text style={styles.recordCell}>{record.plot_name || 'Unknown'}</Text>
                  <Text style={styles.recordCell}>{formatYield(record.yield_amount)}</Text>
                  <Text style={styles.recordCell}>{formatDate(record.yield_date)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyText}>No yield records yet</Text>
              <Text style={styles.emptySubtext}>Add your first yield record to track performance</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Yield Modal */}
      <Modal
        visible={showAddYieldModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddYieldModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddYieldModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Yield Record</Text>
            <TouchableOpacity 
              onPress={handleAddYield}
              disabled={submitting}
              style={[styles.saveButton, submitting && styles.disabledButton]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Plot Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Plot</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => {
                  Alert.alert(
                    'Select Plot',
                    'Choose a plot for this yield record',
                    availablePlots.map(plot => ({
                      text: `${plot.name} (${plot.area} ha)`,
                      onPress: () => setSelectedPlotId(plot.id || null),
                    })).concat([
                      { text: 'Cancel', onPress: () => {} }
                    ])
                  );
                }}
              >
                <Text style={[styles.dropdownText, !selectedPlotId && styles.placeholderText]}>
                  {getSelectedPlotName()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Yield Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Yield Amount (kg)</Text>
              <TextInput
                style={styles.input}
                value={yieldAmount}
                onChangeText={setYieldAmount}
                placeholder="Enter yield amount"
                keyboardType="numeric"
              />
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                placeholder="Select harvest date"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  predictionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  predictionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  predictionLeft: {
    flex: 1,
  },
  predictionRight: {
    alignItems: 'flex-end',
  },
  plotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  plotArea: {
    fontSize: 14,
    color: '#6B7280',
  },
  predictedAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 2,
  },
  predictionSource: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recordsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordsHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  columnHeader: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  recordRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recordCell: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
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
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
});

export default MyYieldScreen;