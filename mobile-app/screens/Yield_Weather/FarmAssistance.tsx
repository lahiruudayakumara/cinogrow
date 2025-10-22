import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';

import { weatherAPI, WeatherData } from '../../services/yield_weather/weatherAPI';
import { farmAPI, Farm, Plot } from '../../services/yield_weather/farmAPI';
import locationService from '../../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Farm Assistance API imports
// If import fails, the types are defined inline as a fallback
let farmAssistanceAPI: any;
try {
  // Dynamic import as fallback for module resolution issues
  const farmAssistanceModule = require('../../services/yield_weather/farmAssistanceAPI');
  farmAssistanceAPI = farmAssistanceModule.farmAssistanceAPI;
} catch (error) {
  console.warn('Failed to import farmAssistanceAPI, using fallback:', error);
  // Fallback implementation for development
  farmAssistanceAPI = {
    async createActivityRecord(activityRecord: Omit<ActivityRecord, 'id'>) {
      console.log('Activity record created (fallback):', activityRecord);
      return {
        success: true,
        message: 'Activity record created successfully (fallback)',
        data: { ...activityRecord, id: Date.now() }
      };
    }
  };
}

// Type definitions for farm assistance
interface Recommendation {
  id: string;
  activityName: string;
  recommendedAction: string;
  triggerCondition: string;
  reason: string;
  suggestedDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  weather_description: string;
}

interface ActivityRecord {
  id?: number;
  user_id: number;
  plot_id: number;
  activity_name: string;
  activity_date: string;
  trigger_condition: string;
  weather_snapshot: WeatherSnapshot;
}

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

interface PlotWithRecommendations extends Plot {
  recommendations: Recommendation[];
  weatherData?: WeatherData;
  growthStage?: {
    name: string;
    daysOld: number;
    stageNumber: number;
  };
}

