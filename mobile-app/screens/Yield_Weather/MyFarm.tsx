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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';
import { farmAPI, type Farm, type Plot, type Activity } from '../../services/yield_weather/farmAPI';

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

const MyFarm = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
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

      // Check if backend is available
      const isBackendAvailable = await farmAPI.testConnection();
      
      if (isBackendAvailable) {
        // Use real API
        const farms = await farmAPI.getFarms();
        
        if (farms && farms.length > 0) {
          const farmData = farms[0]; // Use first farm for this user
          setFarm(farmData);
          setFarmName(farmData.name);
          setOwnerName(farmData.owner_name);
          setFarmLocation(farmData.location);
          setFarmArea(farmData.total_area.toString());
          setIsEditing(true);

          // Load plots and activities
          await loadPlotsAndActivities(farmData.id!);
        } else {
          // No farm found, show empty form
          setIsEditing(false);
          clearForm();
        }
      } else {
        // Backend not available - show error
        throw new Error('Backend not available');
      }
    } catch (error) {
      console.error('Error loading farm data:', error);
      Alert.alert('Error', 'Failed to load farm data. Please check your connection and try again.');
      
      // No fallback - force user to fix connection
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
      // Check if backend is available
      const isBackendAvailable = await farmAPI.testConnection();
      
      if (isBackendAvailable) {
        // Load real data from API
        const plotsData = await farmAPI.getFarmPlots(farmId);
        setPlots(plotsData);
        setNumPlots(plotsData.length.toString());

        // For now, set empty activities since we don't have activity endpoints yet
        setActivities([]);
      } else {
        // Backend not available
        throw new Error('Backend not available');
      }
    } catch (error) {
      console.error('Error loading plots and activities:', error);
      
      // No fallback - clear data
      setPlots([]);
      setActivities([]);
      setNumPlots('0');
    }
  };

  const clearForm = () => {
    setFarmName('');
    setOwnerName('');
    setFarmLocation('');
    setFarmArea('');
    setNumPlots('1');
  };

  const generatePlots = (farmId: number, numberOfPlots: number, totalArea: number): Plot[] => {
    const plots: Plot[] = [];
    const areaPerPlot = totalArea / numberOfPlots;
    const plotNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    const statuses: Array<'PLANTED' | 'GROWING' | 'MATURE'> = ['PLANTED', 'GROWING', 'MATURE'];
    
    for (let i = 0; i < numberOfPlots; i++) {
      const plotName = plotNames[i] || `${Math.floor(i / 20) + 1}${plotNames[i % 20]}`;
      plots.push({
        id: Date.now() + i,
        farm_id: farmId,
        name: `Plot ${plotName}`,
        area: parseFloat(areaPerPlot.toFixed(1)),
        status: statuses[i % statuses.length],
        crop_type: 'Cinnamon',
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
            text: 'Cancel', 
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
            text: 'Continue',
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
                Alert.alert('Success', 'Farm details updated successfully');
              } catch (error) {
                console.error('Error updating plots:', error);
                setLoading(false);
                Alert.alert('Error', 'Failed to update plots');
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
        Alert.alert('Success', isEditing ? 'Farm details updated successfully' : 'Farm created successfully');
      } catch (error) {
        console.error('Error handling plots change:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to update farm');
      }
    }
  };

  const generatePlotsData = (numberOfPlots: number, totalArea: number) => {
    const plotNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    const areaPerPlot = totalArea / numberOfPlots;
    
    return Array.from({ length: numberOfPlots }, (_, i) => {
      const plotName = plotNames[i] || `${Math.floor(i / 20) + 1}${plotNames[i % 20]}`;
      return {
        name: `Plot ${plotName}`,
        area: parseFloat(areaPerPlot.toFixed(1)),
        crop_type: 'Cinnamon'
      };
    });
  };

  const handleSaveFarm = async () => {
    try {
      // Validate form
      if (!farmName.trim() || !ownerName.trim() || !farmLocation.trim() || !farmArea.trim() || !numPlots.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const areaValue = parseFloat(farmArea);
      if (isNaN(areaValue) || areaValue <= 0) {
        Alert.alert('Error', 'Please enter a valid farm area');
        return;
      }

      const plotsValue = parseInt(numPlots);
      if (isNaN(plotsValue) || plotsValue <= 0 || plotsValue > 50) {
        Alert.alert('Error', 'Please enter a valid number of plots (1-50)');
        return;
      }

      // Validate that each plot will have a reasonable area
      const areaPerPlot = areaValue / plotsValue;
      if (areaPerPlot < 0.1) {
        Alert.alert('Error', 'Too many plots for the farm area. Each plot would be less than 0.1 hectares.');
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
              Alert.alert('Success', 'Farm deleted successfully');
            } catch (error) {
              console.error('Error deleting farm:', error);
              Alert.alert('Error', 'Failed to delete farm');
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planted':
        return '#FEF3C7';
      case 'growing':
        return '#DBEAFE';
      case 'mature':
        return '#D1FAE5';
      case 'harvesting':
        return '#FECACA';
      default:
        return '#F3F4F6';
    }
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
          <Text style={styles.loadingText}>Loading farm data...</Text>
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
          <Text style={styles.title}>My Farm</Text>
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
                  <Text style={styles.detailText}>{farm.total_area} hectares</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="grid-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{plots.length} plots</Text>
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
                  <Text style={styles.editFarmButtonText}>Edit Farm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteFarmButton}
                  onPress={handleDeleteFarm}
                >
                  <Text style={styles.deleteFarmButtonText}>Delete</Text>
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
            <Text style={styles.sectionTitle}>Farm Plots</Text>
            <View style={styles.plotsGrid}>
              {plots.map((plot) => (
                <View key={plot.id} style={styles.plotCard}>
                  <View style={styles.plotHeader}>
                    <Text style={styles.plotName}>{plot.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plot.status) }]}>
                      <Text style={styles.statusText}>{plot.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.plotDetails}>{plot.area} ha • {plot.crop_type}</Text>
                  {plot.age_months && (
                    <Text style={styles.plotAge}>{plot.age_months} months old</Text>
                  )}
                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${plot.progress_percentage}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{plot.progress_percentage}% Complete</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity History */}
        {activities.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
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
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Farm' : 'Create Farm'}</Text>
            <TouchableOpacity onPress={handleSaveFarm}>
              <Text style={styles.modalSaveText}>Save</Text>
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
              <Text style={styles.label}>Farm Area (hectares) *</Text>
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
                The farm area will be divided equally among all plots
                {farmArea && numPlots && !isNaN(parseFloat(farmArea)) && !isNaN(parseInt(numPlots)) && parseInt(numPlots) > 0 ? 
                  ` (${(parseFloat(farmArea) / parseInt(numPlots)).toFixed(1)} ha per plot)` : ''}
              </Text>
            </View>

            <Text style={styles.requiredNote}>* Required fields</Text>
          </ScrollView>
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
  progressContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
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
});

export default MyFarm;