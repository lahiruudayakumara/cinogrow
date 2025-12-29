import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../../navigation/YieldWeatherNavigator';
import { farmAPI, type Farm, type Plot, type Activity } from '../../../services/yield_weather/farmAPI';
import { plantingRecordsAPI, type PlantingRecord } from '../../../services/yield_weather/plantingRecordsAPI';
import { PlotManagementModal } from '../../../components/PlotManagementModal';
import { DEFAULT_CINNAMON_VARIETY, CINNAMON_VARIETY_VALUES } from '../../../constants/CinnamonVarieties';

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

const MyFarm = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [availableFarms, setAvailableFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [plantingRecords, setPlantingRecords] = useState<PlantingRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [plotManagementVisible, setPlotManagementVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [farmName, setFarmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [farmArea, setFarmArea] = useState('');
  const [numPlots, setNumPlots] = useState('');

  // Mock user ID - in a real app, this would come from authentication
  const USER_ID = 1;

  // Load farm data
  const loadFarmData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Add timeout wrapper for the entire operation
      const operationTimeout = new Promise<void>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Operation timeout after 30 seconds'));
        }, 30000);
        
        // Clear timeout if operation completes normally
        return timeoutId;
      });

      await Promise.race([
        (async () => {
          console.log('🚀 Starting loadFarmData operation...');
          
          // Check if backend is available with simpler error handling
          let isBackendAvailable = false;
          try {
            isBackendAvailable = await farmAPI.testConnection();
            console.log('🔗 Backend availability:', isBackendAvailable);
          } catch (connectionError) {
            console.warn('⚠️ Connection test failed:', connectionError);
            isBackendAvailable = false;
          }
          
          if (isBackendAvailable) {
            try {
              // Use real API
              console.log('📡 Fetching farms from API...');
              const farms = await farmAPI.getFarms();
              console.log('📊 Received farms:', farms);
              setAvailableFarms(farms);
              
              if (farms && farms.length > 0) {
                // Set selected farm if none is selected or if current selection is not available
                let farmToSelect = farms[0]; // Default to first farm
                if (selectedFarmId) {
                  const existingFarm = farms.find(f => f.id === selectedFarmId);
                  if (existingFarm) {
                    farmToSelect = existingFarm;
                  }
                }
                
                setSelectedFarmId(farmToSelect.id!);
                // Store selected farm ID in AsyncStorage for other screens to access
                await AsyncStorage.setItem('selectedFarmId', farmToSelect.id!.toString());
                
                setFarm(farmToSelect);
                setFarmName(farmToSelect.name);
                setOwnerName(farmToSelect.owner_name);
                setFarmLocation(farmToSelect.location);
                setFarmArea(farmToSelect.total_area.toString());
                setIsEditing(true);

                // Load plots and activities for selected farm
                console.log('📍 Loading plots and activities...');
                await loadPlotsAndActivities(farmToSelect.id!);
                console.log('✅ Farm data loaded successfully');
              } else {
                // No farm found, show empty form
                console.log('ℹ️ No farms found, showing empty form');
                setIsEditing(false);
                clearForm();
              }
            } catch (apiError) {
              console.error('❌ API error:', apiError);
              throw apiError;
            }
          } else {
            // Backend not available - show error
            throw new Error('Backend not available - connection test failed');
          }
        })(),
        operationTimeout
      ]);
    } catch (error) {
      console.error('❌ Error loading farm data:', error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('undefined is not a function')) {
          Alert.alert(
            'Connection Issue',
            'Unable to connect to the server. Please check if the backend is running and try again.',
            [{ text: t('yield_weather.common.ok') }]
          );
        } else {
          Alert.alert(t('yield_weather.common.error'), `Failed to load farm data: ${error.message}`);
        }
      } else {
        Alert.alert(t('yield_weather.common.error'), 'An unexpected error occurred while loading farm data.');
      }
      
      // Clear state on error
      setFarm(null);
      setPlots([]);
      setActivities([]);
      clearForm();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPlotsAndActivities = async (farmId: number) => {
    try {
      // Add timeout wrapper
      const operationTimeout = new Promise<void>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Plot operation timeout after 25 seconds'));
        }, 25000);
        
        return timeoutId;
      });

      await Promise.race([
        (async () => {
          console.log('🌱 Starting loadPlotsAndActivities operation...');
          
          // Check if backend is available with simpler error handling
          let isBackendAvailable = false;
          try {
            isBackendAvailable = await farmAPI.testConnection();
            console.log('🔗 Backend availability for plots:', isBackendAvailable);
          } catch (connectionError) {
            console.warn('⚠️ Connection test failed in loadPlotsAndActivities:', connectionError);
            isBackendAvailable = false;
          }
          
          if (isBackendAvailable) {
            try {
              // Load real data from API
              console.log('📊 Fetching plots from API...');
              const plotsData = await farmAPI.getFarmPlots(farmId);
              console.log('📍 Received plots:', plotsData);
              setPlots(plotsData);
              setNumPlots(plotsData.length.toString());

              // Load planting records for this farm
              try {
                console.log('🌱 Fetching planting records for farm:', farmId);
                const plantingRecordsData = await plantingRecordsAPI.getFarmPlantingRecords(farmId);
                console.log('📋 Received planting records:', plantingRecordsData);
                setPlantingRecords(plantingRecordsData);
              } catch (plantingError) {
                console.warn('⚠️ Could not load planting records:', plantingError);
                setPlantingRecords([]);
              }

              // For now, set empty activities since we don't have activity endpoints yet
              setActivities([]);
              console.log('✅ Plots and activities loaded successfully');
            } catch (apiError) {
              console.error('❌ API error in loadPlotsAndActivities:', apiError);
              throw apiError;
            }
          } else {
            // Backend not available
            throw new Error('Backend not available for plots operation');
          }
        })(),
        operationTimeout
      ]);
    } catch (error) {
      console.error('❌ Error loading plots and activities:', error);
      
      // Clear data on error
      setPlots([]);
      setActivities([]);
      setPlantingRecords([]);
      setNumPlots('0');
      
      // Don't show error alert here since parent function will handle it
    }
  };

  // Calculate plot status based on planting date
  const calculatePlotStatus = (plantingDate: string) => {
    const planted = new Date(plantingDate);
    const now = new Date();
    const monthsDiff = (now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24 * 30.44); // Average month length
    const yearsDiff = monthsDiff / 12;

    if (monthsDiff < 1) {
      return { status: 'PLANTED' as const, progress: 5 };
    } else if (monthsDiff < 12) {
      return { status: 'GROWING' as const, progress: Math.min(20 + (monthsDiff * 5), 60) };
    } else if (yearsDiff < 3) {
      return { status: 'GROWING' as const, progress: Math.min(60 + ((yearsDiff - 1) * 20), 85) };
    } else if (yearsDiff < 3.5) {
      return { status: 'MATURE' as const, progress: Math.min(85 + ((yearsDiff - 3) * 30), 95) };
    } else {
      return { status: 'HARVESTING' as const, progress: 100 };
    }
  };

  // Helper function to get planting information for a plot
  const getPlotPlantingInfo = (plotId: number) => {
    const plantingRecord = plantingRecords.find(record => record.plot_id === plotId);
    if (plantingRecord) {
      return {
        isPlanted: true,
        variety: plantingRecord.cinnamon_variety,
        plantedDate: plantingRecord.planted_date,
        seedlingCount: plantingRecord.seedling_count,
        daysOld: Math.floor((new Date().getTime() - new Date(plantingRecord.planted_date).getTime()) / (1000 * 60 * 60 * 24))
      };
    }
    return {
      isPlanted: false,
      variety: null,
      plantedDate: null,
      seedlingCount: 0,
      daysOld: 0
    };
  };

  // Helper function to get status display based on plot status and planting info
  const getPlotStatusDisplay = (plot: Plot, plantingInfo: any) => {
    if (!plantingInfo.isPlanted) {
      return {
        status: t('yield_weather.my_farm.plot_status.not_planted'),
        color: '#94A3B8',
        bgColor: '#F1F5F9'
      };
    }

    // Calculate the actual status based on planting age
    const calculatedStatus = calculatePlotStatus(plantingInfo.plantedDate);
    const status = calculatedStatus.status;

    // Return appropriate display based on calculated status
    switch (status) {
      case 'PLANTED':
        return {
          status: t('yield_weather.my_farm.plot_status.planted'),
          color: '#059669',
          bgColor: '#ECFDF5'
        };
      case 'GROWING':
        return {
          status: t('yield_weather.my_farm.plot_status.growing'),
          color: '#0EA5E9',
          bgColor: '#F0F9FF'
        };
      case 'MATURE':
        return {
          status: t('yield_weather.my_farm.plot_status.mature'),
          color: '#7C3AED',
          bgColor: '#FAF5FF'
        };
      case 'HARVESTING':
        return {
          status: t('yield_weather.my_farm.plot_status.harvesting'),
          color: '#F59E0B',
          bgColor: '#FFFBEB'
        };
      default:
        return {
          status: 'PREPARING',
          color: '#EF4444',
          bgColor: '#FEF2F2'
        };
    }
  };

  const clearForm = () => {
    setFarmName('');
    setOwnerName('');
    setFarmLocation('');
    setFarmArea('');
    setNumPlots('1');
    setPlantingRecords([]);
  };

  // Get selected farm name for dropdown display
  const getSelectedFarmName = () => {
    if (!selectedFarmId) return 'Select Farm';
    const selectedFarm = availableFarms.find(farm => farm.id === selectedFarmId);
    return selectedFarm ? selectedFarm.name : 'Select Farm';
  };

  // Handle farm selection change
  const handleFarmChange = async (farmId: number) => {
    try {
      setSelectedFarmId(farmId);
      const selectedFarm = availableFarms.find(farm => farm.id === farmId);
      
      // Store selected farm ID in AsyncStorage for other screens to access
      await AsyncStorage.setItem('selectedFarmId', farmId.toString());
      
      if (selectedFarm) {
        setFarm(selectedFarm);
        setFarmName(selectedFarm.name);
        setOwnerName(selectedFarm.owner_name);
        setFarmLocation(selectedFarm.location);
        setFarmArea(selectedFarm.total_area.toString());
        setIsEditing(true);
        
        // Load plots and activities for selected farm
        await loadPlotsAndActivities(farmId);
      }
    } catch (error) {
      console.error('❌ Error changing farm:', error);
      Alert.alert('Error', 'Failed to load farm data. Please try again.');
    }
  };

  const generatePlots = (farmId: number, numberOfPlots: number, totalArea: number): Plot[] => {
    const plots: Plot[] = [];
    const plotNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    const statuses: Array<'PLANTED' | 'GROWING' | 'MATURE'> = ['PLANTED', 'GROWING', 'MATURE'];
    
    // Calculate area distribution: equal for all except last plot gets remaining area
    let remainingArea = totalArea;
    const standardPlotArea = numberOfPlots > 1 ? Math.floor((totalArea / numberOfPlots) * 10) / 10 : totalArea;
    
    for (let i = 0; i < numberOfPlots; i++) {
      const plotName = plotNames[i] || `${Math.floor(i / 20) + 1}${plotNames[i % 20]}`;
      
      // For the last plot, assign the exact remaining area; for others, use standard area
      let plotArea: number;
      if (i === numberOfPlots - 1) {
        // Last plot gets exactly the remaining area
        plotArea = parseFloat(remainingArea.toFixed(1));
      } else {
        // Other plots get the standard area
        plotArea = standardPlotArea;
        remainingArea -= plotArea;
      }
      
      plots.push({
        id: Date.now() + i,
        farm_id: farmId,
        name: `Plot ${plotName}`,
        area: plotArea,
        status: statuses[i % statuses.length],
        crop_type: CINNAMON_VARIETY_VALUES[i % CINNAMON_VARIETY_VALUES.length],
        planting_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        age_months: Math.floor(Math.random() * 36) + 1,
        progress_percentage: Math.floor(Math.random() * 100),
      });
    }
    
    return plots;
  };

  const handlePlotsChange = async (farmData: Farm, plotsValue: number, areaValue: number) => {
    if (isEditing && plots.length > 0 && plotsValue !== plots.length) {
      Alert.alert(
        'Update Plots',
        `This will change the number of plots from ${plots.length} to ${plotsValue} and regenerate all plot data. Continue?`,
        [
          { 
            text: t('yield_weather.common.cancel'), 
            style: 'cancel', 
            onPress: async () => {
              // If user cancels, we need to revert the farm's num_plots back to the original value
              try {
                const isBackendAvailable = await farmAPI.testConnection();
                if (isBackendAvailable && farmData.id) {
                  const revertData = { ...farmData, num_plots: plots.length };
                  await farmAPI.updateFarm(farmData.id, revertData);
                }
                setLoading(false);
                setEditModalVisible(false);
              } catch (error) {
                console.error('Error reverting farm data:', error);
                setLoading(false);
                setEditModalVisible(false);
              }
            }
          },
          {
            text: t('yield_weather.common.continue'),
            onPress: async () => {
              try {
                const isBackendAvailable = await farmAPI.testConnection();
                
                if (isBackendAvailable) {
                  // Delete existing plots and create new ones
                  await farmAPI.deleteAllFarmPlots(farmData.id!);
                  
                  // Create new plots via API
                  const plotsData = generatePlotsData(plotsValue, areaValue);
                  const newPlots = await farmAPI.createMultiplePlots(farmData.id!, plotsData);
                  setPlots(newPlots);
                } else {
                  // Use local generation for offline mode
                  const newPlots = generatePlots(farmData.id!, plotsValue, areaValue);
                  setPlots(newPlots);
                }
                
                setFarm(farmData);
                setEditModalVisible(false);
                setLoading(false);
                Alert.alert(t('yield_weather.common.success'), t('yield_weather.my_farm.success.farm_updated'));
              } catch (error) {
                console.error('Error updating plots:', error);
                setLoading(false);
                Alert.alert(t('yield_weather.common.error'), 'Failed to update plots');
              }
            }
          }
        ]
      );
    } else {
      // No confirmation needed for new farms or when plot count hasn't changed
      try {
        const isBackendAvailable = await farmAPI.testConnection();
        
        if (plotsValue !== plots.length) {
          if (isBackendAvailable) {
            // Delete existing plots first, then create new ones
            await farmAPI.deleteAllFarmPlots(farmData.id!);
            const plotsData = generatePlotsData(plotsValue, areaValue);
            const newPlots = await farmAPI.createMultiplePlots(farmData.id!, plotsData);
            setPlots(newPlots);
          } else {
            const newPlots = generatePlots(farmData.id!, plotsValue, areaValue);
            setPlots(newPlots);
          }
        } else if (areaValue !== farm?.total_area && plots.length > 0) {
          // If only area changed, update existing plots' areas
          if (isBackendAvailable) {
            // Update each plot's area in the backend
            const updatedPlots = [];
            for (const plot of plots) {
              const updatedPlot = await farmAPI.updatePlot(plot.id!, {
                area: parseFloat((areaValue / plots.length).toFixed(1))
              });
              updatedPlots.push(updatedPlot);
            }
            setPlots(updatedPlots);
          } else {
            // Update locally for offline mode
            const updatedPlots = plots.map(plot => ({
              ...plot,
              area: parseFloat((areaValue / plots.length).toFixed(1))
            }));
            setPlots(updatedPlots);
          }
        }
        
        setFarm(farmData);
        setEditModalVisible(false);
        setLoading(false);
        Alert.alert(t('yield_weather.common.success'), isEditing ? t('yield_weather.my_farm.success.farm_updated') : t('yield_weather.my_farm.success.farm_created'));
      } catch (error) {
        console.error('Error handling plots change:', error);
        setLoading(false);
        Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_farm.errors.save_failed'));
      }
    }
  };

  const generatePlotsData = (numberOfPlots: number, totalArea: number) => {
    const plotNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    
    // Calculate area distribution: equal for all except last plot gets remaining area
    let remainingArea = totalArea;
    const standardPlotArea = numberOfPlots > 1 ? Math.floor((totalArea / numberOfPlots) * 10) / 10 : totalArea;
    
    return Array.from({ length: numberOfPlots }, (_, i) => {
      const plotName = plotNames[i] || `${Math.floor(i / 20) + 1}${plotNames[i % 20]}`;
      
      // For the last plot, assign the exact remaining area; for others, use standard area
      let plotArea: number;
      if (i === numberOfPlots - 1) {
        // Last plot gets exactly the remaining area
        plotArea = parseFloat(remainingArea.toFixed(1));
      } else {
        // Other plots get the standard area
        plotArea = standardPlotArea;
        remainingArea -= plotArea;
      }
      
      return {
        name: `Plot ${plotName}`,
        area: plotArea,
        crop_type: CINNAMON_VARIETY_VALUES[i % CINNAMON_VARIETY_VALUES.length],
      };
    });
  };

  const handleSaveFarm = async () => {
    try {
      // Validate form
      if (!farmName.trim() || !ownerName.trim() || !farmLocation.trim() || !farmArea.trim() || !numPlots.trim()) {
        Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_farm.errors.fill_required'));
        return;
      }

      const areaValue = parseFloat(farmArea);
      if (isNaN(areaValue) || areaValue <= 0) {
        Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_farm.errors.invalid_area'));
        return;
      }

      const plotsValue = parseInt(numPlots);
      if (isNaN(plotsValue) || plotsValue <= 0 || plotsValue > 50) {
        Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_farm.errors.invalid_plots'));
        return;
      }

      // Validate that each plot will have a reasonable area
      const areaPerPlot = areaValue / plotsValue;
      if (areaPerPlot < 0.1) {
        Alert.alert(t('yield_weather.common.error'), 'Too many plots for the farm area. Each plot would be less than 0.1 hectares.');
        return;
      }

      setLoading(true);

      const farmData: Farm = {
        name: farmName.trim(),
        owner_name: ownerName.trim(),
        total_area: areaValue,
        num_plots: plotsValue,
        location: farmLocation.trim(),
        latitude: 7.2906, // Default coordinates - in real app, get from location service
        longitude: 80.6337,
      };

      const isBackendAvailable = await farmAPI.testConnection();
      
      if (isEditing && farm?.id) {
        // Update existing farm
        if (isBackendAvailable) {
          const updatedFarm = await farmAPI.updateFarm(farm.id, farmData);
          farmData.id = updatedFarm.id;
        } else {
          farmData.id = farm.id;
        }
        
        // Handle plots update with confirmation if needed
        await handlePlotsChange(farmData, plotsValue, areaValue);
      } else {
        // Create new farm
        if (isBackendAvailable) {
          const createdFarm = await farmAPI.createFarm(farmData);
          farmData.id = createdFarm.id;
          
          // Create initial plots via API
          const plotsData = generatePlotsData(plotsValue, areaValue);
          const initialPlots = await farmAPI.createMultiplePlots(createdFarm.id!, plotsData);
          setPlots(initialPlots);
        } else {
          // Offline mode
          farmData.id = Date.now(); // Simple ID generation for mock
          const initialPlots = generatePlots(farmData.id, plotsValue, areaValue);
          setPlots(initialPlots);
        }
        
        setIsEditing(true);
        setFarm(farmData);
        setEditModalVisible(false);
        setLoading(false);
        Alert.alert('Success', 'Farm created successfully');
      }
    } catch (error) {
      console.error('Error saving farm:', error);
      Alert.alert('Error', 'Failed to save farm details');
      setLoading(false);
    }
  };

  const handleDeleteFarm = () => {
    Alert.alert(
      'Delete Farm',
      'Are you sure you want to delete this farm? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const isBackendAvailable = await farmAPI.testConnection();
              
              if (isBackendAvailable && farm?.id) {
                // Delete from backend
                await farmAPI.deleteFarm(farm.id);
              }
              
              // Clear local state
              setFarm(null);
              setPlots([]);
              setActivities([]);
              setIsEditing(false);
              clearForm();
              Alert.alert(t('yield_weather.common.success'), 'Farm deleted successfully');
            } catch (error) {
              console.error('Error deleting farm:', error);
              Alert.alert(t('yield_weather.common.error'), 'Failed to delete farm');
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
    loadFarmData(true);
  };

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadFarmData();
    }, [])
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t('yield_weather.common.loading')}</Text>
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
          <Text style={styles.title}>{t('yield_weather.my_farm.title')}</Text>
          {farm && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setNumPlots(plots.length.toString());
                setEditModalVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>

        {/* Farm Selection Dropdown */}
        {availableFarms.length > 1 && (
          <View style={styles.farmSelectionCard}>
            <View style={styles.farmSelectionHeader}>
              <Ionicons name="business" size={20} color="#4CAF50" />
              <Text style={styles.farmSelectionTitle}>Select Farm</Text>
            </View>
            <TouchableOpacity 
              style={styles.farmDropdown}
              onPress={() => {
                if (availableFarms.length === 0) {
                  Alert.alert('No Farms Available', 'No farms found. Please create a farm first.');
                  return;
                }
                
                Alert.alert(
                  'Select Farm',
                  'Choose a farm to view and manage:',
                  availableFarms.map(farm => ({
                    text: `${farm.name} (${farm.num_plots} plots, ${farm.total_area} ha)`,
                    onPress: () => handleFarmChange(farm.id!),
                  })).concat([
                    { text: 'Cancel', onPress: async () => {} }
                  ])
                );
              }}
            >
              <Text style={styles.farmDropdownText}>
                {getSelectedFarmName()}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {selectedFarmId && (
              <View style={styles.farmSummary}>
                <Text style={styles.farmSummaryText}>
                  📍 {availableFarms.find(f => f.id === selectedFarmId)?.location} • 
                  📊 {plots.length} plots • 
                  📏 {availableFarms.find(f => f.id === selectedFarmId)?.total_area} ha
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Farm Details Card */}
        <View style={styles.farmCard}>
          {farm ? (
            <>
              <View style={styles.farmHeader}>
                <Text style={styles.farmName}>{farm.name}</Text>
                <Text style={styles.ownerName}>Owner: {farm.owner_name}</Text>
              </View>
              <View style={styles.farmDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{farm.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="resize-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{farm.total_area} {t('yield_weather.common.hectares')}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="grid-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{plots.length} {t('yield_weather.my_farm.plots')}</Text>
                </View>
              </View>
              <View style={styles.farmActions}>
                <TouchableOpacity
                  style={styles.editFarmButton}
                  onPress={() => {
                    setNumPlots(plots.length.toString());
                    setEditModalVisible(true);
                  }}
                >
                  <Text style={styles.editFarmButtonText}>{t('yield_weather.my_farm.edit_farm')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteFarmButton}
                  onPress={handleDeleteFarm}
                >
                  <Text style={styles.deleteFarmButtonText}>{t('yield_weather.common.delete')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noFarmContainer}>
              <Ionicons name="leaf-outline" size={48} color="#6B7280" />
              <Text style={styles.noFarmText}>No farm registered yet</Text>
              <Text style={styles.noFarmSubtext}>Create your first farm to get started</Text>
              <TouchableOpacity
                style={styles.createFarmButton}
                onPress={() => {
                  setIsEditing(false);
                  setNumPlots('1');
                  setEditModalVisible(true);
                }}
              >
                <Text style={styles.createFarmButtonText}>Create Farm</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Plots Overview */}
        {plots.length > 0 && (
          <View style={styles.plotsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('yield_weather.my_farm.plots')}</Text>
              <TouchableOpacity
                style={styles.managePlotsButton}
                onPress={() => setPlotManagementVisible(true)}
              >
                <Ionicons name="settings-outline" size={16} color="#4CAF50" />
                <Text style={styles.managePlotsText}>{t('yield_weather.my_farm.manage_plots')}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Total area summary */}
            <View style={styles.areaSummary}>
              <Text style={styles.areaSummaryText}>
                {t('yield_weather.my_farm.total_allocated')}: {plots.reduce((sum, plot) => sum + plot.area, 0).toFixed(1)} {t('yield_weather.common.ha')} / {farm?.total_area} {t('yield_weather.common.ha')}
              </Text>
              {plots.reduce((sum, plot) => sum + plot.area, 0) < (farm?.total_area || 0) && (
                <Text style={styles.remainingAreaText}>
                  ({((farm?.total_area || 0) - plots.reduce((sum, plot) => sum + plot.area, 0)).toFixed(1)} {t('yield_weather.common.ha')} {t('yield_weather.my_farm.remaining')})
                </Text>
              )}
            </View>

            <View style={styles.plotsGrid}>
              {plots.map((plot) => {
                const plantingInfo = getPlotPlantingInfo(plot.id!);
                const statusDisplay = getPlotStatusDisplay(plot, plantingInfo);
                
                return (
                  <View key={plot.id} style={styles.plotCard}>
                    <View style={styles.plotHeader}>
                      <Text style={styles.plotName}>{plot.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusDisplay.bgColor }]}>
                        <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                          {statusDisplay.status}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.plotAreaInfo}>
                      <Text style={styles.plotDetails}>{plot.area} ha</Text>
                      <Text style={styles.plotAreaPercentage}>
                        {farm ? ((plot.area / farm.total_area) * 100).toFixed(1) : '0'}% of farm
                      </Text>
                    </View>
                    
                    {/* Visual representation of plot size */}
                    <View style={styles.plotAreaBar}>
                      <View
                        style={[
                          styles.plotAreaFill,
                          {
                            width: farm ? `${(plot.area / farm.total_area) * 100}%` : '0%',
                          },
                        ]}
                      />
                    </View>
                    
                    {/* Planting Information */}
                    {plantingInfo.isPlanted ? (
                      <View style={styles.plantingInfo}>
                        <View style={styles.varietyContainer}>
                          <Ionicons name="leaf" size={16} color="#059669" />
                          <Text style={styles.varietyText}>{plantingInfo.variety}</Text>
                        </View>
                        <Text style={styles.plantingDetails}>
                          {t('yield_weather.my_farm.planted')}: {plantingInfo.plantedDate ? new Date(plantingInfo.plantedDate).toLocaleDateString() : t('yield_weather.common.unknown')}
                        </Text>
                        <Text style={styles.ageText}>
                          {plantingInfo.daysOld} {t('yield_weather.my_farm.days_old')} ({Math.floor(plantingInfo.daysOld / 365)} years) • {plantingInfo.seedlingCount.toLocaleString()} {t('yield_weather.my_farm.seedlings')}
                        </Text>
                        {/* Show growth stage information */}
                        {plantingInfo.plantedDate && (() => {
                          const calculatedStatus = calculatePlotStatus(plantingInfo.plantedDate);
                          const yearsDiff = plantingInfo.daysOld / 365;
                          let stageDescription = '';
                          
                          if (yearsDiff < 1) {
                            stageDescription = t('yield_weather.my_farm.growth_stages.young_saplings');
                          } else if (yearsDiff < 3) {
                            stageDescription = t('yield_weather.my_farm.growth_stages.active_growth');
                          } else if (yearsDiff < 3.5) {
                            stageDescription = t('yield_weather.my_farm.growth_stages.maturation');
                          } else {
                            stageDescription = t('yield_weather.my_farm.growth_stages.prime_harvesting');
                          }
                          
                          return (
                            <Text style={styles.stageDescription}>
                              📈 {stageDescription}
                            </Text>
                          );
                        })()}
                      </View>
                    ) : (
                      <View style={styles.notPlantedContainer}>
                        <Ionicons name="add-circle-outline" size={20} color="#6B7280" />
                        <Text style={styles.notPlantedText}>Ready for planting</Text>
                        <TouchableOpacity
                          style={styles.plantButton}
                          onPress={() => router.push('/yield-weather/MyPlantingRecords')}
                        >
                          <Text style={styles.plantButtonText}>Add Planting Record</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Activity History */}
        {activities.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>{t('yield_weather.my_farm.recent_activities')}</Text>
            <View style={styles.activityList}>
              {activities.slice(0, 5).map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons
                      name={
                        activity.activity_type === 'Fertilizing' ? 'nutrition-outline' :
                        activity.activity_type === 'Watering' ? 'water-outline' :
                        activity.activity_type === 'Pruning' ? 'cut-outline' :
                        activity.activity_type === 'Pest Control' ? 'shield-outline' :
                        'checkmark-circle-outline'
                      }
                      size={20}
                      color="#4CAF50"
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityType}>{activity.activity_type}</Text>
                      <Text style={styles.activityDate}>{formatDate(activity.activity_date)}</Text>
                    </View>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    {activity.plot_name && (
                      <Text style={styles.activityPlot}>📍 {activity.plot_name}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Farm Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancelText}>{t('yield_weather.common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? t('yield_weather.my_farm.edit_farm') : t('yield_weather.my_farm.create_farm')}</Text>
            <TouchableOpacity onPress={handleSaveFarm}>
              <Text style={styles.modalSaveText}>{t('yield_weather.common.save')}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Farm Name *</Text>
              <TextInput
                style={styles.input}
                value={farmName}
                onChangeText={setFarmName}
                placeholder="Enter farm name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Owner Name *</Text>
              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Enter owner name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Farm Location *</Text>
              <TextInput
                style={styles.input}
                value={farmLocation}
                onChangeText={setFarmLocation}
                placeholder="Enter farm location"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Farm Area ({t('yield_weather.common.hectares')}) *</Text>
              <TextInput
                style={styles.input}
                value={farmArea}
                onChangeText={setFarmArea}
                placeholder="Enter area in hectares"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Number of Plots *</Text>
              <TextInput
                style={styles.input}
                value={numPlots}
                onChangeText={setNumPlots}
                placeholder="Enter number of plots (1-50)"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.fieldNote}>
                The last plot will get the remaining area after distributing equal areas to other plots
                {farmArea && numPlots && !isNaN(parseFloat(farmArea)) && !isNaN(parseInt(numPlots)) && parseInt(numPlots) > 0 ? (
                  parseInt(numPlots) === 1 ? 
                    ` (${parseFloat(farmArea).toFixed(1)} ${t('yield_weather.common.ha')} for single plot)` :
                    ` (${(parseFloat(farmArea) / parseInt(numPlots)).toFixed(1)} ${t('yield_weather.common.ha')} each, last plot gets remainder)`
                ) : ''}
              </Text>
            </View>

            <Text style={styles.requiredNote}>* Required fields</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Plot Management Modal */}
      <PlotManagementModal
        visible={plotManagementVisible}
        onClose={() => setPlotManagementVisible(false)}
        plots={plots}
        farmId={farm?.id || 0}
        farmTotalArea={farm?.total_area || 0}
        onPlotsUpdate={(updatedPlots) => {
          setPlots(updatedPlots);
          if (farm) {
            setFarm({ ...farm, num_plots: updatedPlots.length });
          }
        }}
      />
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
  editButton: {
    padding: 8,
  },
  farmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  farmHeader: {
    marginBottom: 16,
  },
  farmName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 16,
    color: '#6B7280',
  },
  farmDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
  },
  farmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editFarmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editFarmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteFarmButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteFarmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noFarmContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noFarmText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noFarmSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createFarmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFarmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  plotsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  plotsGrid: {
    gap: 12,
  },
  plotCard: {
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
    marginBottom: 16,
  },
  plotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plotName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  plotDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  plotAge: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  activitySection: {
    marginBottom: 100,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  activityPlot: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
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
  requiredNote: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  fieldNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  managePlotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 4,
  },
  managePlotsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  areaSummary: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  areaSummaryText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  remainingAreaText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  plotAreaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plotAreaPercentage: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  plotAreaBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  plotAreaFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  plantingInfo: {
    marginTop: 8,
  },
  varietyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  varietyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  plantingDetails: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  ageText: {
    fontSize: 12,
    color: '#6B7280',
  },
  stageDescription: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 4,
    fontStyle: 'italic',
  },
  notPlantedContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  notPlantedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  plantButton: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  plantButtonText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  // Farm Selection Styles
  farmSelectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  farmSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  farmSelectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  farmDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  farmDropdownText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  farmSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  farmSummaryText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default MyFarm;