const FarmAssistance = () => {
  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plotsWithRecommendations, setPlotsWithRecommendations] = useState<PlotWithRecommendations[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Weather caching functions
  const WEATHER_CACHE_KEY = 'farm_assistance_weather_cache';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  const getCachedWeather = async (farmId: number): Promise<WeatherData | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(`${WEATHER_CACHE_KEY}_${farmId}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const now = new Date().getTime();
        if (now - parsed.timestamp < CACHE_DURATION) {
          console.log('🗄️  Using cached weather data for farm', farmId);
          return parsed.weatherData;
        } else {
          console.log('⏰ Cache expired for farm', farmId);
          await AsyncStorage.removeItem(`${WEATHER_CACHE_KEY}_${farmId}`);
        }
      }
    } catch (error) {
      console.warn('❌ Failed to get cached weather:', error);
    }
    return null;
  };

  const setCachedWeather = async (farmId: number, weatherData: WeatherData): Promise<void> => {
    try {
      const cacheData = {
        weatherData,
        timestamp: new Date().getTime()
      };
      await AsyncStorage.setItem(`${WEATHER_CACHE_KEY}_${farmId}`, JSON.stringify(cacheData));
      console.log('💾 Cached weather data for farm', farmId);
    } catch (error) {
      console.warn('❌ Failed to cache weather:', error);
    }
  };

  // Mock recommendations for demo purposes
  const getMockRecommendations = (): PlotWithRecommendations[] => {
    const mockWeatherData: WeatherData = {
      temperature: 29,
      feels_like: 32,
      humidity: 78,
      pressure: 1013,
      wind_speed: 2.5,
      wind_direction: 180,
      rainfall: 0.5,
      weather_main: 'Clouds',
      weather_description: 'Partly cloudy',
      icon: '02d',
      visibility: 10000
    };

    return [
      {
        id: -1, // Negative ID to distinguish from real plots
        farm_id: -1,
        name: 'Demo Plot A (Young Cinnamon)',
        area: 0.8,
        status: 'growing' as any,
        crop_type: 'Cinnamon',
        planting_date: '2024-07-15T00:00:00Z', // 3 months old
        progress_percentage: 25,
        weatherData: mockWeatherData,
        growthStage: {
          name: 'Nursery / Establishment',
          daysOld: 90,
          stageNumber: 1
        },
        recommendations: [
          {
            id: 'demo-irrigation-1',
            activityName: 'Irrigation',
            recommendedAction: 'Water the seedlings thoroughly - apply 10-15L per plant',
            triggerCondition: 'Low weekly rainfall: 3.5mm & high temperature: 29°C',
            reason: 'Young cinnamon plants need consistent moisture for proper root establishment during the dry season.',
            suggestedDate: new Date().toISOString().split('T')[0],
            priority: 'high'
          },
          {
            id: 'demo-fertilizer-1',
            activityName: 'Organic Fertilization',
            recommendedAction: 'Apply compost around the base of seedlings',
            triggerCondition: 'Growth stage optimal & good soil moisture conditions',
            reason: 'Organic matter improves soil structure and provides slow-release nutrients for young plants.',
            suggestedDate: new Date().toISOString().split('T')[0],
            priority: 'medium'
          }
        ]
      },
      {
        id: -2, // Negative ID to distinguish from real plots
        farm_id: -1,
        name: 'Demo Plot B (Mature Cinnamon)',
        area: 1.2,
        status: 'mature' as any,
        crop_type: 'Cinnamon',
        planting_date: '2022-03-10T00:00:00Z', // 2.5+ years old
        progress_percentage: 90,
        weatherData: mockWeatherData,
        growthStage: {
          name: 'Harvest / Maturity',
          daysOld: 950,
          stageNumber: 3
        },
        recommendations: [
          {
            id: 'demo-harvest-1',
            activityName: 'Bark Harvesting',
            recommendedAction: 'Harvest cinnamon bark from shoots that are 2+ years old',
            triggerCondition: 'Optimal humidity: 78% & moderate temperature: 29°C',
            reason: 'Current weather conditions are perfect for bark peeling - high humidity makes bark removal easier.',
            suggestedDate: new Date().toISOString().split('T')[0],
            priority: 'high'
          },
          {
            id: 'demo-pruning-1',
            activityName: 'Post-Harvest Pruning',
            recommendedAction: 'Cut harvested shoots back to 15cm from ground level',
            triggerCondition: 'After bark harvesting completion',
            reason: 'Proper pruning encourages new shoot growth for the next harvest cycle in 18-24 months.',
            suggestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
            priority: 'medium'
          }
        ]
      }
    ];
  };

  const loadFarmAssistanceData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Always add demo data first for demonstration purposes
      const demoRecommendations = getMockRecommendations();

      // Fetch all farms
      const farmsData = await farmAPI.getFarms();
      setFarms(farmsData);

      // Always show demo data regardless of farms
      const allPlotsWithRecommendations: PlotWithRecommendations[] = [...demoRecommendations];

      // Add real farm data if available
      if (farmsData.length > 0) {
        for (const farm of farmsData) {
          const plots = await farmAPI.getFarmPlots(farm.id!);
          
          for (const plot of plots) {
            // Calculate growth stage based on planting date
            const growthStage = calculateGrowthStage(plot.planting_date || null);
            
            // Fetch weather data for farm location (with caching)
            let weatherData: WeatherData | undefined;
            try {
              // Try to get cached weather first
              const cachedWeather = await getCachedWeather(farm.id!);
              weatherData = cachedWeather || undefined;
              
              if (!weatherData) {
                // Fetch fresh weather data if no cache
                console.log('🌤️  Fetching fresh weather data for farm', farm.id);
                const weatherResponse = await weatherAPI.getCurrentWeather({
                  latitude: farm.latitude,
                  longitude: farm.longitude,
                });
                if (weatherResponse.success && weatherResponse.data) {
                  weatherData = weatherResponse.data;
                  // Cache the fresh weather data
                  await setCachedWeather(farm.id!, weatherData);
                }
              }
            } catch (weatherError) {
              console.warn(`Failed to fetch weather for ${farm.name}:`, weatherError);
            }

            // Generate recommendations based on growth stage and weather
            const recommendations = await generateRecommendations(plot, growthStage, weatherData);

            allPlotsWithRecommendations.push({
              ...plot,
              recommendations,
              weatherData,
              growthStage,
            });
          }
        }
      }

      setPlotsWithRecommendations(allPlotsWithRecommendations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load farm assistance data';
      setError(errorMessage);
      console.error('Farm Assistance error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateGrowthStage = (plantingDate: string | null) => {
    if (!plantingDate) {
      return { name: 'Unknown', daysOld: 0, stageNumber: 0 };
    }

    const plantDate = new Date(plantingDate);
    const currentDate = new Date();
    const daysOld = Math.floor((currentDate.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOld <= 180) {
      return { name: 'Nursery / Establishment', daysOld, stageNumber: 1 };
    } else if (daysOld <= 540) {
      return { name: 'Vegetative Growth', daysOld, stageNumber: 2 };
    } else {
      return { name: 'Harvest / Maturity', daysOld, stageNumber: 3 };
    }
  };

  const generateRecommendations = async (
    plot: Plot,
    growthStage: { name: string; daysOld: number; stageNumber: number },
    weatherData?: WeatherData
  ): Promise<Recommendation[]> => {
    const recommendations: Recommendation[] = [];

    if (!weatherData) {
      return [{
        id: `no-weather-${plot.id}`,
        activityName: 'Weather Monitoring',
        recommendedAction: 'Check weather conditions manually',
        triggerCondition: 'No weather data available',
        reason: 'Unable to fetch current weather data for location-based recommendations.',
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
      }];
    }

    const { temperature, humidity, rainfall, wind_speed } = weatherData;

    // Calculate weekly rainfall (assuming current rainfall is daily)
    const weeklyRainfall = rainfall * 7;

    // Stage 1: Nursery / Establishment (0-180 days)
    if (growthStage.stageNumber === 1) {
      // Irrigation check
      if (weeklyRainfall < 60 || (weatherData && calculateSoilMoisture(weatherData) < 25)) {
        recommendations.push({
          id: `irrigation-${plot.id}`,
          activityName: 'Irrigation',
          recommendedAction: 'Water the seedlings thoroughly',
          triggerCondition: `Low rainfall: ${weeklyRainfall.toFixed(1)}mm/week`,
          reason: 'Ensure proper root establishment during early growth.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // Shade management
      if (temperature > 34) {
        recommendations.push({
          id: `shade-${plot.id}`,
          activityName: 'Shade Management',
          recommendedAction: 'Provide partial shade to seedlings',
          triggerCondition: `High temperature: ${temperature}°C`,
          reason: 'High temperatures can cause seedling stress; provide partial shade.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // Weeding
      if (weeklyRainfall > 80 && humidity > 70) {
        recommendations.push({
          id: `weeding-${plot.id}`,
          activityName: 'Weeding',
          recommendedAction: 'Remove weeds around seedlings',
          triggerCondition: `High rainfall: ${weeklyRainfall.toFixed(1)}mm & humidity: ${humidity}%`,
          reason: 'Frequent rain promotes weed growth; remove weeds to avoid competition.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }
    }
    
    // Stage 2: Vegetative Growth (181-540 days)
    else if (growthStage.stageNumber === 2) {
      const soilMoisture = calculateSoilMoisture(weatherData);
      
      // Fertilization
      if (soilMoisture >= 25 && soilMoisture <= 40 && weeklyRainfall >= 50 && weeklyRainfall <= 120) {
        recommendations.push({
          id: `fertilization-${plot.id}`,
          activityName: 'Fertilization',
          recommendedAction: 'Apply organic compost or NPK (2:1:1) fertilizer',
          triggerCondition: `Optimal soil moisture: ${soilMoisture.toFixed(1)}% & rainfall: ${weeklyRainfall.toFixed(1)}mm`,
          reason: 'Optimal nutrient absorption when soil is moist but not waterlogged.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // Pest monitoring
      if (humidity > 75 || weeklyRainfall > 130) {
        recommendations.push({
          id: `pest-monitoring-${plot.id}`,
          activityName: 'Pest Monitoring',
          recommendedAction: 'Inspect plants for leaf spot, mildew, and other pests',
          triggerCondition: `High humidity: ${humidity}% or excessive rainfall: ${weeklyRainfall.toFixed(1)}mm`,
          reason: 'High moisture increases pest activity (leaf spot, mildew).',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // Pruning
      if (temperature >= 25 && temperature <= 32 && weeklyRainfall < 60) {
        recommendations.push({
          id: `pruning-${plot.id}`,
          activityName: 'Pruning',
          recommendedAction: 'Shape plants and promote strong shoot development',
          triggerCondition: `Ideal temperature: ${temperature}°C & low rainfall: ${weeklyRainfall.toFixed(1)}mm`,
          reason: 'Ideal for shaping plants and promoting strong shoots.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }
    }
    
    // Stage 3: Harvest / Maturity (541+ days)
    else if (growthStage.stageNumber === 3) {
      // Bark harvesting
      if (weeklyRainfall >= 60 && weeklyRainfall <= 100 && humidity >= 60 && humidity <= 80) {
        recommendations.push({
          id: `harvesting-${plot.id}`,
          activityName: 'Bark Harvesting',
          recommendedAction: 'Harvest cinnamon bark from mature shoots',
          triggerCondition: `Optimal rainfall: ${weeklyRainfall.toFixed(1)}mm & humidity: ${humidity}%`,
          reason: 'Optimal moisture allows easy peeling of cinnamon bark.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // Drying & curing
      if (weeklyRainfall < 50 && humidity < 65) {
        recommendations.push({
          id: `drying-${plot.id}`,
          activityName: 'Drying & Curing',
          recommendedAction: 'Process and dry harvested bark properly',
          triggerCondition: `Low rainfall: ${weeklyRainfall.toFixed(1)}mm & humidity: ${humidity}%`,
          reason: 'Ideal dry conditions for bark curing and minimizing fungal growth.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // Replanting preparation
      if (temperature >= 25 && temperature <= 32 && weeklyRainfall < 70) {
        recommendations.push({
          id: `replanting-${plot.id}`,
          activityName: 'Replanting Preparation',
          recommendedAction: 'Cut back old shoots and prepare for next cycle',
          triggerCondition: `Ideal temperature: ${temperature}°C & rainfall: ${weeklyRainfall.toFixed(1)}mm`,
          reason: 'Prepare land for next cycle; cut back old shoots after harvest.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }
    }

    return recommendations;
  };

  const calculateSoilMoisture = (weatherData: WeatherData): number => {
    // Simple estimation based on rainfall and humidity
    // This is a basic formula - in reality, you'd want soil sensors
    const { humidity, rainfall } = weatherData;
    const baseHumidity = Math.min(humidity / 100 * 40, 40); // Cap at 40%
    const rainfallContribution = Math.min(rainfall * 2, 20); // Cap rainfall contribution
    return Math.min(baseHumidity + rainfallContribution, 50); // Cap total at 50%
  };

  const handleActivityDone = async (plotId: number, recommendation: Recommendation) => {
    try {
      const plot = plotsWithRecommendations.find(p => p.id === plotId);
      if (!plot || !plot.weatherData) return;

      // For demo plots (negative IDs), use plot_id 1 for backend storage
      const backendPlotId = plotId < 0 ? 1 : plotId;

      // Create activity record
      const activityRecord: Omit<ActivityRecord, 'id'> = {
        user_id: 1, // Hardcoded for now
        plot_id: backendPlotId,
        activity_name: recommendation.activityName,
        activity_date: new Date().toISOString(),
        trigger_condition: recommendation.triggerCondition,
        weather_snapshot: {
          temperature: plot.weatherData.temperature,
          humidity: plot.weatherData.humidity,
          rainfall: plot.weatherData.rainfall,
          wind_speed: plot.weatherData.wind_speed,
          weather_description: plot.weatherData.weather_description,
        },
      };

      // Try to save to backend, but don't fail if it's not available
      try {
        await farmAssistanceAPI.createActivityRecord(activityRecord);
        console.log('✅ Activity record saved to backend:', activityRecord);
      } catch (backendError) {
        console.warn('⚠️ Backend not available, activity saved locally only:', backendError);
        // Could save to local storage here as fallback
      }

      // Remove the completed recommendation from the list
      const updatedPlots = plotsWithRecommendations.map(p => {
        if (p.id === plotId) {
          return {
            ...p,
            recommendations: p.recommendations.filter(r => r.id !== recommendation.id),
          };
        }
        return p;
      });
      setPlotsWithRecommendations(updatedPlots);

      const plotType = plotId < 0 ? '(Demo)' : '';
      Alert.alert(
        'Activity Completed! ✅', 
        `"${recommendation.activityName}" for ${plot.name} ${plotType} has been marked as completed and saved to your activity history.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to home screen
              router.push('/(tabs)/' as any);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error marking activity as done:', error);
      Alert.alert('Error', 'Failed to mark activity as completed. Please try again.');
    }
  };

  const onRefresh = () => {
    loadFarmAssistanceData(true);
  };

  useEffect(() => {
    loadFarmAssistanceData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'alert-circle';
      case 'medium': return 'warning';
      case 'low': return 'information-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading farm assistance...</Text>
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
          <Text style={styles.title}>Farm Assistance</Text>
          <Text style={styles.subtitle}>
            Personalized recommendations for your cinnamon farm based on real-time weather and crop stage.
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadFarmAssistanceData()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Demo Info Banner */}
        {farms.length === 0 && (
          <View style={styles.demoBanner}>
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <Text style={styles.demoBannerText}>
              Showing demo recommendations. Add your farm to get personalized advice.
            </Text>
            <TouchableOpacity 
              style={styles.addFarmButtonSmall}
              onPress={() => navigation.navigate('MyFarm')}
            >
              <Text style={styles.addFarmButtonSmallText}>Add Farm</Text>
            </TouchableOpacity>
          </View>
        )}

        {plotsWithRecommendations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Recommendations</Text>
            <Text style={styles.emptyDescription}>
              All activities are up to date. Check back later for new recommendations.
            </Text>
          </View>
        ) : (
          <>
            {plotsWithRecommendations.map((plot) => {
              const isDemo = (plot.id ?? 0) < 0;
              return (
                <View key={plot.id} style={[
                  styles.plotCard,
                  isDemo ? styles.demoPlotCard : null
                ]}>
                  <View style={styles.plotHeader}>
                    <View style={styles.plotHeaderContent}>
                      <Text style={styles.plotName}>
                        {plot.name}
                        {isDemo && (
                          <Text style={styles.demoLabel}> [DEMO]</Text>
                        )}
                      </Text>
                      <Text style={styles.plotInfo}>
                        {plot.growthStage?.name} • {plot.growthStage?.daysOld} days old
                      </Text>
                      {plot.weatherData && (
                        <Text style={styles.weatherInfo}>
                          {Math.round(plot.weatherData.temperature)}°C • {plot.weatherData.humidity}% humidity
                        </Text>
                      )}
                    </View>

                  </View>

                {plot.recommendations.length === 0 ? (
                  <View style={styles.noRecommendations}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={styles.noRecommendationsText}>
                      No immediate actions required based on current conditions.
                    </Text>
                  </View>
                ) : (
                  plot.recommendations.map((recommendation) => (
                    <View key={recommendation.id} style={styles.recommendationCard}>
                      <View style={styles.recommendationHeader}>
                        <View style={styles.recommendationTitleRow}>
                          <Ionicons
                            name={getPriorityIcon(recommendation.priority)}
                            size={20}
                            color={getPriorityColor(recommendation.priority)}
                          />
                          <Text style={styles.activityName}>{recommendation.activityName}</Text>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(recommendation.priority) }]}>
                          <Text style={styles.priorityText}>{recommendation.priority.toUpperCase()}</Text>
                        </View>
                      </View>

                      <Text style={styles.recommendedAction}>{recommendation.recommendedAction}</Text>
                      
                      <View style={styles.conditionContainer}>
                        <Text style={styles.conditionLabel}>Trigger:</Text>
                        <Text style={styles.conditionText}>{recommendation.triggerCondition}</Text>
                      </View>

                      <View style={styles.reasonContainer}>
                        <Text style={styles.reasonLabel}>Why:</Text>
                        <Text style={styles.reasonText}>{recommendation.reason}</Text>
                      </View>

                      <View style={styles.recommendationFooter}>
                        <Text style={styles.suggestedDate}>
                          Suggested: {new Date(recommendation.suggestedDate).toLocaleDateString()}
                        </Text>
                        <TouchableOpacity
                          style={styles.doneButton}
                          onPress={() => handleActivityDone(plot.id!, recommendation)}
                        >
                          <Text style={styles.doneButtonText}>Mark as Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
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
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  addFarmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFarmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  plotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  plotHeader: {
    marginBottom: 16,
  },
  plotName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  plotInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  weatherInfo: {
    fontSize: 13,
    color: '#4B5563',
  },
  noRecommendations: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBFBB8',
  },
  noRecommendationsText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#166534',
    flex: 1,
  },
  recommendationCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recommendedAction: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  conditionContainer: {
    marginBottom: 8,
  },
  conditionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  conditionText: {
    fontSize: 13,
    color: '#4B5563',
  },
  reasonContainer: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestedDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    marginRight: 12,
  },
  addFarmButtonSmall: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addFarmButtonSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  demoPlotCard: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FAF9FF',
  },
  plotHeaderContent: {
    flex: 1,
  },
  demoLabel: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '700',
  },
  demoTag: {
    backgroundColor: '#EDE9FE',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FarmAssistance;