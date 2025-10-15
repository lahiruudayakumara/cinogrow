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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';
import { weatherAPI, WeatherData } from '../../services/yield_weather/weatherAPI';
import locationService from '../../services/locationService';
import LocationInputModal from '../../components/LocationInputModal';
import APIDebugger from '../../services/apiDebugger';

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

  const onRefresh = () => {
    loadWeatherData(true);
  };

  useEffect(() => {
    // Skip connectivity test on initial load for faster startup
    loadWeatherData(false, true);
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi Udari!</Text>
          <Text style={styles.subtitle}>
            Here's what your farm looks like today.
          </Text>
          <TouchableOpacity onPress={handleLocationSettings} style={styles.locationButton}>
            <Ionicons name="location" size={14} color="#4CAF50" />
            <Text style={styles.locationText}>{location}</Text>
            <Ionicons name="chevron-down" size={14} color="#4CAF50" />
          </TouchableOpacity>
        </View>        {error && (
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

        {/* Farm Stats */}
        <View style={styles.farmStats}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="leaf" size={24} color="#22C55E" />
            </View>
            <Text style={styles.statTitle}>Total Area</Text>
            <Text style={styles.statValue}>5.2 ha</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DFF5DA' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="bar-chart" size={24} color="#22C55E" />
            </View>
            <Text style={styles.statTitle}>Active Plots</Text>
            <Text style={styles.statValue}>03</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('MyFarm')}>
              <Text style={styles.actionButtonText}>My Farm</Text>
              <Ionicons name="arrow-up" size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('MyPlantingRecords')}>
              <Text style={styles.actionButtonText}>My Planting Records</Text>
              <Ionicons name="arrow-up" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {/* Removed Farm Assistance and My Yield buttons */}
        </View>

        {/* Farm Status */}
        <View style={styles.farmStatusSection}>
          <Text style={styles.farmStatusTitle}>Farm Status</Text>
          <View style={styles.farmStatusCard}>
            <View style={styles.plotItem}>
              <Text style={styles.plotName}>Plot A</Text>
              <Text style={styles.plotStatus}>Young plants 12 months old</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '65%', backgroundColor: '#BFDBFE' }]} />
              </View>
            </View>
            <View style={styles.plotItem}>
              <Text style={styles.plotName}>Plot B</Text>
              <Text style={styles.plotStatus}>Mature plant</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '100%', backgroundColor: '#DBEAFE' }]} />
              </View>
            </View>
          </View>
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
    backgroundColor: '#FFFFFF',
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
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5FB36C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  locationText: {
    fontSize: 12,
    color: '#4CAF50',
    marginHorizontal: 6,
    fontWeight: '500',
    maxWidth: 200,
  },
  // Weather Card Styles
  weatherCard: {
    backgroundColor: '#E4F1FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weatherLeft: {
    flex: 1,
  },
  weatherTitle: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  weatherDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  weatherRight: {
    marginLeft: 16,
  },
  // Farm Stats Styles
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 0.48,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  // Action Buttons Styles
  actionButtons: {
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    flex: 0.48,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  // Farm Status Styles
  farmStatusSection: {
    marginTop: 20,
    marginBottom: 100,
  },
  farmStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  farmStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  plotItem: {
    marginBottom: 16,
  },
  plotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  plotStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressContainer: {
    backgroundColor: '#F3F4F6',
    height: 8,
    borderRadius: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },

});

export default YieldWeatherHome;
