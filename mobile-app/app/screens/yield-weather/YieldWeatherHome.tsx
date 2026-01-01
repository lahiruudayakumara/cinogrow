import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { weatherAPI, WeatherData } from '../../../services/yield_weather/weatherAPI';
import { farmAPI } from '../../../services/yield_weather/farmAPI';
import { plantingRecordsAPI } from '../../../services/yield_weather/plantingRecordsAPI';
import locationService from '../../../services/locationService';
import LocationInputModal from '../../../components/LocationInputModal';
import APIDebugger from '../../../services/apiDebugger';

const { width: screenWidth } = Dimensions.get('window');

const YieldWeatherHome = () => {
  const { t } = useTranslation();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<string>('Unknown Location');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [lastDataLoad, setLastDataLoad] = useState<number>(0);
  const [farmStats, setFarmStats] = useState({ totalArea: 0, activePlots: 0, plotsReadyToHarvest: 0 });
  const [farmStatsLoading, setFarmStatsLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  
  // Get safe area insets to handle overlap with tab bar
  const insets = useSafeAreaInsets();

  // Cache duration in milliseconds (3 minutes)
  const CACHE_DURATION = 3 * 60 * 1000;

  // Services data for carousel
  const services = [
    {
      id: '1',
      title: t('yield_weather.home.services.weather_yield.title'),
      description: t('yield_weather.home.services.weather_yield.description'),
      icon: 'cloud',
      color: '#059669',
      bgColor: '#D1FAE5',
      route: '/yield-weather/YieldPredictor',
      image: require('../../../assets/images/yield.png'),
      
    },
    {
      id: '2',
      title: t('yield_weather.home.services.oil_yield.title'),
      description: t('yield_weather.home.services.oil_yield.description'),
      icon: 'flask',
      color: '#D97706',
      bgColor: '#FEF3C7',
      route: '/(tabs)/oil',
      image: require('../../../assets/images/oil.png'),
    },
    {
      id: '3',
      title: t('yield_weather.home.services.fertilizer.title'),
      description: t('yield_weather.home.services.fertilizer.description'),
      icon: 'nutrition',
      color: '#2563EB',
      bgColor: '#DBEAFE',
      route: '/(tabs)/fertilizer',
      image: require('../../../assets/images/fertilizer.png'),
    },
    {
      id: '4',
      title: t('yield_weather.home.services.pest_disease.title'),
      description: t('yield_weather.home.services.pest_disease.description'),
      icon: 'bug',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      route: '/(tabs)/pests',
      image: require('../../../assets/images/pest.png'),
    },
  ];

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
      console.log('🌍 Starting location acquisition process...');
      
      // Run diagnostics first
      try {
        const diagnostics = await locationService.getDiagnostics();
        console.log('📊 Location diagnostics:', {
          permission: diagnostics.permissionStatus,
          servicesEnabled: diagnostics.servicesEnabled,
          hasLastKnown: diagnostics.hasLastKnown,
          manualSet: diagnostics.manualLocationSet,
          error: diagnostics.error
        });
      } catch (diagError) {
        console.log('⚠️ Could not run location diagnostics:', diagError);
      }

      const locationPromise = locationService.getLocationWithFallback();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Location timeout')), 15000); // 15 second timeout
      });

      let locationResult;
      try {
        locationResult = await Promise.race([locationPromise, timeoutPromise]);
        console.log('✅ Location result:', locationResult);
      } catch (timeoutError) {
        console.log('⏰ Location request timed out, using default location');
        console.log('Using default location due to: timeout');
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



  const loadFarmStats = async () => {
    try {
      setFarmStatsLoading(true);
      const USER_ID = 1; // Mock user ID
      
      // Get farms and calculate total area
      const farms = await farmAPI.getFarms();
      const userFarms = farms.filter(farm => farm.id); // All farms for now
      const totalArea = userFarms.reduce((sum, farm) => sum + farm.total_area, 0);
      
      // Get planting records for all farms to determine active plots
      let allPlantingRecords: any[] = [];
      for (const farm of userFarms) {
        if (farm.id) {
          try {
            const farmPlantingRecords = await plantingRecordsAPI.getFarmPlantingRecords(farm.id);
            allPlantingRecords = [...allPlantingRecords, ...farmPlantingRecords];
          } catch (error) {
            console.warn(`Failed to get planting records for farm ${farm.id}:`, error);
            // Continue with other farms even if one fails
          }
        }
      }
      
      // Get all plots and determine which are active based on planting records
      let activePlots = 0;
      let plotsReadyToHarvest = 0;
      
      for (const farm of userFarms) {
        if (farm.id) {
          const plots = await farmAPI.getFarmPlots(farm.id);
          
          // Count plots that have planting records
          for (const plot of plots) {
            const plantingRecord = allPlantingRecords.find(record => record.plot_id === plot.id);
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
    loadFarmStats();
  };

  useEffect(() => {
    // Skip connectivity test on initial load for faster startup
    loadWeatherData(false, true);
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
          <Text style={styles.loadingText}>{t('yield_weather.home.loading_weather')}</Text>
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
            source={require('../../../assets/images/cinnamonheader.webp')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerContent}>
              <Image 
                source={require('../../../assets/images/CinoGrow logo.webp')}
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
            <Text style={styles.greeting}>{t('yield_weather.home.greeting')} ! </Text>
            <Text style={styles.subtitle}>
              {t('yield_weather.home.subtitle')}
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
            <Text style={styles.weatherTitle}>{t('yield_weather.home.current_weather')}</Text>
            <Text style={styles.weatherTemp}>
              {weatherData ? `${formatTemperature(weatherData.temperature)} - ${weatherData.weather_description}` : t('yield_weather.common.loading')}
            </Text>
            <Text style={styles.weatherDesc}>
              {t('yield_weather.home.humidity')} {weatherData ? `${weatherData.humidity}%` : '--'} | {t('yield_weather.home.rain')} {weatherData ? formatRainfall(weatherData.rainfall) : '--'}
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
                ? t('yield_weather.home.weather_insights.high_humidity')
                : weatherData && weatherData.rainfall > 5
                ? t('yield_weather.home.weather_insights.recent_rain')
                : t('yield_weather.home.weather_insights.perfect_conditions')}
            </Text>
          </View>
        </View>

        {/* Farm Stats */}
        <View style={styles.farmStats}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="leaf" size={28} color="#22C55E" />
            </View>
            <Text style={styles.statTitle}>{t('yield_weather.home.total_area')}</Text>
            <Text style={styles.statValue}>
              {farmStatsLoading ? '...' : `${farmStats.totalArea} ${t('yield_weather.common.ha')}`}
            </Text>
            <Text style={styles.statChange}>{t('yield_weather.home.this_year')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="grid" size={28} color="#6366F1" />
            </View>
            <Text style={styles.statTitle}>{t('yield_weather.home.active_plots')}</Text>
            <Text style={styles.statValue}>
              {farmStatsLoading ? '...' : farmStats.activePlots.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.statChange}>
              {farmStatsLoading ? '...' : `${farmStats.plotsReadyToHarvest} ${t('yield_weather.home.ready_to_harvest')}`}
            </Text>
          </View>
        </View>

        {/* Services Carousel */}
        <View style={styles.carouselSection}>
          <Text style={styles.sectionTitle}>{t('yield_weather.home.our_services')}</Text>
          <FlatList
            ref={carouselRef}
            data={services}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const slideIndex = Math.round(
                event.nativeEvent.contentOffset.x / (screenWidth - 40)
              );
              setActiveSlide(slideIndex);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.carouselCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.9}
              >
                <View style={styles.carouselImageContainer}>
                  <Image
                    source={item.image}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.carouselContent}>
                  <Text style={styles.carouselTitle}>{item.title}</Text>
                  <Text style={styles.carouselDescription}>{item.description}</Text>
                  <TouchableOpacity 
                    style={[styles.carouselCTAButton, { backgroundColor: item.color }]}
                    onPress={() => router.push(item.route as any)}
                  >
                    <Text style={styles.carouselCTAButtonText}>
                      {t('yield_weather.home.explore_now')}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {services.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  activeSlide === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>{t('yield_weather.home.quick_actions')}</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/yield-weather/MyFarm')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="business" size={26} color="#1976D2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>{t('yield_weather.home.my_farm')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('yield_weather.home.manage_plots')}</Text>
              </View>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/yield-weather/MyPlantingRecords')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="flower" size={26} color="#7B1FA2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>{t('yield_weather.home.records')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('yield_weather.home.planting_history')}</Text>
              </View>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/yield-weather/YieldPredictor' as any)}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="bar-chart" size={26} color="#F57C00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>{t('yield_weather.home.yield_predictor')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('yield_weather.home.ai_powered_yield_prediction')}</Text>
              </View>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/yield-weather/MyYield' as any)}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="document-text" size={26} color="#0288D1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>{t('yield_weather.home.my_yield_records')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('yield_weather.home.track_harvest')}</Text>
              </View>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/yield-weather/FarmAssistance')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="leaf" size={26} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>{t('yield_weather.home.farm_assistant')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('yield_weather.home.smart_recommendations')}</Text>
              </View>
              <View style={styles.actionCardArrow}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
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
    marginTop: Platform.OS === 'android' ? 0 : -70,
    backgroundColor: '#FAFBFC',
  },
  // Banner Styles
  bannerContainer: {
    height: 120,
    marginHorizontal: -20, // Extend to screen edges
    marginTop: -20,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
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
    paddingBottom: 12,
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
    fontSize: 22,
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
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    flex: 1,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  actionCardArrow: {
    marginLeft: 8,
  },
  // Carousel Styles
  carouselSection: {
    marginBottom: 32,
  },
  carouselCard: {
    width: screenWidth - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  carouselImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselContent: {
    padding: 20,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  carouselDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  carouselCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselCTAButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#4CAF50',
  },
});

export default YieldWeatherHome;
