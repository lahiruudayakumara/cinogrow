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
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';
import { weatherAPI, WeatherData } from '../../services/yield_weather/weatherAPI';
import { farmAPI } from '../../services/yield_weather/farmAPI';
import { plantingRecordsAPI } from '../../services/yield_weather/plantingRecordsAPI';
import locationService from '../../services/locationService';
import LocationInputModal from '../../components/LocationInputModal';
import APIDebugger from '../../services/apiDebugger';

// Farm Assistance API imports
let farmAssistanceAPI: any;
try {
  farmAssistanceAPI = require('../../services/yield_weather/farmAssistanceAPI');
} catch (importError) {
  console.warn('⚠️ Failed to import farmAssistanceAPI, using fallback:', importError);
  
  // Fallback type definitions
  interface ActivityRecord {
    id: number;
    user_id: number;
    plot_id: number;
    activity_name: string;
    activity_date: string;
    trigger_condition: string;
    weather_snapshot: {
      temperature: number;
      humidity: number;
      rainfall: number;
      wind_speed: number;
      weather_description: string;
    };
  }

  // Fallback API
  farmAssistanceAPI = {
    getActivityHistory: async (): Promise<ActivityRecord[]> => {
      console.log('📝 Using fallback activity history');
      return [];
    }
  };
}

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

