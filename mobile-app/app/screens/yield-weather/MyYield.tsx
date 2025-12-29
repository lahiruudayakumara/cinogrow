import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../../navigation/YieldWeatherNavigator';
import DatePicker from '../../../components/ui/DatePicker';

// API imports
import { yieldAPI, UserYieldRecord } from '../../../services/yield_weather/yieldAPI';
import { farmAPI, Farm, Plot } from '../../../services/yield_weather/farmAPI';

// Extended Plot interface with farm context
interface PlotWithFarmInfo extends Plot {
  farm_name?: string;
  farm_location?: string;
}

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

const MyYieldScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userYieldRecords, setUserYieldRecords] = useState<UserYieldRecord[]>([]);
  const [availablePlots, setAvailablePlots] = useState<PlotWithFarmInfo[]>([]);
  const [availableFarms, setAvailableFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  
  // Form state
  const [showAddYieldModal, setShowAddYieldModal] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [yieldAmount, setYieldAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);

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

      // Get selected farm ID from AsyncStorage
      const savedFarmId = await AsyncStorage.getItem('selectedFarmId');
      let targetFarmId = selectedFarmId;
      
      if (savedFarmId) {
        targetFarmId = parseInt(savedFarmId);
        if (targetFarmId !== selectedFarmId) {
          setSelectedFarmId(targetFarmId);
        }
      }

      // Load all required data in parallel
      const [farmsData, userYieldsData] = await Promise.all([
        farmAPI.getFarms(),
        yieldAPI.getUserYieldRecords(USER_ID).catch(() => []) // Don't fail if endpoint doesn't exist yet
      ]);

      setAvailableFarms(farmsData);

      // Process plots with farm information
      const allPlotsWithFarmInfo: PlotWithFarmInfo[] = [];
      
      for (const farm of farmsData) {
        if (farm.id) {
          const plots = await farmAPI.getFarmPlots(farm.id);
          const plotsWithFarmInfo: PlotWithFarmInfo[] = plots.map(plot => ({
            ...plot,
            farm_name: farm.name,
            farm_location: farm.location,
          }));
          allPlotsWithFarmInfo.push(...plotsWithFarmInfo);
        }
      }

      setAvailablePlots(allPlotsWithFarmInfo);
      setUserYieldRecords(userYieldsData);

      console.log('✅ Loaded data:', { 
        farms: farmsData.length, 
        plots: allPlotsWithFarmInfo.length,
        records: userYieldsData.length
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddYield = async () => {
    if (!selectedPlotId || !yieldAmount.trim()) {
      Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_yield.errors.select_plot_farm'));
      return;
    }

    const yieldAmountNum = parseFloat(yieldAmount);
    if (isNaN(yieldAmountNum) || yieldAmountNum <= 0) {
      Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_yield.errors.invalid_amount'));
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

      Alert.alert(t('yield_weather.common.success'), t('yield_weather.my_yield.success.yield_added'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('yield_weather.my_yield.errors.save_failed');
      Alert.alert(t('yield_weather.common.error'), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedPlotName = (): string => {
    if (!selectedPlotId) return t('yield_weather.my_yield.select_plot');
    const plot = availablePlots.find(p => p.id === selectedPlotId);
    return plot ? plot.name : t('yield_weather.my_yield.select_plot');
  };

  // Load data on component mount and when screen comes into focus
  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData(true);
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t('yield_weather.common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="warning" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
            <Text style={styles.retryButtonText}>{t('yield_weather.common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
      >
        {/* Actual Yield Records Title & Subtitle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="document-text" size={24} color="#4CAF50" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>{t('yield_weather.my_yield.actual_records_title')}</Text>
            <Text style={styles.cardSubtitle}>{t('yield_weather.my_yield.actual_records_subtitle')}</Text>
          </View>
        </View>
        {/* Add Record Button OUTSIDE the card */}
        <TouchableOpacity 
          style={styles.addRecordButtonCard}
          onPress={() => setShowAddYieldModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.addRecordButtonText}>{t('yield_weather.my_yield.add_record')}</Text>
        </TouchableOpacity>

        {/* Actual Yield Records Card */}
        <View style={styles.card}>
          {/* New Title: Your Recent Yield Record */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
            {t('yield_weather.my_yield.recent_record_title', 'Your Recent Yield Records')}
          </Text>

          {userYieldRecords && userYieldRecords.length > 0 ? (
            <View style={styles.recordsList}>
              {userYieldRecords
                .sort((a, b) => {
                  const dateA = new Date(a.yield_date || 0);
                  const dateB = new Date(b.yield_date || 0);
                  return dateB.getTime() - dateA.getTime(); // Most recent first
                })
                .slice(0, showAllRecords ? userYieldRecords.length : 5)
                .map((record, index) => {
                const plot = availablePlots.find(p => p.id === record.plot_id);
                const recordDate = record.yield_date ? new Date(record.yield_date) : new Date();
                const isValidDate = !isNaN(recordDate.getTime());
                
                return (
                  <View key={record.yield_id || index} style={styles.recordItem}>
                    <View style={styles.recordHeader}>
                      <Text style={styles.recordPlotName}>{plot?.name || `Plot ${record.plot_id}`}</Text>
                      <Text style={styles.recordDate}>
                        {isValidDate ? recordDate.toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.recordDetails}>
                      <View style={styles.recordDetailItem}>
                        <Ionicons name="leaf" size={16} color="#4CAF50" />
                        <Text style={styles.recordDetailText}>
                          {record.yield_amount} {t('yield_weather.my_yield.kg_suffix')}
                        </Text>
                      </View>
                      {plot && (
                        <View style={styles.recordDetailItem}>
                          <Ionicons name="resize" size={16} color="#6B7280" />
                          <Text style={styles.recordDetailText}>
                            {plot.area} {t('yield_weather.my_yield.ha_suffix')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
              
              {userYieldRecords.length > 5 && (
                <TouchableOpacity 
                  style={styles.viewAllLink}
                  onPress={() => setShowAllRecords(!showAllRecords)}
                >
                  <Text style={styles.viewAllLinkText}>
                    {showAllRecords 
                      ? t('yield_weather.my_yield.show_less')
                      : `${t('yield_weather.my_yield.view_all_records')} (${userYieldRecords.length})`
                    }
                  </Text>
                  <Ionicons 
                    name={showAllRecords ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#4CAF50" 
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>{t('yield_weather.my_yield.no_records_yet')}</Text>
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
              <Text style={styles.cancelButton}>{t('yield_weather.my_yield.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('yield_weather.my_yield.add_yield_record')}</Text>
            <TouchableOpacity 
              onPress={handleAddYield}
              disabled={submitting}
              style={[styles.saveButton, submitting && styles.disabledButton]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>{t('yield_weather.my_yield.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Plot Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('yield_weather.my_yield.select_plot')}</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => {
                  Alert.alert(
                    t('yield_weather.my_yield.select_plot'),
                    t('yield_weather.my_yield.select_plot_for_record'),
                    availablePlots.map(plot => ({
                      text: `${plot.name} (${plot.area} ${t('yield_weather.my_yield.ha_suffix')})`,
                      onPress: () => setSelectedPlotId(plot.id || null),
                    })).concat([
                      { text: t('yield_weather.my_yield.cancel'), onPress: () => {} }
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
              <Text style={styles.label}>{t('yield_weather.my_yield.yield_amount')}</Text>
              <TextInput
                style={styles.input}
                value={yieldAmount}
                onChangeText={setYieldAmount}
                placeholder={t('yield_weather.my_yield.enter_yield_amount')}
                keyboardType="numeric"
              />
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                placeholder={t('yield_weather.my_yield.select_harvest_date')}
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
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addRecordButtonCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addRecordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordsList: {
    gap: 12,
  },
  recordItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordPlotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  recordDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  recordDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  recordDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordDetailText: {
    fontSize: 14,
    color: '#374151',
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewAllLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalContent: {
    padding: 20,
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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
});

export default MyYieldScreen;
