import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../../navigation/YieldWeatherNavigator';

const { width } = Dimensions.get('window');

import { weatherAPI, WeatherData } from '../../../services/yield_weather/weatherAPI';
import { farmAPI, Farm, Plot } from '../../../services/yield_weather/farmAPI';
import locationService from '../../../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

// Farm Assistance API imports
// If import fails, the types are defined inline as a fallback
let farmAssistanceAPI: any;
try {
  // Dynamic import as fallback for module resolution issues
  const farmAssistanceModule = require('../../../services/yield_weather/farmAssistanceAPI');
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
  moduleType?: 'fertilizer' | 'oil-yield' | 'pest-disease' | 'yield-predictor';
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plotsWithRecommendations, setPlotsWithRecommendations] = useState<PlotWithRecommendations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityRecord[]>([]);
  
  // New states for plot selection and filtering
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState<'high' | 'medium' | 'low' | null>(null);

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

              // Normalize the growth stage from backend to ensure consistent structure
              const growthStage = normalizeGrowthStage(plotData.growth_stage, plotData.planted_date);

              console.log('🏗️ Enhanced plot data:', {
                plotName: plot.name,
                growthStage,
                daysOld: growthStage?.daysOld,
                stageNumber: growthStage?.stageNumber,
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
      return { name: t('yield_weather.farm_assistance.growth_stages.unknown'), daysOld: 0, stageNumber: 0 };
    }

    const plantDate = new Date(plantingDate);
    const currentDate = new Date();
    const daysOld = Math.floor((currentDate.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOld <= 180) {
      return { name: t('yield_weather.farm_assistance.growth_stages.nursery_establishment'), daysOld, stageNumber: 1 };
    } else if (daysOld <= 540) {
      return { name: t('yield_weather.farm_assistance.growth_stages.vegetative_growth'), daysOld, stageNumber: 2 };
    } else {
      return { name: t('yield_weather.farm_assistance.growth_stages.harvest_maturity'), daysOld, stageNumber: 3 };
    }
  };

  // Normalize growth stage data from backend to match expected format
  const normalizeGrowthStage = (backendStage: any, plantingDate?: string) => {
    if (!backendStage) {
      return calculateGrowthStage(plantingDate || null);
    }

    // Backend might send different property names, normalize them
    const daysOld = backendStage.days_old || backendStage.daysOld || 0;
    const stageName = backendStage.name || backendStage.stage_name || '';
    
    // Determine stage number based on days or existing stage property
    let stageNumber = backendStage.stage_number || backendStage.stageNumber || backendStage.stage || 0;
    
    // If stage number is not provided, calculate it from days
    if (!stageNumber && daysOld > 0) {
      if (daysOld <= 180) {
        stageNumber = 1;
      } else if (daysOld <= 540) {
        stageNumber = 2;
      } else {
        stageNumber = 3;
      }
    }

    return {
      name: stageName,
      daysOld: daysOld,
      stageNumber: stageNumber
    };
  };

  // Function to get additional stage-specific recommendations
  const getAdditionalStageRecommendations = (growthStage: any, weatherData: any, plot: any): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    const plantAge = growthStage.daysOld || (growthStage as any)?.days_old || 0;
    const currentDate = new Date().toISOString().split('T')[0];

    // Get temperature and humidity for conditional triggers
    const temperature = weatherData?.temperature || 0;
    const humidity = weatherData?.humidity || 0;
    const rainfall = (weatherData?.rainfall || 0) * 7; // Weekly rainfall

    // STAGE 1: Nursery (0-180 Days)
    if (plantAge <= 180) {
      // Activity 1: Soil Analysis (Age: 0-60 Days)
      if (plantAge <= 60) {
        recommendations.push({
          id: `soil-analysis-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.soil_analysis'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.soil_analysis.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.soil_analysis.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.soil_analysis.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'fertilizer',
        });
      }

      // Activity 2: Climate Shield (Temp > 32°C)
      if (temperature > 32) {
        recommendations.push({
          id: `climate-shield-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.climate_shield'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.climate_shield.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.climate_shield.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.climate_shield.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: undefined,
        });
      }

      // Activity 3: Manual Weeding (Monthly Routine)
      recommendations.push({
        id: `manual-weeding-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.manual_weeding'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.manual_weeding.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.manual_weeding.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.manual_weeding.reason'),
        suggestedDate: currentDate,
        priority: 'medium' as const,
        moduleType: undefined,
      });

      // Activity 4: Hydration Care (Rain < 60mm/week)
      if (rainfall < 60) {
        recommendations.push({
          id: `hydration-care-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.hydration_care'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.hydration_care.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.hydration_care.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.hydration_care.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: undefined,
        });
      }

      // Activity 5: Deficiency Scan (Age > 60 Days)
      if (plantAge > 60) {
        recommendations.push({
          id: `deficiency-scan-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.deficiency_scan'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.deficiency_scan.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.deficiency_scan.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.deficiency_scan.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'fertilizer',
        });
      }

      // Activity 6: Nursery Health (Humidity > 70%)
      if (humidity > 70) {
        recommendations.push({
          id: `nursery-health-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.nursery_health'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.nursery_health.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.nursery_health.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.nursery_health.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'pest-disease',
        });
      }
    }
    
    // STAGE 2: Vegetative (181-540 Days)
    else if (plantAge <= 540) {
      const soilMoisture = calculateSoilMoisture(weatherData);

      // Activity 7: Balanced Feeding (Soil Moisture > 25%)
      if (soilMoisture > 25) {
        recommendations.push({
          id: `balanced-feeding-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.balanced_feeding'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.balanced_feeding.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.balanced_feeding.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.balanced_feeding.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'fertilizer',
        });
      }

      // Activity 8: Training Prune (Age > 300 Days)
      if (plantAge > 300) {
        recommendations.push({
          id: `training-prune-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.training_prune'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.training_prune.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.training_prune.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.training_prune.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'yield-predictor',
        });
      }

      // Activity 9: Plot Clearance (Quarterly Routine)
      recommendations.push({
        id: `plot-clearance-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.plot_clearance'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.plot_clearance.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.plot_clearance.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.plot_clearance.reason'),
        suggestedDate: currentDate,
        priority: 'medium' as const,
        moduleType: undefined,
      });

      // Activity 10: Nutrient Optimization (Periodic/Routine)
      recommendations.push({
        id: `nutrient-optimization-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.fertilizer_optimization'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.fertilizer_optimization.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.fertilizer_optimization.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.fertilizer_optimization.reason'),
        suggestedDate: currentDate,
        priority: 'high' as const,
        moduleType: 'fertilizer',
      });

      // Activity 11: Disease Scan (After Heavy Rain / Humidity > 75%)
      if (rainfall > 60 || humidity > 75) {
        recommendations.push({
          id: `disease-scan-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.disease_scan'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.disease_scan.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.disease_scan.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.disease_scan.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'pest-disease',
        });
      }
    }
    
    // STAGE 3: Maturity & Harvest (541+ Days)
    else {
      const monthsOld = Math.floor(plantAge / 30);

      // Activity 12: Growth Forecast (Age > 18 Months / Pre-harvest)
      if (plantAge > 540) {
        recommendations.push({
          id: `growth-forecast-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.growth_forecast'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.growth_forecast.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.growth_forecast.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.growth_forecast.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'yield-predictor',
        });
      }

      // Activity 13: Canopy Thinning (Age > 18 Months)
      if (plantAge > 540) {
        recommendations.push({
          id: `canopy-thinning-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.canopy_thinning'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.canopy_thinning.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.canopy_thinning.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.canopy_thinning.reason'),
          suggestedDate: currentDate,
          priority: 'medium' as const,
          moduleType: 'yield-predictor',
        });
      }

      // Activity 14: Bark Harvesting (Humidity 60–80%, Rainfall 40-100mm)
      if (humidity >= 60 && humidity <= 80 && rainfall >= 40 && rainfall <= 100) {
        recommendations.push({
          id: `bark-harvesting-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.bark_harvesting'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.bark_harvesting.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.bark_harvesting.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.bark_harvesting.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'oil-yield',
        });
      }

      // Activity 15: Post-Harvest Care (Post-Harvest Done)
      recommendations.push({
        id: `post-harvest-care-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.post_harvest_care'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.post_harvest_care.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.post_harvest_care.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.post_harvest_care.reason'),
        suggestedDate: currentDate,
        priority: 'high' as const,
        moduleType: 'yield-predictor',
      });

      // Activity 16: Maturity Check (Age > 18-24 Months)
      if (plantAge > 540) {
        recommendations.push({
          id: `maturity-check-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.maturity_check'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.maturity_check.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.maturity_check.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.maturity_check.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'yield-predictor',
        });
      }

      // Activity 17: Oil Prediction (Immediately Pre-Harvest)
      recommendations.push({
        id: `oil-prediction-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.oil_prediction'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.oil_prediction.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.oil_prediction.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.oil_prediction.reason'),
        suggestedDate: currentDate,
        priority: 'high' as const,
        moduleType: 'oil-yield',
      });

      // Activity 18: Drying Support (Humidity < 60%, Rain < 30mm)
      if (humidity < 60 && rainfall < 30) {
        recommendations.push({
          id: `drying-support-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.drying_support'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.drying_support.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.drying_support.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.drying_support.reason'),
          suggestedDate: currentDate,
          priority: 'high' as const,
          moduleType: 'oil-yield',
        });
      }
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
        activityName: t('yield_weather.farm_assistance.activities.weather_monitoring'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.weather_monitoring.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.weather_monitoring.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.weather_monitoring.reason'),
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
          activityName: t('yield_weather.farm_assistance.activities.critical_irrigation'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.critical_irrigation.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.critical_irrigation.trigger', { rainfall: weeklyRainfall.toFixed(1), moisture: soilMoisture.toFixed(1) }),
          reason: t('yield_weather.farm_assistance.recommendations.critical_irrigation.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else if (weeklyRainfall > 100) {
        recommendations.push({
          id: `drainage-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.drainage_management'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.drainage_management.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.drainage_management.trigger', { rainfall: weeklyRainfall.toFixed(1) }),
          reason: t('yield_weather.farm_assistance.recommendations.drainage_management.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else {
        recommendations.push({
          id: `water-monitoring-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.water_monitoring'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.water_monitoring.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.water_monitoring.trigger', { rainfall: weeklyRainfall.toFixed(1) }),
          reason: t('yield_weather.farm_assistance.recommendations.water_monitoring.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Temperature protection
      if (temperature > 32) {
        recommendations.push({
          id: `shade-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.heat_protection'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.heat_protection.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.heat_protection.trigger', { temperature }),
          reason: t('yield_weather.farm_assistance.recommendations.heat_protection.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else if (temperature < 20) {
        recommendations.push({
          id: `cold-protection-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.cold_protection'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.cold_protection.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.cold_protection.trigger', { temperature }),
          reason: t('yield_weather.farm_assistance.recommendations.cold_protection.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // MANDATORY: Weed control (always needed)
      recommendations.push({
        id: `weeding-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.weed_control'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.weed_control_stage1.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.weed_control_stage1.trigger', { daysOld: growthStage.daysOld || (growthStage as any)?.days_old || 0 }),
        reason: t('yield_weather.farm_assistance.recommendations.weed_control_stage1.reason'),
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
      });

      // NEW: Nutrient Deficiency Check (Image-based)
      recommendations.push({
        id: `nutrient-check-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.nutrient_deficiency_check'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.nutrient_deficiency_check.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.nutrient_deficiency_check.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.nutrient_deficiency_check.reason'),
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'high',
        moduleType: 'fertilizer',
      });

      // NEW: Disease & Pest Scan (After rainy week)
      if (weeklyRainfall > 60 || humidity > 70) {
        recommendations.push({
          id: `disease-scan-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.disease_pest_scan'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.disease_pest_scan.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.disease_pest_scan.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.disease_pest_scan.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
          moduleType: 'pest-disease',
        });
      }

      // NEW: Weather-Based Water Advisory
      if (weeklyRainfall < 60) {
        recommendations.push({
          id: `water-advisory-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.weather_water_advisory'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.weather_water_advisory.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.weather_water_advisory.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.weather_water_advisory.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
          moduleType: 'yield-predictor',
        });
      }

      // MANDATORY: Routine Pest Monitoring (always needed for young seedlings)
      recommendations.push({
        id: `routine-pest-check-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.routine_pest_monitoring'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.routine_pest_monitoring.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.routine_pest_monitoring.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.routine_pest_monitoring.reason'),
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        moduleType: 'pest-disease',
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
          activityName: t('yield_weather.farm_assistance.activities.balanced_fertilization'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.balanced_fertilization.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.balanced_fertilization.trigger', { moisture: soilMoisture.toFixed(1), rainfall: weeklyRainfall.toFixed(1) }),
          reason: t('yield_weather.farm_assistance.recommendations.balanced_fertilization.reason', { monthsOld }),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else {
        recommendations.push({
          id: `organic-nutrition-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.organic_nutrition'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.organic_nutrition.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.organic_nutrition.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.organic_nutrition.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Pest and disease monitoring
      if (humidity > 70) {
        recommendations.push({
          id: `pest-monitoring-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.disease_prevention'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.disease_prevention.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.disease_prevention.trigger', { humidity }),
          reason: t('yield_weather.farm_assistance.recommendations.disease_prevention.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      } else {
        recommendations.push({
          id: `routine-monitoring-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.plant_health_check'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.plant_health_check.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.plant_health_check.trigger', { monthsOld }),
          reason: t('yield_weather.farm_assistance.recommendations.plant_health_check.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Structural development
      if (daysOld > 300) {
        recommendations.push({
          id: `pruning-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.structural_pruning'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.structural_pruning.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.structural_pruning.trigger', { monthsOld }),
          reason: t('yield_weather.farm_assistance.recommendations.structural_pruning.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: temperature >= 25 && temperature <= 30 ? 'high' : 'medium',
        });
      }

      // NEW: Growth Stage Yield Projection (Image-based)
      if (daysOld > 180) { // > 6 months
        recommendations.push({
          id: `yield-projection-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.growth_yield_projection'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.growth_yield_projection.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.growth_yield_projection.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.growth_yield_projection.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
          moduleType: 'yield-predictor',
        });
      }

      // NEW: Fertilizer Optimization (Image-based)
      if (soilMoisture >= 25 && weeklyRainfall >= 30) {
        recommendations.push({
          id: `fertilizer-optimization-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.fertilizer_optimization'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.fertilizer_optimization.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.fertilizer_optimization.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.fertilizer_optimization.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
          moduleType: 'fertilizer',
        });
      }

      // NEW: Preventive Pest Monitoring
      if (weeklyRainfall > 60 || humidity > 75) {
        recommendations.push({
          id: `preventive-pest-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.preventive_pest_monitoring'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.preventive_pest_monitoring.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.preventive_pest_monitoring.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.preventive_pest_monitoring.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
          moduleType: 'pest-disease',
        });
      }

      // NEW: Pruning & Crop Planning Advisory
      if (daysOld > 300) { // 10+ months
        recommendations.push({
          id: `crop-planning-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.crop_planning_advisory'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.crop_planning_advisory.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.crop_planning_advisory.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.crop_planning_advisory.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
          moduleType: 'yield-predictor',
        });
      }
    }
    
    // STAGE 3: Harvest / Maturity (541+ days) - PRODUCTION PERIOD
    else if (growthStage.stageNumber === 3) {
      const daysOld = growthStage.daysOld || (growthStage as any)?.days_old || 0;
      const yearsOld = Math.floor(daysOld / 365);
      
      // MANDATORY: Harvest readiness assessment
      if (daysOld >= 730) { // 2+ years

      // NEW: Harvest Readiness Assessment (Image-based)
      if (daysOld >= 540) { // ≥ 18 months
        recommendations.push({
          id: `harvest-readiness-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.harvest_readiness_assessment'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.harvest_readiness_assessment.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.harvest_readiness_assessment.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.harvest_readiness_assessment.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
          moduleType: 'yield-predictor',
        });
      }

      // NEW: Cinnamon Oil Yield Prediction
      if (daysOld >= 540) {
        recommendations.push({
          id: `oil-yield-prediction-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.oil_yield_prediction'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.oil_yield_prediction.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.oil_yield_prediction.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.oil_yield_prediction.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
          moduleType: 'oil-yield',
        });
      }

      // NEW: Drying & Distillation Optimization
      if (weeklyRainfall < 30 && humidity < 60) {
        recommendations.push({
          id: `distillation-optimization-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.distillation_optimization'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.distillation_optimization.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.distillation_optimization.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.distillation_optimization.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
          moduleType: 'oil-yield',
        });
      }

      // NEW: Post-Harvest Quality Monitoring
      if (daysOld >= 730) { // 2+ years (harvest completed)
        recommendations.push({
          id: `quality-monitoring-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.quality_monitoring'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.quality_monitoring.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.quality_monitoring.trigger'),
          reason: t('yield_weather.farm_assistance.recommendations.quality_monitoring.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
          moduleType: 'oil-yield',
        });
      }
        if (humidity >= 60 && humidity <= 80 && weeklyRainfall >= 40 && weeklyRainfall <= 100) {
          recommendations.push({
            id: `harvesting-${plot.id}`,
            activityName: t('yield_weather.farm_assistance.activities.bark_harvesting'),
            recommendedAction: t('yield_weather.farm_assistance.recommendations.bark_harvesting.action'),
            triggerCondition: t('yield_weather.farm_assistance.recommendations.bark_harvesting.trigger', { humidity, rainfall: weeklyRainfall.toFixed(1) }),
            reason: t('yield_weather.farm_assistance.recommendations.bark_harvesting.reason', { yearsOld }),
            suggestedDate: new Date().toISOString().split('T')[0],
            priority: 'high',
          });
        } else {
          recommendations.push({
            id: `harvest-prep-${plot.id}`,
            activityName: t('yield_weather.farm_assistance.activities.harvest_preparation'),
            recommendedAction: t('yield_weather.farm_assistance.recommendations.harvest_preparation_ready.action'),
            triggerCondition: t('yield_weather.farm_assistance.recommendations.harvest_preparation_ready.trigger'),
            reason: t('yield_weather.farm_assistance.recommendations.harvest_preparation_ready.reason'),
            suggestedDate: new Date().toISOString().split('T')[0],
            priority: 'medium',
          });
        }
      } else {
        recommendations.push({
          id: `pre-harvest-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.pre_harvest_management'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.pre_harvest_management.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.pre_harvest_management.trigger', { yearsOld, monthsRemaining: Math.floor((daysOld % 365) / 30) }),
          reason: t('yield_weather.farm_assistance.recommendations.pre_harvest_management.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      // MANDATORY: Quality management for mature plants
      if (weeklyRainfall < 30 && humidity < 60) {
        recommendations.push({
          id: `quality-drying-${plot.id}`,
          activityName: t('yield_weather.farm_assistance.activities.post_harvest_processing'),
          recommendedAction: t('yield_weather.farm_assistance.recommendations.post_harvest_processing.action'),
          triggerCondition: t('yield_weather.farm_assistance.recommendations.post_harvest_processing.trigger', { rainfall: weeklyRainfall.toFixed(1), humidity }),
          reason: t('yield_weather.farm_assistance.recommendations.post_harvest_processing.reason'),
          suggestedDate: new Date().toISOString().split('T')[0],
          priority: 'high',
        });
      }

      // MANDATORY: Regeneration management
      recommendations.push({
        id: `regeneration-${plot.id}`,
        activityName: t('yield_weather.farm_assistance.activities.coppice_management'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.coppice_management.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.coppice_management.trigger'),
        reason: t('yield_weather.farm_assistance.recommendations.coppice_management.reason'),
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
        activityName: t('yield_weather.farm_assistance.activities.general_plant_care'),
        recommendedAction: t('yield_weather.farm_assistance.recommendations.general_plant_care.action'),
        triggerCondition: t('yield_weather.farm_assistance.recommendations.general_plant_care.trigger', { stage: growthStage.name.toLowerCase() }),
        reason: t('yield_weather.farm_assistance.recommendations.general_plant_care.reason', { daysOld: growthStage.daysOld || (growthStage as any)?.days_old || 0 }),
        suggestedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
      });
    }

    // Add module types only to recommendations that don't have one
    const enrichedRecommendations = recommendations.map(rec => ({
      ...rec,
      moduleType: rec.moduleType || getModuleType(rec.activityName)
    }));

    return enrichedRecommendations;
  };

  const calculateSoilMoisture = (weatherData: WeatherData): number => {
    // Simple estimation based on rainfall and humidity
    // This is a basic formula - in reality, you'd want soil sensors
    const { humidity, rainfall } = weatherData;
    const baseHumidity = Math.min(humidity / 100 * 40, 40); // Cap at 40%
    const rainfallContribution = Math.min(rainfall * 2, 20); // Cap rainfall contribution
    return Math.min(baseHumidity + rainfallContribution, 50); // Cap total at 50%
  };

  // Determine module type based on activity name
  const getModuleType = (activityName: string): 'fertilizer' | 'oil-yield' | 'pest-disease' | 'yield-predictor' | undefined => {
    const name = activityName.toLowerCase();
    
    // Fertilizer related activities
    if (name.includes('fertiliz') || name.includes('nutrition') || name.includes('soil') || 
        name.includes('ph') || name.includes('mulch') || name.includes('organic') || 
        name.includes('analysis') || name.includes('deficiency') || name.includes('feeding') ||
        name.includes('optimization')) {
      return 'fertilizer';
    }
    
    // Oil yield related activities
    if ( name.includes('bark') || name.includes('processing') || 
        name.includes('drying') || name.includes('quality') || name.includes('oil') ||
        name.includes('distillation') || name.includes('peeling')) {
      return 'oil-yield';
    }
    
    // Pest and disease related activities
    if (name.includes('pest') || name.includes('disease') || name.includes('monitoring') || 
        name.includes('protection') || name.includes('spray') || name.includes('fungus') ||
        name.includes('health') || name.includes('scan') || name.includes('mite') ||
        name.includes('blight')) {
      return 'pest-disease';
    }
    
    // Yield predictor related activities
    if (name.includes('harvest') || name.includes('yield') || name.includes('predict') || name.includes('assessment') || 
        name.includes('canopy') || name.includes('production') || name.includes('forecast') ||
        name.includes('growth') || name.includes('prune') || name.includes('maturity') ||
        name.includes('thinning') || name.includes('coppicing')) {
      return 'yield-predictor';
    }
    
    return undefined;
  };

  // Handle navigation to appropriate module
  const handleNavigateToModule = (moduleType: string | undefined, activityName: string) => {
    if (!moduleType) {
      Alert.alert(
        t('yield_weather.farm_assistance.navigation.title'),
        t('yield_weather.farm_assistance.navigation.no_module')
      );
      return;
    }

    switch (moduleType) {
      case 'fertilizer':
        router.push('/(tabs)/fertilizer');
        break;
      case 'oil-yield':
        router.push('/(tabs)/oil');
        break;
      case 'pest-disease':
        router.push('/(tabs)/pests');
        break;
      case 'yield-predictor':
        router.push('/yield-weather/YieldPredictor');
        break;
      default:
        Alert.alert(
          t('yield_weather.farm_assistance.navigation.title'),
          t('yield_weather.farm_assistance.navigation.unknown_module')
        );
    }
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
          t('yield_weather.farm_assistance.partial_success'),
          t('yield_weather.farm_assistance.partial_success_message', { error: errorMessage }),
          [{ text: t('yield_weather.common.ok') }]
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

      const saveStatus = saveSuccessful ? t('yield_weather.farm_assistance.saved_to_history') : t('yield_weather.farm_assistance.saved_locally');
      
      Alert.alert(
        t('yield_weather.farm_assistance.activity_completed'), 
        t('yield_weather.farm_assistance.activity_completed_message', { activity: recommendation.activityName, plot: plot.name, status: saveStatus })
      );
    } catch (error) {
      console.error('❌ Unexpected error in handleActivityDone:', error);
      Alert.alert(t('yield_weather.common.error'), t('yield_weather.farm_assistance.errors.mark_done_failed', { error: error instanceof Error ? error.message : t('yield_weather.common.unknown_error') }));
    }
  };

  const onRefresh = () => {
    loadFarmAssistanceData(true);
  };

  useEffect(() => {
    loadFarmAssistanceData();
  }, []);

  // Auto-select first plot when data loads
  useEffect(() => {
    if (plotsWithRecommendations.length > 0 && selectedPlotId === null) {
      const firstPlotId = plotsWithRecommendations[0].id;
      if (firstPlotId !== undefined) {
        setSelectedPlotId(firstPlotId);
      }
    }
  }, [plotsWithRecommendations]);

  // Get all plots (no filtering on plots)
  const getFilteredPlots = () => {
    return plotsWithRecommendations;
  };

  // Get selected plot
  const getSelectedPlot = () => {
    return plotsWithRecommendations.find(plot => plot.id === selectedPlotId);
  };

  // Get filtered recommendations for selected plot based on priority
  const getFilteredRecommendations = () => {
    const selectedPlot = getSelectedPlot();
    if (!selectedPlot) return [];
    
    if (filterPriority) {
      return selectedPlot.recommendations.filter(rec => rec.priority === filterPriority);
    }
    
    return selectedPlot.recommendations;
  };

  // Get recent activities for selected plot
  const getSelectedPlotActivities = () => {
    if (!selectedPlotId) return [];
    return recentActivities.filter(activity => activity.plot_id === selectedPlotId);
  };

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

  const getModuleIcon = (moduleType?: string) => {
    switch (moduleType) {
      case 'fertilizer': return 'leaf';
      case 'oil-yield': return 'flask';
      case 'pest-disease': return 'bug';
      case 'yield-predictor': return 'trending-up';
      default: return 'arrow-forward';
    }
  };

  const getModuleColor = (moduleType?: string) => {
    switch (moduleType) {
      case 'fertilizer': return '#10B981';
      case 'oil-yield': return '#F59E0B';
      case 'pest-disease': return '#EF4444';
      case 'yield-predictor': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  // Render horizontal plot selector
  const renderPlotSelector = () => {
    const filteredPlots = getFilteredPlots();
    
    return (
      <View style={styles.plotSelectorContainer}>
        <Text style={styles.sectionTitle}>{t('yield_weather.farm_assistance.select_plot')}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plotSelectorScroll}
        >
          {filteredPlots.map((plot) => {
            const isSelected = plot.id === selectedPlotId;
            const highPriorityCount = plot.recommendations.filter(r => r.priority === 'high').length;
            
            return (
              <TouchableOpacity
                key={plot.id}
                style={[
                  styles.plotSelectorCard,
                  isSelected && styles.plotSelectorCardSelected
                ]}
                onPress={() => plot.id && setSelectedPlotId(plot.id)}
              >
                <View style={styles.plotSelectorIcon}>
                  <Ionicons 
                    name="leaf" 
                    size={28} 
                    color={isSelected ? '#10B981' : '#6B7280'} 
                  />
                  {highPriorityCount > 0 && (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>{highPriorityCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.plotSelectorName,
                  isSelected && styles.plotSelectorNameSelected
                ]}>
                  {plot.name}
                </Text>
                <Text style={styles.plotSelectorStage}>
                  {plot.growthStage?.name?.substring(0, 15)}
                </Text>
                <Text style={styles.plotSelectorDays}>
                  {plot.growthStage?.daysOld || 0} {t('yield_weather.farm_assistance.days')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Render filter chips
  // Render filter dropdown
  const renderFilterDropdown = () => {
    return (
      <TouchableOpacity
        style={styles.priorityFilterDropdown}
        onPress={() => {
          // Cycle through priority filters: null -> high -> medium -> low -> null
          if (filterPriority === null) {
            setFilterPriority('high');
          } else if (filterPriority === 'high') {
            setFilterPriority('medium');
          } else if (filterPriority === 'medium') {
            setFilterPriority('low');
          } else {
            setFilterPriority(null);
          }
        }}
      >
        <View style={styles.filterDropdownContent}>
          {filterPriority ? (
            <>
              <Ionicons 
                name={getPriorityIcon(filterPriority)} 
                size={14} 
                color="#374151" 
              />
              <Text style={styles.filterDropdownText}>
                {filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1)}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="funnel-outline" size={14} color="#6B7280" />
              <Text style={styles.filterDropdownText}>{t('yield_weather.farm_assistance.all')}</Text>
            </>
          )}
          <Ionicons name="chevron-down" size={14} color="#9CA3AF" style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterChips = () => {
    return (
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>{t('yield_weather.farm_assistance.filters')}:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Priority Filters */}
          {(['high', 'medium', 'low'] as const).map((priority) => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterChip,
                filterPriority === priority && styles.filterChipActive,
                { borderColor: getPriorityColor(priority) }
              ]}
              onPress={() => setFilterPriority(filterPriority === priority ? null : priority)}
            >
              <Ionicons 
                name={getPriorityIcon(priority)} 
                size={14} 
                color={filterPriority === priority ? '#FFFFFF' : getPriorityColor(priority)} 
                style={{ marginRight: 4 }}
              />
              <Text style={[
                styles.filterChipText,
                filterPriority === priority && styles.filterChipTextActive
              ]}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Clear Filters */}
          {filterPriority && (
            <TouchableOpacity
              style={styles.clearFiltersChip}
              onPress={() => {
                setFilterPriority(null);
              }}
            >
              <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.clearFiltersText}>{t('yield_weather.farm_assistance.clear_filters')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render recent activities for selected plot
  const renderRecentActivities = () => {
    const activities = getSelectedPlotActivities();
    
    if (activities.length === 0) {
      return (
        <View style={styles.recentActivitiesContainer}>
          <Text style={styles.sectionTitle}>{t('yield_weather.farm_assistance.recent_activities')}</Text>
          <View style={styles.noActivitiesCard}>
            <Ionicons name="time-outline" size={32} color="#9CA3AF" />
            <Text style={styles.noActivitiesText}>
              {t('yield_weather.farm_assistance.no_recent_activities')}
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.recentActivitiesContainer}>
        <Text style={styles.sectionTitle}>{t('yield_weather.farm_assistance.recent_activities')}</Text>
        {activities.slice(0, 5).map((activity, index) => (
          <View key={index} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.activityName}>{activity.activity_name}</Text>
            </View>
            <Text style={styles.activityDateRecent}>
              {activity.formatted_date || new Date(activity.activity_date).toLocaleDateString()}
            </Text>
            {activity.weather_snapshot && (
              <Text style={styles.activityWeather}>
                🌡️ {Math.round(activity.weather_snapshot.temperature)}°C • 
                💧 {activity.weather_snapshot.humidity}% • 
                🌧️ {activity.weather_snapshot.rainfall}mm
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderTimeline = (growthStage: any) => {
    const stages = [
      { 
        number: 1, 
        name: t('yield_weather.farm_assistance.growth_stages.nursery_establishment'), 
        days: '0-180',
        icon: 'water-outline' 
      },
      { 
        number: 2, 
        name: t('yield_weather.farm_assistance.growth_stages.vegetative_growth'), 
        days: '181-540',
        icon: 'leaf-outline' 
      },
      { 
        number: 3, 
        name: t('yield_weather.farm_assistance.growth_stages.harvest_maturity'), 
        days: '541+',
        icon: 'cut-outline' 
      },
    ];

    const currentStage = growthStage?.stageNumber || 0;
    
    console.log('🔄 Rendering timeline:', {
      growthStage,
      currentStage,
      hasStageNumber: !!growthStage?.stageNumber,
      daysOld: growthStage?.daysOld
    });
    
    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>{t('yield_weather.farm_assistance.growth_timeline')}</Text>
        <View style={styles.timelineStages}>
          {stages.map((stage, index) => {
            const isActive = stage.number === currentStage;
            const isPast = stage.number < currentStage;
            const isFuture = stage.number > currentStage;

            return (
              <View key={stage.number} style={styles.timelineStageWrapper}>
                <View style={styles.timelineStage}>
                  <View style={[
                    styles.timelineStageCircle,
                    isActive && styles.timelineStageCircleActive,
                    isPast && styles.timelineStageCirclePast,
                    isFuture && styles.timelineStageCircleFuture
                  ]}>
                    <Ionicons 
                      name={stage.icon as any} 
                      size={20} 
                      color={isActive ? '#FFFFFF' : isPast ? '#10B981' : '#9CA3AF'} 
                    />
                  </View>
                  <Text style={[
                    styles.timelineStageName,
                    isActive && styles.timelineStageNameActive
                  ]} numberOfLines={2}>
                    {stage.name}
                  </Text>
                  <Text style={styles.timelineStageDays}>{stage.days} {t('yield_weather.farm_assistance.days')}</Text>
                </View>
                {index < stages.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    isPast && styles.timelineLinePast
                  ]} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t('yield_weather.farm_assistance.loading')}</Text>
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
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.title}>{t('yield_weather.farm_assistance.title')}</Text>
          </View>
          <Text style={styles.subtitle}>
            {t('yield_weather.farm_assistance.subtitle')}
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
              {t('yield_weather.farm_assistance.no_farm_message')}
            </Text>
            <TouchableOpacity 
              style={styles.addFarmButton}
              onPress={() => navigation.navigate('MyFarm')}
            >
              <Text style={styles.addFarmButtonText}>{t('yield_weather.farm_assistance.add_farm_button')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {plotsWithRecommendations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{t('yield_weather.farm_assistance.no_plots_title')}</Text>
            <Text style={styles.emptyDescription}>
              {t('yield_weather.farm_assistance.no_plots_description')}
            </Text>
          </View>
        ) : (
          <>
            {/* Plot Selector - Horizontal Scrollable */}
            {renderPlotSelector()}
            
            {/* Selected Plot Details */}
            {(() => {
              const selectedPlot = getSelectedPlot();
              if (!selectedPlot) return null;
              
              return (
                <View style={styles.plotCard}>
                  <View style={styles.plotHeader}>
                    <View style={styles.plotHeaderContent}>
                      <Text style={styles.plotName}>
                        {selectedPlot.name}
                      </Text>
                      <View style={styles.plotInfoContainer}>
                        <View style={styles.ageContainer}>
                          <Text style={styles.ageDays}>
                            {selectedPlot.growthStage?.daysOld || (selectedPlot.growthStage as any)?.days_old || 0}
                          </Text>
                          <Text style={styles.ageLabel}>{t('yield_weather.farm_assistance.days_old')}</Text>
                        </View>
                        <View style={styles.plotDetailsContainer}>
                          <Text style={styles.plotStage}>{selectedPlot.growthStage?.name}</Text>
                          <Text style={styles.plotArea}>{selectedPlot.area} {t('yield_weather.common.hectares')}</Text>
                        </View>
                      </View>
                      {selectedPlot.weatherData && (
                        <Text style={styles.weatherInfo}>
                          🌡️ {Math.round(selectedPlot.weatherData.temperature)}°C • 💧 {selectedPlot.weatherData.humidity}% humidity • 🌧️ {selectedPlot.weatherData.rainfall}mm rain
                        </Text>
                      )}
                      <Text style={styles.progressInfo}>
                        {t('yield_weather.farm_assistance.progress')}: {selectedPlot.progress_percentage}% • {selectedPlot.crop_type}
                      </Text>
                    </View>
                  </View>

                  {/* Growth Stage Timeline */}
                  {selectedPlot.growthStage && renderTimeline(selectedPlot.growthStage)}

                  {/* Suggested Activities Section with Filter */}
                  <View style={styles.sectionHeaderWithFilter}>
                    <Text style={styles.sectionSubtitle}>{t('yield_weather.farm_assistance.suggested_activities')}</Text>
                    {renderFilterDropdown()}
                  </View>
                  {(() => {
                    const filteredRecommendations = getFilteredRecommendations();
                    
                    if (filteredRecommendations.length === 0) {
                      return (
                        <View style={styles.noRecommendations}>
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                          <Text style={styles.noRecommendationsText}>
                            {filterPriority 
                              ? t('yield_weather.farm_assistance.no_filtered_activities')
                              : t('yield_weather.farm_assistance.no_actions_required')}
                          </Text>
                        </View>
                      );
                    }
                    
                    return filteredRecommendations.map((recommendation) => (
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
                          <View style={[styles.priorityBadgeLarge, { backgroundColor: getPriorityColor(recommendation.priority) }]}>
                            <Text style={styles.priorityText}>{recommendation.priority.toUpperCase()}</Text>
                          </View>
                        </View>

                        <Text style={styles.recommendedAction}>{recommendation.recommendedAction}</Text>
                        
                        <View style={styles.conditionContainer}>
                          <Text style={styles.conditionLabel}>{t('yield_weather.farm_assistance.trigger')}:</Text>
                          <Text style={styles.conditionText}>{recommendation.triggerCondition}</Text>
                        </View>

                        <View style={styles.reasonContainer}>
                          <Text style={styles.reasonLabel}>{t('yield_weather.farm_assistance.why')}:</Text>
                          <Text style={styles.reasonText}>{recommendation.reason}</Text>
                        </View>

                        {/* Module Navigation Section */}
                        {recommendation.moduleType && (
                          <View style={styles.moduleNavigation}>
                            <View style={[styles.moduleTag, { backgroundColor: `${getModuleColor(recommendation.moduleType)}15` }]}>
                              <Ionicons 
                                name={getModuleIcon(recommendation.moduleType) as any} 
                                size={14} 
                                color={getModuleColor(recommendation.moduleType)} 
                              />
                              <Text style={[styles.moduleTagText, { color: getModuleColor(recommendation.moduleType) }]}>
                                {recommendation.moduleType.replace('-', ' ')}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.navigateButton, { backgroundColor: getModuleColor(recommendation.moduleType) }]}
                              onPress={() => handleNavigateToModule(recommendation.moduleType, recommendation.activityName)}
                            >
                              <Text style={styles.navigateButtonText}>{t('yield_weather.farm_assistance.go_to_module')}</Text>
                              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        )}

                        <View style={styles.recommendationFooter}>
                          <Text style={styles.suggestedDate}>
                            {t('yield_weather.farm_assistance.suggested')}: {new Date(recommendation.suggestedDate).toLocaleDateString()}
                          </Text>
                          <TouchableOpacity
                            style={styles.doneButton}
                            onPress={() => handleActivityDone(selectedPlot.id!, recommendation)}
                          >
                            <Text style={styles.doneButtonText}>{t('yield_weather.farm_assistance.mark_done')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ));
                  })()}
                </View>
              );
            })()}
            
            {/* Recent Activities for Selected Plot */}
            {renderRecentActivities()}
          </>
        )}

        {/* Contact Information Section */}
        <View style={styles.contactSection}>
          <View style={styles.contactHeader}>
            <Ionicons name="call" size={20} color="#4CAF50" />
            <Text style={styles.contactTitle}>{t('yield_weather.farm_assistance.further_assistance.title')}</Text>
          </View>
          <Text style={styles.contactDescription}>
            {t('yield_weather.farm_assistance.further_assistance.description')}
          </Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="business" size={16} color="#6B7280" />
              <Text style={styles.contactText}>{t('yield_weather.farm_assistance.further_assistance.center_name')}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={16} color="#6B7280" />
              <Text style={styles.contactText}>{t('yield_weather.farm_assistance.further_assistance.phone')}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={16} color="#6B7280" />
              <Text style={styles.contactText}>{t('yield_weather.farm_assistance.further_assistance.email')}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.contactText}>{t('yield_weather.farm_assistance.further_assistance.working_hours')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.contactButton}
            onPress={async () => {
              try {
                const contactInfo = await farmAssistanceAPI.getContactInfo();
                if (contactInfo.success) {
                  Alert.alert(
                    t('yield_weather.farm_assistance.further_assistance.contact_dialog_title'),
                    t('yield_weather.farm_assistance.further_assistance.contact_dialog_message', {
                      phone: contactInfo.data.phone,
                      email: contactInfo.data.email,
                      website: contactInfo.data.website,
                      hours: contactInfo.data.working_hours
                    }),
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                Alert.alert(
                  t('yield_weather.farm_assistance.further_assistance.contact_dialog_title'),
                  t('yield_weather.farm_assistance.further_assistance.fallback_contact')
                );
              }
            }}
          >
            <Text style={styles.contactButtonText}>{t('yield_weather.farm_assistance.further_assistance.view_contact_button')}</Text>
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
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

  // Timeline Styles
  timelineContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  timelineStages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineStageWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineStage: {
    alignItems: 'center',
    width: '100%',
  },
  timelineStageCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    zIndex: 2,
  },
  timelineStageCircleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timelineStageCirclePast: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
  },
  timelineStageCircleFuture: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  timelineStageName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  timelineStageNameActive: {
    fontWeight: '600',
    color: '#111827',
  },
  timelineStageDays: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
  timelineLinePast: {
    backgroundColor: '#10B981',
  },

  // Module Navigation Styles
  moduleNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 12,
  },
  moduleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moduleTagText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },

  // Plot Selector Styles
  plotSelectorContainer: {
    marginBottom: 20,
  },
  plotSelectorScroll: {
    paddingVertical: 8,
  },
  plotSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  plotSelectorCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  plotSelectorIcon: {
    marginBottom: 8,
    position: 'relative',
  },
  plotSelectorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  plotSelectorNameSelected: {
    color: '#10B981',
  },
  plotSelectorStage: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 2,
  },
  plotSelectorDays: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Filter Styles
  filterContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  filterScroll: {
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  filterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },

  // Section Styles
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeaderWithFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },
  priorityFilterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 100,
  },
  filterDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterDropdownText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },

  // Recent Activities Styles
  recentActivitiesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityDateRecent: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  activityWeather: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noActivitiesCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noActivitiesText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  priorityBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

});

export default FarmAssistance;