const YieldWeatherHome = () => {
  const navigation = useNavigation<NavigationProp>();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<string>('Unknown Location');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [lastDataLoad, setLastDataLoad] = useState<number>(0);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [farmStats, setFarmStats] = useState({ totalArea: 0, activePlots: 0, plotsReadyToHarvest: 0 });
  const [farmStatsLoading, setFarmStatsLoading] = useState(true);
  
  // Get safe area insets to handle overlap with tab bar
  const insets = useSafeAreaInsets();

  // Cache duration in milliseconds (3 minutes)
  const CACHE_DURATION = 3 * 60 * 1000;

  const loadWeatherData = async (showRefreshIndicator = false, skipConnectivityTest = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Skip connectivity test on refresh or if explicitly skipped for faster loading
      if (!skipConnectivityTest && !showRefreshIndicator) {
        console.log('🔍 Testing API connectivity...');
        const isConnected = await APIDebugger.quickTest();
        if (!isConnected) {
          throw new Error('Cannot connect to weather service. Please check your network connection.');
        }
      }

      // Get user location (manual or GPS) with timeout
      const locationPromise = locationService.getCurrentLocation();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Location timeout')), 3000); // 3 second timeout
      });

      let locationResult;
      try {
        locationResult = await Promise.race([locationPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.log('Location request timed out, using default location');
        locationResult = { success: false, error: 'timeout' };
      }
      
      let weatherResponse;
      if (locationResult.success && locationResult.coordinates) {
        // Use coordinates (manual or GPS)
        weatherResponse = await weatherAPI.getCurrentWeather(locationResult.coordinates);
      } else if (locationResult.error && locationResult.error.startsWith('manual_city:')) {
        // Extract city name from error field
        const cityName = locationResult.error.replace('manual_city:', '');
        weatherResponse = await weatherAPI.getWeatherByCity(cityName);
      } else {
        // Fallback to default location (Colombo, Sri Lanka)
        console.log('Using default location due to:', locationResult.error);
        weatherResponse = await weatherAPI.getWeatherByCity('Colombo,LK');
      }

      if (weatherResponse.success && weatherResponse.data) {
        setWeatherData(weatherResponse.data);
        setLocation(weatherResponse.location);
      } else {
        setError(weatherResponse.message);
        Alert.alert('Weather Error', weatherResponse.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weather data';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadActivityHistory = async () => {
    try {
      const history = await farmAssistanceAPI.getActivityHistory();
      // Get the 3 most recent activities
      const recentActivities = history.slice(0, 3);
      setActivityHistory(recentActivities);
    } catch (error) {
      console.warn('Failed to load activity history:', error);
      setActivityHistory([]);
    }
  };

  const loadFarmStats = async () => {
    try {
      setFarmStatsLoading(true);
      const USER_ID = 1; // Mock user ID
      
      // Get farms and calculate total area
      const farms = await farmAPI.getFarms();
      const userFarms = farms.filter(farm => farm.id); // All farms for now
      const totalArea = userFarms.reduce((sum, farm) => sum + farm.total_area, 0);
      
      // Get planting records to determine active plots
      const plantingRecords = await plantingRecordsAPI.getUserPlantingRecords(USER_ID);
      
      // Get all plots and determine which are active based on planting records
      let activePlots = 0;
      let plotsReadyToHarvest = 0;
      
      for (const farm of userFarms) {
        if (farm.id) {
          const plots = await farmAPI.getFarmPlots(farm.id);
          
          // Count plots that have planting records
          for (const plot of plots) {
            const plantingRecord = plantingRecords.find(record => record.plot_id === plot.id);
            if (plantingRecord) {
              activePlots++;
              
              // Calculate plot status based on planting date
              const plotStatus = calculatePlotStatus(plantingRecord.planted_date);
              
              // Note: Temporarily disable auto-status update to avoid backend issues
              // TODO: Re-enable after fixing backend plot status endpoint
              
              // Count plots ready to harvest based on calculated status
              if (plotStatus.status === 'HARVESTING' || plotStatus.status === 'MATURE') {
                plotsReadyToHarvest++;
              }
            }
          }
        }
      }
      
      setFarmStats({ 
        totalArea: Math.round(totalArea * 10) / 10, // Round to 1 decimal
        activePlots,
        plotsReadyToHarvest 
      });
    } catch (error) {
      console.warn('Failed to load farm stats:', error);
      setFarmStats({ totalArea: 5.2, activePlots: 3, plotsReadyToHarvest: 2 }); // Fallback values
    } finally {
      setFarmStatsLoading(false);
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

  const onRefresh = async () => {
    loadWeatherData(true);
    loadActivityHistory();
    loadFarmStats();
  };

  useEffect(() => {
    // Skip connectivity test on initial load for faster startup
    loadWeatherData(false, true);
    loadActivityHistory();
    loadFarmStats();
  }, []);

  // Removed handleFindMyYield and handleFarmAssistant functions

  const handleLocationSettings = () => {
    setLocationModalVisible(true);
  };

  const handleLocationSet = () => {
    loadWeatherData();
  };

  const formatTemperature = (temp: number) => `${Math.round(temp)}°C`;
  const formatWindSpeed = (speed: number) => `${Math.round(speed * 3.6)} km/h`; // Convert m/s to km/h
  const formatRainfall = (rain: number) => rain > 0 ? `${rain.toFixed(1)}mm` : '0mm';



  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading weather data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{
          paddingBottom: Platform.select({
            ios: 100 + insets.bottom, // Extra padding for iOS tab bar + safe area
            default: 80 + insets.bottom, // Extra padding for Android tab bar + safe area
          }),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cinnamon Plant Banner */}
        <View style={styles.bannerContainer}>
          <Image 
            source={require('../../assets/images/cinnamonheader.webp')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerContent}>
              <Image 
                source={require('../../assets/images/CinoGrow logo.webp')}
                style={styles.bannerLogo}
                resizeMode="contain"
              />
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>CinoGrow</Text>
                <Text style={styles.bannerSubtitle}>Smart Cinnamon Farming</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Hello Udari! 👋</Text>
            <Text style={styles.subtitle}>
              Let's check your farm's progress today
            </Text>
          </View>
          <TouchableOpacity onPress={handleLocationSettings} style={styles.locationButton}>
            <Ionicons name="location" size={16} color="#4CAF50" />
            <Text style={styles.locationText}>{location}</Text>
            <Ionicons name="chevron-down" size={14} color="#4CAF50" />
          </TouchableOpacity>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadWeatherData()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherLeft}>
            <Text style={styles.weatherTitle}>Current Weather</Text>
            <Text style={styles.weatherTemp}>
              {weatherData ? `${formatTemperature(weatherData.temperature)} - ${weatherData.weather_description}` : 'Loading...'}
            </Text>
            <Text style={styles.weatherDesc}>
              Humidity {weatherData ? `${weatherData.humidity}%` : '--'} | Rain {weatherData ? formatRainfall(weatherData.rainfall) : '--'}
            </Text>
          </View>
          <View style={styles.weatherRight}>
            <Ionicons 
              name={weatherData && weatherData.rainfall > 0 ? "rainy" : "partly-sunny"} 
              size={48} 
              color="#3B82F6" 
            />
          </View>
        </View>

        {/* Weather Insights */}
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightText}>
              {weatherData && weatherData.humidity > 70 
                ? "High humidity detected - Monitor for fungal diseases" 
                : weatherData && weatherData.rainfall > 5
                ? "Recent rain - Good for young plants, check drainage"
                : "Perfect weather conditions for farming activities"}
            </Text>
          </View>
        </View>

        {/* Farm Stats */}
        <View style={styles.farmStats}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="leaf" size={28} color="#22C55E" />
            </View>
            <Text style={styles.statTitle}>Total Area</Text>
            <Text style={styles.statValue}>
              {farmStatsLoading ? '...' : `${farmStats.totalArea} ha`}
            </Text>
            <Text style={styles.statChange}>+0.5 ha this year</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="grid" size={28} color="#6366F1" />
            </View>
            <Text style={styles.statTitle}>Active Plots</Text>
            <Text style={styles.statValue}>
              {farmStatsLoading ? '...' : farmStats.activePlots.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.statChange}>
              {farmStatsLoading ? '...' : `${farmStats.plotsReadyToHarvest} ready to harvest`}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyFarm')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="business" size={24} color="#1976D2" />
              </View>
              <Text style={styles.actionCardTitle}>My Farm</Text>
              <Text style={styles.actionCardSubtitle}>Manage your plots</Text>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyPlantingRecords')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="flower" size={24} color="#7B1FA2" />
              </View>
              <Text style={styles.actionCardTitle}>Records</Text>
              <Text style={styles.actionCardSubtitle}>Planting history</Text>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyYield')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="bar-chart" size={24} color="#F57C00" />
              </View>
              <Text style={styles.actionCardTitle}>My Yield</Text>
              <Text style={styles.actionCardSubtitle}>Track harvest</Text>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('FarmAssistance')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="leaf" size={24} color="#22C55E" />
              </View>
              <Text style={styles.actionCardTitle}>Farm Assistant</Text>
              <Text style={styles.actionCardSubtitle}>Smart recommendations</Text>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity History */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activityHistory.length > 0 ? (
            <View style={styles.activityContainer}>
              {activityHistory.map((activity, index) => (
                <View key={activity.id || index} style={[
                  styles.activityItem,
                  index === activityHistory.length - 1 ? { borderBottomWidth: 0 } : {}
                ]}>
                  <View style={styles.activityIcon}>
                    <Ionicons 
                      name={activity.activity_name === 'Irrigation' ? 'water' : 
                            activity.activity_name.includes('Fertilizer') ? 'leaf' : 
                            activity.activity_name.includes('Harvest') ? 'cut' : 'checkmark-circle'} 
                      size={20} 
                      color="#10B981" 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityName}>{activity.activity_name}</Text>
                    <Text style={styles.activityDate}>
                      {new Date(activity.activity_date).toLocaleDateString()} • Plot {activity.plot_id}
                    </Text>
                    <Text style={styles.activityTrigger} numberOfLines={1}>
                      {activity.trigger_condition}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noActivityContainer}>
              <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
              <Text style={styles.noActivityText}>No recent activities</Text>
              <Text style={styles.noActivitySubtext}>Complete activities in Farm Assistance to see them here</Text>
            </View>
          )}
        </View>


      </ScrollView>

      <LocationInputModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationSet={handleLocationSet}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  // Banner Styles
  bannerContainer: {
    height: 180,
    marginHorizontal: -20, // Extend to screen edges
    marginTop: -20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    paddingBottom: 24,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    opacity: 0.95,
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
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  welcomeSection: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFF8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    alignSelf: 'flex-start',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#4CAF50',
    marginHorizontal: 8,
    fontWeight: '600',
    maxWidth: 200,
  },
  // Weather Card Styles
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  weatherLeft: {
    flex: 1,
  },
  weatherTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  weatherDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  weatherRight: {
    marginLeft: 16,
  },
  // Weather Insights Styles
  insightCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 18,
  },
  // Farm Stats Styles
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  // Quick Actions Styles
  quickActionsSection: {
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  actionCardArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  // Activity History Styles
  activitySection: {
    marginTop: 24,
    marginBottom: 20,
  },

  activityContainer: {
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  activityTrigger: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noActivityContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noActivityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  noActivitySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

});

export default YieldWeatherHome;
