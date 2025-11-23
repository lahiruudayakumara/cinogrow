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
  plot_name?: string;
  formatted_date?: string;
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
  const [recentActivities, setRecentActivities] = useState<ActivityRecord[]>([]);

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







  const loadRecentActivities = async () => {
    try {
      const USER_ID = 1; // Mock user ID
      const activitiesResponse = await farmAssistanceAPI.getHomeActivityHistory(USER_ID, 10);
      
      if (activitiesResponse.success && activitiesResponse.data) {
        console.log('✅ Loaded recent activities:', activitiesResponse.data);
        setRecentActivities(activitiesResponse.data);
      } else {
        console.warn('Failed to load recent activities:', activitiesResponse.message);
        setRecentActivities([]);
      }
    } catch (error) {
      console.warn('Error loading recent activities:', error);
      setRecentActivities([]);
    }
  };

  // Function to group activities by plot
  const groupActivitiesByPlot = (activities: any[]) => {
    const grouped = activities.reduce((acc: any, activity) => {
      const plotKey = activity.plot_name || `Plot ${activity.plot_id}`;
      if (!acc[plotKey]) {
        acc[plotKey] = [];
      }
      acc[plotKey].push(activity);
      return acc;
    }, {});
    
    return grouped;
  };

  const loadFarmAssistanceData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const USER_ID = 1; // Mock user ID

      // Fetch all farms
      const farmsData = await farmAPI.getFarms();
      setFarms(farmsData);

      // Initialize plots array (no demo data)
      const allPlotsWithRecommendations: PlotWithRecommendations[] = [];

      // Try to get plots with age information from the new endpoint
      try {
        const plotsWithAgeResponse = await farmAssistanceAPI.getPlotsWithAge(USER_ID);
        if (plotsWithAgeResponse.success && plotsWithAgeResponse.data) {
          console.log('📊 Using enhanced plot data with age calculations');
          
          for (const plotData of plotsWithAgeResponse.data) {
            // Get the farm for weather data
            const farm = farmsData.find(f => f.id === plotData.farm_id);
            
            if (farm) {
              // Fetch weather data for farm location (with caching)
              let weatherData: WeatherData | undefined;
              try {
                // Try to get cached weather first
                const cachedWeather = await getCachedWeather(plotData.farm_id);
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

              // Create a Plot object from plotData
              const plot: Plot = {
                id: plotData.plot_id,
                farm_id: plotData.farm_id,
                name: plotData.plot_name,
                area: plotData.plot_area,
                status: plotData.plot_status as any,
                crop_type: 'Cinnamon',
                planting_date: plotData.planted_date,
                progress_percentage: 50 // Default progress based on age stage
              };

              // Use the growth stage from backend calculation
              const growthStage = plotData.growth_stage;

              console.log('🏗️ Enhanced plot data:', {
                plotName: plot.name,
                growthStage,
                daysOld: growthStage?.days_old,
                plantedDate: plotData.planted_date
              });

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
      } catch (enhancedDataError) {
        console.warn('Could not load enhanced plot data, falling back to original method:', enhancedDataError);
        
        // Fallback to original method if enhanced endpoint fails
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
      }

      setPlotsWithRecommendations(allPlotsWithRecommendations);
      
      // Load recent activities
      await loadRecentActivities();
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

  // Function to get additional stage-specific recommendations
  const getAdditionalStageRecommendations = (growthStage: any, weatherData: any, plot: any) => {
    const recommendations = [];
    const plantAge = growthStage.daysOld || (growthStage as any)?.days_old || 0;
    const currentDate = new Date().toISOString().split('T')[0];

    // Seedling Stage (0-90 days) - Focus on establishment
    if (plantAge <= 90) {
      recommendations.push(
        {
          id: `soil-check-${plot.id}`,
          activityName: 'Soil pH Testing',
          recommendedAction: 'Test soil pH levels - cinnamon thrives in slightly acidic soil (pH 6.0-6.8)',
          triggerCondition: 'Seedling establishment phase',
          reason: 'Proper soil pH ensures optimal nutrient uptake during critical early growth',
          suggestedDate: currentDate,
          priority: 'high' as const,
        },
        {
          id: `shade-setup-${plot.id}`,
          activityName: 'Shade Management',
          recommendedAction: 'Provide 70-80% shade using natural or artificial shade cloth',
          triggerCondition: 'Young seedling protection needed',
          reason: 'Seedlings are sensitive to direct sunlight and need gradual acclimatization',
          suggestedDate: currentDate,
          priority: 'medium' as const,
        },
        {
          id: `weed-control-${plot.id}`,
          activityName: 'Weed Control',
          recommendedAction: 'Manually remove weeds around seedlings, maintain 1m weed-free circle',
          triggerCondition: 'Competition prevention',
          reason: 'Weeds compete for nutrients and water that are crucial for seedling development',
          suggestedDate: currentDate,
          priority: 'medium' as const,
        }
      );
    }
    // Young Plant Stage (90-365 days) - Focus on growth
    else if (plantAge <= 365) {
      recommendations.push(
        {
          id: `training-pruning-${plot.id}`,
          activityName: 'Training and Pruning',
          recommendedAction: 'Prune lower branches up to 60cm height, maintain single leader stem',
          triggerCondition: 'Shape development phase',
          reason: 'Proper training creates strong trunk structure and improves bark quality',
          suggestedDate: currentDate,
          priority: 'high' as const,
        },
        {
          id: `mulching-${plot.id}`,
          activityName: 'Organic Mulching',
          recommendedAction: 'Apply 5-7cm thick organic mulch around base, keep 15cm away from trunk',
          triggerCondition: 'Moisture and temperature regulation',
          reason: 'Mulch conserves moisture, controls temperature, and suppresses weed growth',
          suggestedDate: currentDate,
          priority: 'medium' as const,
        },
        {
          id: `support-stakes-${plot.id}`,
          activityName: 'Support Staking',
          recommendedAction: 'Install bamboo stakes for support, tie loosely with soft material',
          triggerCondition: 'Structural support needed',
          reason: 'Young plants need support to develop straight trunks and resist wind damage',
          suggestedDate: currentDate,
          priority: 'medium' as const,
        }
      );
    }
    // Mature Plant Stage (365+ days) - Focus on production
    else {
      recommendations.push(
        {
          id: `bark-assessment-${plot.id}`,
          activityName: 'Bark Quality Assessment',
          recommendedAction: 'Inspect bark thickness and quality, check for optimal harvest timing',
          triggerCondition: 'Production readiness evaluation',
          reason: 'Regular assessment ensures harvest at peak bark quality and oil content',
          suggestedDate: currentDate,
          priority: 'high' as const,
        },
        {
          id: `canopy-management-${plot.id}`,
          activityName: 'Canopy Management',
          recommendedAction: 'Prune to maintain 3-4m height, remove dead/diseased branches',
          triggerCondition: 'Productivity optimization',
          reason: 'Proper canopy management improves air circulation and bark accessibility',
          suggestedDate: currentDate,
          priority: 'medium' as const,
        },
        {
          id: `harvest-preparation-${plot.id}`,
          activityName: 'Harvest Preparation',
          recommendedAction: 'Prepare harvesting tools, plan bark peeling schedule for optimal weather',
          triggerCondition: 'Production phase management',
          reason: 'Proper preparation ensures efficient harvest and maximum bark quality',
          suggestedDate: currentDate,
          priority: 'medium' as const,
        }
      );
    }

    return recommendations;
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
        recommendedAction: 'Check weather conditions manually and monitor plant health',
        triggerCondition: 'No weather data available',
        reason: 'Unable to fetch current weather data for location-based recommendations.',
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'high',
      }];
    }

    const { temperature, humidity, rainfall, wind_speed } = weatherData;
    const weeklyRainfall = rainfall * 7;
    const soilMoisture = calculateSoilMoisture(weatherData);

    // STAGE 1: Nursery / Establishment (0-180 days) - CRITICAL CARE PERIOD
    if (growthStage.stageNumber === 1) {
      const daysOld = growthStage.daysOld || (growthStage as any)?.days_old || 0;
      
      // MANDATORY: Water management (always required for seedlings)
      if (weeklyRainfall < 60 || soilMoisture < 30) {
        recommendations.push({
          id: `irrigation-${plot.id}`,
          activityName: 'Critical Irrigation',
          recommendedAction: `Water seedlings daily with 5-8L per plant. Check soil moisture 2cm deep.`,
          triggerCondition: `Low rainfall: ${weeklyRainfall.toFixed(1)}mm/week, soil moisture: ${soilMoisture.toFixed(1)}%`,
          reason: 'Young seedlings (under 6 months) are extremely vulnerable to water stress during root establishment.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else if (weeklyRainfall > 100) {
        recommendations.push({
          id: `drainage-${plot.id}`,
          activityName: 'Drainage Management',
          recommendedAction: 'Ensure proper drainage around seedlings to prevent waterlogging',
          triggerCondition: `Excessive rainfall: ${weeklyRainfall.toFixed(1)}mm/week`,
          reason: 'Waterlogged conditions can cause root rot in young cinnamon plants.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else {
        recommendations.push({
          id: `water-monitoring-${plot.id}`,
          activityName: 'Water Monitoring',
          recommendedAction: 'Monitor soil moisture daily, water if top 2cm is dry',
          triggerCondition: `Moderate rainfall: ${weeklyRainfall.toFixed(1)}mm/week`,
          reason: 'Consistent moisture is critical for seedling survival and growth.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Temperature protection
      if (temperature > 32) {
        recommendations.push({
          id: `shade-${plot.id}`,
          activityName: 'Heat Protection',
          recommendedAction: 'Install 50-70% shade cloth, water early morning and evening',
          triggerCondition: `High temperature: ${temperature}°C`,
          reason: 'Young seedlings cannot tolerate high temperatures - can cause permanent damage.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else if (temperature < 20) {
        recommendations.push({
          id: `cold-protection-${plot.id}`,
          activityName: 'Cold Protection',
          recommendedAction: 'Protect seedlings with plastic covers during cold nights',
          triggerCondition: `Low temperature: ${temperature}°C`,
          reason: 'Cold stress can slow growth and weaken young cinnamon plants.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // MANDATORY: Weed control (always needed)
      recommendations.push({
        id: `weeding-${plot.id}`,
        activityName: 'Weed Control',
        recommendedAction: 'Remove all weeds within 1m radius of each seedling',
        triggerCondition: `Seedling competition management - ${growthStage.daysOld || (growthStage as any)?.days_old || 0} days old`,
        reason: 'Weeds compete with young seedlings for nutrients and water, significantly affecting growth.',
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
      });
    }
    
    // STAGE 2: Vegetative Growth (181-540 days) - DEVELOPMENT PERIOD
    else if (growthStage.stageNumber === 2) {
      
      // MANDATORY: Nutrition management
      const daysOld = growthStage.daysOld || (growthStage as any)?.days_old || 0;
      const monthsOld = Math.floor(daysOld / 30);
      if (soilMoisture >= 25 && weeklyRainfall >= 30) {
        recommendations.push({
          id: `fertilization-${plot.id}`,
          activityName: 'Balanced Fertilization',
          recommendedAction: `Apply NPK fertilizer (2:1:1 ratio) - 150-200g per plant. Add organic compost monthly.`,
          triggerCondition: `Good soil conditions: ${soilMoisture.toFixed(1)}% moisture, ${weeklyRainfall.toFixed(1)}mm rainfall`,
          reason: `Plants at ${monthsOld} months need regular nutrition for strong branch development and root expansion.`,
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else {
        recommendations.push({
          id: `organic-nutrition-${plot.id}`,
          activityName: 'Organic Nutrition',
          recommendedAction: 'Apply well-decomposed compost and mulch around plants',
          triggerCondition: `Suboptimal soil conditions for chemical fertilizer application`,
          reason: 'Organic matter improves soil structure and provides slow-release nutrients.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Pest and disease monitoring
      if (humidity > 70) {
        recommendations.push({
          id: `pest-monitoring-${plot.id}`,
          activityName: 'Disease Prevention',
          recommendedAction: 'Inspect leaves weekly for fungal spots, scale insects, and stem borers',
          triggerCondition: `High humidity: ${humidity}% promotes disease development`,
          reason: 'High humidity creates favorable conditions for cinnamon leaf spot and other fungal diseases.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else {
        recommendations.push({
          id: `routine-monitoring-${plot.id}`,
          activityName: 'Plant Health Check',
          recommendedAction: 'Weekly inspection for pests, diseases, and nutrient deficiencies',
          triggerCondition: `Routine monitoring for ${monthsOld}-month-old plants`,
          reason: 'Regular monitoring prevents major pest and disease outbreaks.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Structural development
      if (daysOld > 300) {
        recommendations.push({
          id: `pruning-${plot.id}`,
          activityName: 'Structural Pruning',
          recommendedAction: 'Shape main stems, remove weak branches, promote 4-6 strong shoots',
          triggerCondition: `Plants ready for structure development (${monthsOld} months old)`,
          reason: 'Proper structure now determines future harvest quality and quantity.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: temperature >= 25 && temperature <= 30 ? 'high' : 'medium',
        });
      }
    }
    
    // STAGE 3: Harvest / Maturity (541+ days) - PRODUCTION PERIOD
    else if (growthStage.stageNumber === 3) {
      const daysOld = growthStage.daysOld || (growthStage as any)?.days_old || 0;
      const yearsOld = Math.floor(daysOld / 365);
      
      // MANDATORY: Harvest readiness assessment
      if (daysOld >= 730) { // 2+ years
        if (humidity >= 60 && humidity <= 80 && weeklyRainfall >= 40 && weeklyRainfall <= 100) {
          recommendations.push({
            id: `harvesting-${plot.id}`,
            activityName: 'Bark Harvesting',
            recommendedAction: `Harvest shoots 1.2-2.0cm diameter. Process bark within 6 hours.`,
            triggerCondition: `Optimal harvest conditions: ${humidity}% humidity, ${weeklyRainfall.toFixed(1)}mm weekly rain`,
            reason: `Plants are ${yearsOld} years old - perfect age for premium quality bark harvesting.`,
            suggestedDate: new Date().toISOString().split('T')[0],
            priority: 'high',
          });
        } else {
          recommendations.push({
            id: `harvest-prep-${plot.id}`,
            activityName: 'Harvest Preparation',
            recommendedAction: 'Prepare harvesting tools and drying areas, monitor weather for optimal conditions',
            triggerCondition: `Suboptimal harvest conditions - waiting for better weather`,
            reason: 'Harvest timing affects bark quality - wait for proper humidity and minimal rain.',
            suggestedDate: new Date().toISOString().split('T')[0],
            priority: 'medium',
          });
        }
      } else {
        recommendations.push({
          id: `pre-harvest-${plot.id}`,
          activityName: 'Pre-Harvest Management',
          recommendedAction: 'Continue regular care, prepare for harvesting in coming months',
          triggerCondition: `Plants approaching harvest maturity (${yearsOld}.${Math.floor((daysOld % 365) / 30)} years old)`,
          reason: 'Plants need continued care to ensure optimal bark development for future harvest.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Quality management for mature plants
      if (weeklyRainfall < 30 && humidity < 60) {
        recommendations.push({
          id: `quality-drying-${plot.id}`,
          activityName: 'Post-Harvest Processing',
          recommendedAction: 'Ideal conditions for bark drying and curing - process any harvested bark',
          triggerCondition: `Dry conditions: ${weeklyRainfall.toFixed(1)}mm rain, ${humidity}% humidity`,
          reason: 'Low humidity prevents fungal growth during bark processing and ensures premium quality.',
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // MANDATORY: Regeneration management
      recommendations.push({
        id: `regeneration-${plot.id}`,
        activityName: 'Coppice Management',
        recommendedAction: 'Monitor shoot regrowth, apply organic fertilizer to cut stumps',
        triggerCondition: `Mature plant regeneration cycle management`,
        reason: 'Proper post-harvest care ensures strong regrowth for next harvest cycle in 18-24 months.',
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
      });
    }

    // Add additional stage-specific general recommendations if needed
    const additionalRecommendations = getAdditionalStageRecommendations(growthStage, weatherData, plot);
    recommendations.push(...additionalRecommendations);

    // Ensure at least one recommendation exists for every stage
    if (recommendations.length === 0) {
      recommendations.push({
        id: `default-${plot.id}`,
        activityName: 'General Plant Care',
        recommendedAction: `Monitor plant health daily, maintain proper spacing and cleanliness around plants`,
        triggerCondition: `Standard care for ${growthStage.name.toLowerCase()} stage`,
        reason: `Regular monitoring and maintenance is essential for healthy cinnamon cultivation at ${growthStage.daysOld || (growthStage as any)?.days_old || 0} days old.`,
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
      });
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

      // Use the actual plot ID for backend storage
      const backendPlotId = plotId;

      // Create activity record with exact current timestamp
      const currentDateTime = new Date();
      const activityRecord = {
        user_id: 1, // Hardcoded for now - matches backend field name
        plot_id: backendPlotId,
        activity_name: recommendation.activityName,
        activity_date: currentDateTime.toISOString(), // Backend expects activity_date not completed_at
        trigger_condition: recommendation.triggerCondition,
        weather_snapshot: {
          temperature: plot.weatherData.temperature,
          humidity: plot.weatherData.humidity,
          rainfall: plot.weatherData.rainfall || 0,
          wind_speed: plot.weatherData.wind_speed || 0,
          weather_description: plot.weatherData.weather_description || 'Unknown' // Backend expects weather_description not conditions
        },
      };

      console.log('📝 Recording activity at exact time:', {
        activity: recommendation.activityName,
        timestamp: currentDateTime.toISOString(),
        localTime: currentDateTime.toLocaleString(),
        plot: plot.name
      });

      // Try to save to backend with better error handling
      let saveSuccessful = false;
      try {
        console.log('🔄 Attempting to save activity record to backend...', activityRecord);
        const result = await farmAssistanceAPI.createActivityRecord(activityRecord);
        
        if (result.success) {
          console.log('✅ Activity record saved to backend successfully');
          saveSuccessful = true;
        } else {
          console.warn('⚠️ Backend returned error:', result.message);
          throw new Error(result.message);
        }
      } catch (backendError) {
        console.error('❌ Error creating activity record:', backendError);
        
        // Show more specific error message
        const errorMessage = backendError instanceof Error ? backendError.message : 'Unknown error';
        
        // Don't prevent UI update, but show warning
        Alert.alert(
          'Partial Success ⚠️',
          `Activity completed but could not save to server: ${errorMessage}\n\nThe activity is marked as done in your current session.`,
          [{ text: 'OK' }]
        );
      }

      // Always update the UI regardless of backend save status - remove completed recommendation
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
      
      console.log('🗑️ Removed recommendation from UI:', {
        recommendationId: recommendation.id,
        activityName: recommendation.activityName,
        plotId: plotId
      });

      // Reload recent activities to show the new one
      if (saveSuccessful) {
        await loadRecentActivities();
      }

      const saveStatus = saveSuccessful ? 'and saved to your activity history' : '(saved locally)';
      
      Alert.alert(
        'Activity Completed! ✅', 
        `"${recommendation.activityName}" for ${plot.name} has been marked as completed ${saveStatus}.`
      );
    } catch (error) {
      console.error('❌ Unexpected error in handleActivityDone:', error);
      Alert.alert('Error', `Failed to mark activity as completed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        {/* No Farm Info */}
        {farms.length === 0 && (
          <View style={styles.noFarmBanner}>
            <Ionicons name="leaf-outline" size={24} color="#6B7280" />
            <Text style={styles.noFarmText}>
              No farms found. Add your farm to get personalized weather-based recommendations.
            </Text>
            <TouchableOpacity 
              style={styles.addFarmButton}
              onPress={() => navigation.navigate('MyFarm')}
            >
              <Text style={styles.addFarmButtonText}>Add Your Farm</Text>
            </TouchableOpacity>
          </View>
        )}

        {plotsWithRecommendations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Plot Data Available</Text>
            <Text style={styles.emptyDescription}>
              Add farms and planting records to get weather-based recommendations for your cinnamon plots.
            </Text>
          </View>
        ) : (
          <>
            {plotsWithRecommendations.map((plot) => {
              return (
                <View key={plot.id} style={styles.plotCard}>
                  <View style={styles.plotHeader}>
                    <View style={styles.plotHeaderContent}>
                      <Text style={styles.plotName}>
                        {plot.name}
                      </Text>
                      <View style={styles.plotInfoContainer}>
                        <View style={styles.ageContainer}>
                          <Text style={styles.ageDays}>
                            {plot.growthStage?.daysOld || (plot.growthStage as any)?.days_old || 0}
                          </Text>
                          <Text style={styles.ageLabel}>days old</Text>
                        </View>
                        <View style={styles.plotDetailsContainer}>
                          <Text style={styles.plotStage}>{plot.growthStage?.name}</Text>
                          <Text style={styles.plotArea}>{plot.area} hectares</Text>
                        </View>
                      </View>
                      {plot.weatherData && (
                        <Text style={styles.weatherInfo}>
                          🌡️ {Math.round(plot.weatherData.temperature)}°C • 💧 {plot.weatherData.humidity}% humidity • 🌧️ {plot.weatherData.rainfall}mm rain
                        </Text>
                      )}
                      <Text style={styles.progressInfo}>
                        Progress: {plot.progress_percentage}% • {plot.crop_type}
                      </Text>
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

        {/* Recent Activities Section */}
        {recentActivities.length > 0 && (
          <View style={styles.recentActivitiesSection}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            {(() => {
              const groupedActivities = groupActivitiesByPlot(recentActivities.slice(0, 10));
              
              // Get appropriate icon based on activity type
              const getActivityIcon = (activityName: string) => {
                const name = activityName.toLowerCase();
                if (name.includes('irrigation') || name.includes('water')) return 'water';
                if (name.includes('fertilizer') || name.includes('fertiliz')) return 'leaf';
                if (name.includes('harvest')) return 'cut';
                if (name.includes('weed')) return 'flower';
                if (name.includes('shade') || name.includes('protection')) return 'sunny';
                if (name.includes('pest') || name.includes('disease')) return 'bug';
                if (name.includes('pruning')) return 'cut-outline';
                if (name.includes('soil') || name.includes('ph')) return 'flask';
                if (name.includes('mulch')) return 'layers';
                if (name.includes('support') || name.includes('stak')) return 'construct';
                if (name.includes('bark') || name.includes('assessment')) return 'eye';
                if (name.includes('canopy') || name.includes('management')) return 'git-branch';
                return 'checkmark-circle';
              };

              const getActivityColor = (activityName: string) => {
                const name = activityName.toLowerCase();
                if (name.includes('irrigation') || name.includes('water')) return '#3B82F6';
                if (name.includes('fertilizer')) return '#10B981';
                if (name.includes('harvest')) return '#F59E0B';
                if (name.includes('weed')) return '#8B5CF6';
                if (name.includes('shade') || name.includes('protection')) return '#EF4444';
                if (name.includes('pest') || name.includes('disease')) return '#DC2626';
                if (name.includes('pruning')) return '#6366F1';
                if (name.includes('soil') || name.includes('ph')) return '#92400E';
                if (name.includes('mulch')) return '#059669';
                if (name.includes('support') || name.includes('stak')) return '#7C2D12';
                if (name.includes('bark') || name.includes('assessment')) return '#1E40AF';
                if (name.includes('canopy') || name.includes('management')) return '#065F46';
                return '#10B981';
              };

              return Object.entries(groupedActivities).map(([plotName, activities]: [string, any]) => (
                <View key={plotName} style={styles.plotActivityGroup}>
                  <View style={styles.plotGroupHeader}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.plotGroupTitle}>{plotName}</Text>
                    <View style={styles.activityCount}>
                      <Text style={styles.activityCountText}>{activities.length}</Text>
                    </View>
                  </View>
                  <View style={styles.activitiesContainer}>
                    {activities.slice(0, 3).map((activity: any, index: number) => (
                      <View key={activity.id || `${plotName}-${index}`} style={[
                        styles.activityItem,
                        index === Math.min(activities.length, 3) - 1 ? { borderBottomWidth: 0 } : {}
                      ]}>
                        <View style={[styles.activityIcon, { backgroundColor: `${getActivityColor(activity.activity_name)}20` }]}>
                          <Ionicons 
                            name={getActivityIcon(activity.activity_name)} 
                            size={18} 
                            color={getActivityColor(activity.activity_name)} 
                          />
                        </View>
                        <View style={styles.activityContent}>
                          <Text style={styles.recentActivityName}>{activity.activity_name}</Text>
                          <Text style={styles.activityDate}>
                            {activity.formatted_date ? activity.formatted_date : 
                             new Date(activity.activity_date).toLocaleDateString('en-US', {
                               month: 'short',
                               day: 'numeric',
                               hour: '2-digit',
                               minute: '2-digit'
                             })}
                          </Text>
                          <Text style={styles.activityTrigger} numberOfLines={2}>
                            {activity.trigger_condition}
                          </Text>
                        </View>
                        <View style={styles.activityStatus}>
                          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        </View>
                      </View>
                    ))}
                    {activities.length > 3 && (
                      <Text style={styles.moreActivitiesText}>
                        +{activities.length - 3} more activities
                      </Text>
                    )}
                  </View>
                </View>
              ));
            })()}
          </View>
        )}

        {/* Contact Information Section */}
        <View style={styles.contactSection}>
          <View style={styles.contactHeader}>
            <Ionicons name="call" size={20} color="#4CAF50" />
            <Text style={styles.contactTitle}>Need Further Assistance?</Text>
          </View>
          <Text style={styles.contactDescription}>
            Contact the Cinnamon Research Center for expert advice and support
          </Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="business" size={16} color="#6B7280" />
              <Text style={styles.contactText}>Cinnamon Research Center - Sri Lanka</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={16} color="#6B7280" />
              <Text style={styles.contactText}>+94-11-2696734</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={16} color="#6B7280" />
              <Text style={styles.contactText}>info@cinnamonresearch.lk</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.contactText}>Monday - Friday: 8:00 AM - 4:30 PM</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.contactButton}
            onPress={async () => {
              try {
                const contactInfo = await farmAssistanceAPI.getContactInfo();
                if (contactInfo.success) {
                  Alert.alert(
                    'Contact Information',
                    `For expert assistance:\n\n📞 Phone: ${contactInfo.data.phone}\n📧 Email: ${contactInfo.data.email}\n🌐 Website: ${contactInfo.data.website}\n\nWorking Hours: ${contactInfo.data.working_hours}`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                Alert.alert('Contact Info', 'Phone: +94-11-2696734\nEmail: info@cinnamonresearch.lk');
              }
            }}
          >
            <Text style={styles.contactButtonText}>View Full Contact Info</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
  progressInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  plotInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ageContainer: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 12,
    minWidth: 80,
  },
  ageDays: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4338CA',
    lineHeight: 24,
  },
  ageLabel: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plotDetailsContainer: {
    flex: 1,
  },
  plotStage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  plotArea: {
    fontSize: 14,
    color: '#6B7280',
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
  noFarmBanner: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noFarmText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 22,
  },
  addFarmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFarmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  plotHeaderContent: {
    flex: 1,
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
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
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  contactButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  // Recent Activities Styles
  recentActivitiesSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  activitiesContainer: {
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
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  recentActivityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  activityTrigger: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  activityStatus: {
    marginLeft: 8,
  },

  // Plot Activity Group Styles
  plotActivityGroup: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  plotGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  plotGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  activityCount: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activityCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moreActivitiesText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },

});

export default FarmAssistance;