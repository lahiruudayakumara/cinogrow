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

// Cinnamon variety pricing data (LKR per kg) - Source: Tridge Mar 2025
const VARIETY_PRICES = {
  'Sri Gemunu': 3804,
  'Sri Vijaya': 3567,
  'Default': 3685 // Average of both varieties
};

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

  // Tree input state
  const [showTreeInputModal, setShowTreeInputModal] = useState(false);
  const [treeData, setTreeData] = useState<TreeInputData[]>([]);
  const [currentTreeIndex, setCurrentTreeIndex] = useState(0);
  const [treeSubmitting, setTreeSubmitting] = useState(false);
  const [treesCompletedForPlot, setTreesCompletedForPlot] = useState<number | null>(null);
  const [hybridYieldResult, setHybridYieldResult] = useState<any>(null);
  const [totalTreesInPlot, setTotalTreesInPlot] = useState<string>(''); // New field for total trees
  const [isEnteringTotalTrees, setIsEnteringTotalTrees] = useState<boolean>(true); // New state to track if we're on the "total trees" step
  const [recentPredictions, setRecentPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Tree input interface
  interface TreeInputData {
    treeCode: string;
    stem_diameter_mm: string;     // numeric - main predictor
    num_existing_stems: string;   // numeric - stem count
    fertilizer_used_tree: boolean; // binary - fertilizer usage
    diseases_tree: string;        // categorical - disease status
    predicted_canes?: number;     // from Model 1
    predicted_fresh_weight?: number; // from Model 2
  }

  // Constants
  const USER_ID = 1; // TODO: Get from auth context

  // Initialize tree data with 3 empty tree forms (for demonstration)
  const initializeTreeData = () => {
    const trees: TreeInputData[] = [];
    for (let i = 0; i < 3; i++) {
      trees.push({
        treeCode: `TREE_${i + 1}`,
        stem_diameter_mm: '',
        num_existing_stems: '',
        fertilizer_used_tree: false,
        diseases_tree: 'none',
      });
    }
    setTreeData(trees);
    setCurrentTreeIndex(0);
  };

  const loadRecentPredictions = async () => {
    try {
      setLoadingPredictions(true);
      const predictions = await yieldAPI.getHybridPredictions(undefined, 5); // Get 5 most recent predictions
      setRecentPredictions(predictions);
      console.log('📊 Loaded recent predictions:', predictions);
    } catch (error) {
      console.error('Failed to load recent predictions:', error);
      // Don't show error to user, just log it
    } finally {
      setLoadingPredictions(false);
    }
  };

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

      console.log(`🏭 Loaded ${farmsData.length} farms:`, farmsData.map(f => f.name));
      setAvailableFarms(farmsData);
      
      // Set selected farm if none is selected
      if (!targetFarmId && farmsData.length > 0 && farmsData[0].id) {
        targetFarmId = farmsData[0].id;
        setSelectedFarmId(targetFarmId);
        await AsyncStorage.setItem('selectedFarmId', targetFarmId.toString());
      }

      // Get plots only from selected farm (or all if no farm selected)
      let allPlots: PlotWithFarmInfo[] = [];
      
      if (targetFarmId) {
        // Load plots only from selected farm
        const selectedFarm = farmsData.find(f => f.id === targetFarmId);
        if (selectedFarm) {
          try {
            const farmPlots = await farmAPI.getFarmPlots(targetFarmId);
            console.log(`🌱 Selected Farm "${selectedFarm.name}" has ${farmPlots.length} plots:`, farmPlots.map(p => p.name));
            
            // Add farm context to each plot
            const plotsWithFarmInfo: PlotWithFarmInfo[] = farmPlots.map(plot => ({
              ...plot,
              farm_name: selectedFarm.name,
              farm_location: selectedFarm.location
            }));
            allPlots = plotsWithFarmInfo;
          } catch (plotError) {
            console.error(`❌ Failed to load plots for farm ${selectedFarm.name} (${targetFarmId}):`, plotError);
          }
        }
      } else {
        // Load all plots if no specific farm is selected (fallback)
        for (const farm of farmsData) {
          if (farm.id) {
            try {
              const farmPlots = await farmAPI.getFarmPlots(farm.id);
              const plotsWithFarmInfo: PlotWithFarmInfo[] = farmPlots.map(plot => ({
                ...plot,
                farm_name: farm.name,
                farm_location: farm.location
              }));
              allPlots = [...allPlots, ...plotsWithFarmInfo];
            } catch (plotError) {
              console.error(`❌ Failed to load plots for farm ${farm.name} (${farm.id}):`, plotError);
            }
          }
        }
      }
      
      console.log(`📊 Plots loaded for selected farm: ${allPlots.length}`);
      console.log(`📝 Plot details:`, allPlots.map(p => ({
        name: p.name,
        farm: p.farm_name,
        ageMonths: p.age_months,
        area: p.area,
        status: p.status
      })));
      
      setAvailablePlots(allPlots);
      setUserYieldRecords(userYieldsData);

      // Load recent hybrid predictions
      await loadRecentPredictions();

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

  const onRefresh = () => {
    loadData(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus (e.g., returning from MyFarm screen)
  useFocusEffect(
    React.useCallback(() => {
      // Check if selected farm has changed
      AsyncStorage.getItem('selectedFarmId')
        .then(savedFarmId => {
          if (savedFarmId) {
            const farmId = parseInt(savedFarmId);
            // Check if we need to reload data for a different farm
            if (selectedFarmId !== farmId) {
              setSelectedFarmId(farmId);
              loadData();
            }
          }
        })
        .catch(error => {
          console.warn('Failed to read selected farm ID:', error);
        });
    }, [selectedFarmId])
  );

  const formatYield = (amount: number) => `${amount.toFixed(1)} kg`;
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Get plots filtered by selected farm
  const getFilteredPlots = () => {
    // Since we now only load plots from selected farm, return all available plots
    return availablePlots;
  };

  // Get selected farm name
  const getSelectedFarmName = () => {
    const selectedFarm = availableFarms.find(farm => farm.id === selectedFarmId);
    return selectedFarm ? selectedFarm.name : 'No Farm Selected';
  };

  // Handle farm selection change
  const handleFarmChange = (farmId: number) => {
    setSelectedFarmId(farmId);
    setSelectedPlotId(null); // Clear plot selection when farm changes
    setTreesCompletedForPlot(null);
    setHybridYieldResult(null);
    // Store in AsyncStorage and reload data
    AsyncStorage.setItem('selectedFarmId', farmId.toString()).then(() => {
      loadData();
    });
  };

  const getSelectedPlotName = () => {
    const plot = availablePlots.find(p => p.id === selectedPlotId);
    return plot ? plot.name : 'Select a plot';
  };

  // Tree input functions
  const updateTreeData = (index: number, field: keyof TreeInputData, value: string | boolean) => {
    const updatedTrees = [...treeData];
    updatedTrees[index] = { ...updatedTrees[index], [field]: value };
    setTreeData(updatedTrees);
  };

  const nextTree = () => {
    if (currentTreeIndex < 2) {
      setCurrentTreeIndex(currentTreeIndex + 1);
    }
  };

  const previousTree = () => {
    if (currentTreeIndex > 0) {
      setCurrentTreeIndex(currentTreeIndex - 1);
    }
  };

  const submitTreeData = async () => {
    // Validate current tree data
    const currentTree = treeData[currentTreeIndex];
    if (!currentTree.stem_diameter_mm || !currentTree.num_existing_stems) {
      Alert.alert(t('yield_weather.common.error'), 'Please fill stem diameter and existing stems count.');
      return;
    }

    setTreeSubmitting(true);
    try {
      // Step 1: Create tree record
      const treePayload = {
        plotId: selectedPlotId,
        treeCode: currentTree.treeCode,
        stemCount: parseInt(currentTree.num_existing_stems),
        fertilizerUsed: currentTree.fertilizer_used_tree,
        diseaseStatus: currentTree.diseases_tree,
        measurement: {
          stemDiameterMm: parseFloat(currentTree.stem_diameter_mm),
          numExistingStems: parseInt(currentTree.num_existing_stems),
        }
      };

      // Call tree creation API
      console.log('Tree data to submit:', treePayload);
      // TODO: Implement actual API call
      // const treeResponse = await yieldAPI.createTree(treePayload);
      
      Alert.alert(t('yield_weather.common.success'), `Tree ${currentTreeIndex + 1} data saved!`);
      
      // Move to next tree or trigger hybrid prediction if all trees are done
      if (currentTreeIndex < 2) {
        nextTree();
      } else {
        // All 3 trees are added, now run hybrid prediction
        await runHybridPrediction();
      }
    } catch (error) {
      console.error('Error submitting tree data:', error);
      Alert.alert(t('yield_weather.common.error'), 'Failed to save tree data. Please try again.');
    } finally {
      setTreeSubmitting(false);
    }
  };

  const runHybridPrediction = async () => {
    try {
      setTreeSubmitting(true);
      
      // Run hybrid prediction for the selected plot with all 3 trees
      console.log('Running hybrid prediction for plot:', selectedPlotId);
      console.log('Tree data to submit:', treeData.map((tree, index) => ({
        tree_code: tree.treeCode,
        stem_diameter_mm: parseFloat(tree.stem_diameter_mm) || 0,
        fertilizer_used: tree.fertilizer_used_tree,
        disease_status: tree.diseases_tree as 'none' | 'mild' | 'severe',
        num_existing_stems: parseInt(tree.num_existing_stems) || 0,
      })));
      
      // Prepare tree sample data for API
      const sampleTrees = treeData.map(tree => ({
        tree_code: tree.treeCode,
        stem_diameter_mm: parseFloat(tree.stem_diameter_mm) || 0,
        fertilizer_used: tree.fertilizer_used_tree,
        fertilizer_type: tree.fertilizer_used_tree ? 'organic' as const : null,
        disease_status: tree.diseases_tree as 'none' | 'mild' | 'severe',
        num_existing_stems: parseInt(tree.num_existing_stems) || 1,
        tree_age_years: 4.0 // Default age for mobile predictions
      })).filter(tree => tree.stem_diameter_mm > 0 && tree.num_existing_stems > 0); // Only include valid trees
      
      if (sampleTrees.length < 3) {
        Alert.alert('Error', 'At least 3 trees with valid data are required for hybrid prediction.');
        return;
      }

      // Validate total trees input
      const totalTrees = parseInt(totalTreesInPlot);
      if (!totalTrees || totalTrees <= 0) {
        Alert.alert('Error', 'Please enter the total number of trees in the plot.');
        return;
      }

      if (totalTrees < sampleTrees.length) {
        Alert.alert('Error', `Total trees (${totalTrees}) cannot be less than sample trees (${sampleTrees.length}).`);
        return;
      }
      
      // Call real hybrid prediction API
      const hybridResult = await yieldAPI.predictHybridYield(
        selectedPlotId!,
        sampleTrees,
        {
          rainfall: 2500, // Default rainfall
          temperature: 26 // Default temperature
        },
        totalTrees // Pass total trees as parameter
      );
      
      console.log('🎯 Real Hybrid Prediction Result:', hybridResult);
      
      // Calculate economic projections
      const marketPricePerKg = VARIETY_PRICES['Default']; // Use default price for now
      const estimatedDryBark = hybridResult.final_hybrid_yield_kg * (hybridResult.estimated_dry_bark_percentage / 100);
      const estimatedRevenue = estimatedDryBark * marketPricePerKg;
      
      // Transform API result to match our UI expectations
      const transformedResult = {
        plotId: selectedPlotId,
        treeLevelPrediction: {
          totalCanes: Math.round(hybridResult.avg_predicted_canes_per_tree * hybridResult.total_estimated_trees),
          totalFreshWeight: hybridResult.avg_predicted_fresh_weight_per_tree * hybridResult.total_estimated_trees,
          avgCanesPerTree: hybridResult.avg_predicted_canes_per_tree,
          avgFreshWeightPerTree: hybridResult.avg_predicted_fresh_weight_per_tree,
          avgDryWeightPerTree: hybridResult.avg_predicted_dry_weight_per_tree,
          estimatedTreesPerHa: hybridResult.estimated_trees_per_hectare,
          totalTrees: hybridResult.total_estimated_trees,
          modelYield: hybridResult.tree_model_yield_kg
        },
        plotLevelPrediction: {
          estimatedYield: hybridResult.plot_model_yield_kg,
        },
        hybridYield: hybridResult.final_hybrid_yield_kg,
        yieldPerHectare: hybridResult.yield_per_hectare,
        confidence: hybridResult.confidence_score,
        method: 'real_hybrid_model',
        sampleSize: hybridResult.sample_size,
        treeConfidence: hybridResult.tree_model_confidence,
        plotConfidence: hybridResult.plot_model_confidence,
        blendingWeights: {
          tree: hybridResult.blending_weight_tree,
          plot: hybridResult.blending_weight_plot
        },
        economicProjections: {
          dryBarkPercentage: hybridResult.estimated_dry_bark_percentage || 5,
          estimatedDryBarkKg: estimatedDryBark,
          estimatedPrice: marketPricePerKg,
          estimatedRevenue: estimatedRevenue,
          priceSource: 'Tridge Mar 2025 (Default)'
        }
      };
      
      // Save prediction to database
      try {
        await yieldAPI.saveHybridPrediction({
          plot_id: selectedPlotId!,
          total_trees: hybridResult.total_estimated_trees,
          ml_yield_tree_level: hybridResult.tree_model_yield_kg,
          ml_yield_farm_level: hybridResult.plot_model_yield_kg,
          final_hybrid_yield: hybridResult.final_hybrid_yield_kg,
          confidence_score: hybridResult.confidence_score,
          tree_model_confidence: hybridResult.tree_model_confidence,
          farm_model_confidence: hybridResult.plot_model_confidence,
          blending_weight_tree: hybridResult.blending_weight_tree,
          blending_weight_farm: hybridResult.blending_weight_plot,
          model_versions: hybridResult.model_versions,
          features_used: hybridResult.features_used,
        });
        console.log('✅ Hybrid prediction saved to database');
        // Reload recent predictions
        await loadRecentPredictions();
      } catch (saveError) {
        console.error('❌ Failed to save prediction to database:', saveError);
        // Don't fail the whole process if save fails
      }
      
      // Store the result and mark trees as completed for this plot
      setHybridYieldResult(transformedResult);
      setTreesCompletedForPlot(selectedPlotId);
      setShowTreeInputModal(false);
      
      Alert.alert(
        'Hybrid Prediction Complete!', 
        `Final hybrid yield prediction: ${transformedResult.hybridYield.toFixed(1)} kg\n` +
        `Yield per hectare: ${transformedResult.yieldPerHectare.toFixed(1)} kg/ha\n` +
        `Confidence: ${(transformedResult.confidence * 100).toFixed(1)}%\n\n` +
        `This combines tree-level ML predictions (${transformedResult.sampleSize} trees) with plot-level analysis for maximum accuracy.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error running hybrid prediction:', error);
      Alert.alert(
        'Hybrid Prediction Error', 
        `Failed to run hybrid prediction: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your tree data and try again.`
      );
    } finally {
      setTreeSubmitting(false);
    }
  };

  const openTreeInputModal = () => {
    if (!selectedPlotId) {
      Alert.alert('Notice', 'Please select a plot first before adding tree data.');
      return;
    }
    
    // Check if selected plot is suitable for tree input (age > 3, planted)
    const selectedPlot = availablePlots.find(p => p.id === selectedPlotId);
    if (!selectedPlot) {
      Alert.alert('Error', 'Selected plot not found.');
      return;
    }
    
    // Check if plot meets criteria for hybrid prediction
    const plotAgeMonths = selectedPlot.age_months || 0;
    const plotAgeYears = plotAgeMonths / 12;
    if (plotAgeYears <= 3) {
      Alert.alert(
        'Plot Not Ready', 
        `This plot is ${plotAgeYears.toFixed(1)} years old. Cinnamon trees must be at least 3 years old for bark harvesting. Please select a mature plot.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Tree Data Collection',
      `You will now collect data for 3 random trees from "${selectedPlot.name}". This data will be used to create a hybrid yield prediction combining tree-level and plot-level machine learning models.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Collection', onPress: () => {
          initializeTreeData();
          setTotalTreesInPlot(''); // Reset total trees input
          setIsEnteringTotalTrees(true); // Start with total trees step
          setShowTreeInputModal(true);
        }}
      ]
    );
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
        {/* Conditional Yield Display */}
        {selectedPlotId && treesCompletedForPlot === selectedPlotId ? (
          /* Show Hybrid Prediction Results */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Hybrid Yield Prediction Results</Text>
            </View>
            
            {hybridYieldResult && (
              <View style={styles.hybridResultContainer}>
                <View style={styles.resultCard}>
                  <Text style={styles.plotName}>
                    {availablePlots.find(p => p.id === selectedPlotId)?.name || 'Selected Plot'}
                  </Text>
                  
                  <View style={styles.predictionBreakdown}>
                    {/* Final Hybrid Result (Most Prominent) */}
                    <View style={styles.finalPrediction}>
                      <Text style={styles.finalLabel}>Final Hybrid Yield</Text>
                      <Text style={styles.finalValue}>
                        {hybridYieldResult.hybridYield?.toFixed(1) || 'N/A'} kg
                      </Text>
                      <Text style={styles.yieldPerHectare}>
                        ({hybridYieldResult.yieldPerHectare?.toFixed(1) || 'N/A'} kg/ha)
                      </Text>
                      <Text style={styles.confidenceText}>
                        Overall Confidence: {((hybridYieldResult.confidence || 0) * 100).toFixed(1)}%
                      </Text>
                    </View>

                    {/* Tree-Level Analysis */}
                    <View style={styles.predictionStep}>
                      <Text style={styles.stepTitle}>🌳 Tree-Level Analysis ({hybridYieldResult.sampleSize || 3} trees)</Text>
                      <Text style={styles.stepDetail}>
                        Avg canes per tree: {hybridYieldResult.treeLevelPrediction?.avgCanesPerTree?.toFixed(1) || 'N/A'}
                      </Text>
                      <Text style={styles.stepDetail}>
                        Avg fresh weight: {hybridYieldResult.treeLevelPrediction?.avgFreshWeightPerTree?.toFixed(1) || 'N/A'} kg/tree
                      </Text>
                      <Text style={styles.stepDetail}>
                        Avg dry bark: {hybridYieldResult.treeLevelPrediction?.avgDryWeightPerTree?.toFixed(1) || 'N/A'} kg/tree
                      </Text>
                      <Text style={styles.stepDetail}>
                        Tree model yield: {hybridYieldResult.treeLevelPrediction?.modelYield?.toFixed(1) || 'N/A'} kg
                      </Text>
                      <Text style={styles.stepDetail}>
                        Tree confidence: {((hybridYieldResult.treeConfidence || 0) * 100).toFixed(1)}%
                      </Text>
                    </View>
                    
                    {/* Plot-Level Analysis */}
                    <View style={styles.predictionStep}>
                      <Text style={styles.stepTitle}>📊 Plot-Level ML Analysis</Text>
                      <Text style={styles.stepDetail}>
                        ML prediction: {hybridYieldResult.plotLevelPrediction?.estimatedYield?.toFixed(1) || 'N/A'} kg
                      </Text>
                      <Text style={styles.stepDetail}>
                        Plot confidence: {((hybridYieldResult.plotConfidence || 0) * 100).toFixed(1)}%
                      </Text>
                    </View>

                    {/* Blending Information */}
                    {hybridYieldResult.blendingWeights && (
                      <View style={styles.predictionStep}>
                        <Text style={styles.stepTitle}>⚖️ Hybrid Blending</Text>
                        <Text style={styles.stepDetail}>
                          Tree model weight: {(hybridYieldResult.blendingWeights.tree * 100).toFixed(0)}%
                        </Text>
                        <Text style={styles.stepDetail}>
                          Plot model weight: {(hybridYieldResult.blendingWeights.plot * 100).toFixed(0)}%
                        </Text>
                      </View>
                    )}

                    {/* Economic Projections */}
                    {hybridYieldResult.economicProjections && (
                      <View style={styles.predictionStep}>
                        <Text style={styles.stepTitle}>💰 Economic Projections</Text>
                        <Text style={styles.stepDetail}>
                          Dry bark conversion: {hybridYieldResult.economicProjections.dryBarkPercentage?.toFixed(1) || '5.0'}%
                        </Text>
                        <Text style={styles.stepDetail}>
                          Estimated dry bark: {hybridYieldResult.economicProjections.estimatedDryBarkKg?.toFixed(2) || 'N/A'} kg
                        </Text>
                        <Text style={styles.stepDetail}>
                          Market price: Rs. {hybridYieldResult.economicProjections.estimatedPrice?.toLocaleString() || 'N/A'}/kg
                        </Text>
                        <Text style={[styles.stepDetail, { fontWeight: '700', color: '#047857', fontSize: 15 }]}>
                          Estimated revenue: Rs. {hybridYieldResult.economicProjections.estimatedRevenue?.toLocaleString('en-LK', { maximumFractionDigits: 0 }) || 'N/A'}
                        </Text>
                        {hybridYieldResult.economicProjections.priceSource && (
                          <Text style={[styles.stepDetail, { fontSize: 12, fontStyle: 'italic', color: '#6B7280' }]}>
                            Price source: {hybridYieldResult.economicProjections.priceSource}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Method Information */}
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodText}>
                        Method: Real Hybrid Model - Combines tree-level ML, plot-level ML, and agronomic formulas
                      </Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={() => {
                    setTreesCompletedForPlot(null);
                    setHybridYieldResult(null);
                    setSelectedPlotId(null);
                  }}
                >
                  <Ionicons name="refresh" size={16} color="#6B7280" />
                  <Text style={styles.resetButtonText}>Reset & Select New Plot</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Show Instructions */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>
                {selectedPlotId ? 'Ready for Tree Data Collection' : 'Select a Plot to Begin'}
              </Text>
            </View>
            
            <View style={styles.instructionContainer}>
              {!selectedPlotId ? (
                <View>
                  <Text style={styles.instructionTitle}>How to Use Hybrid Yield Prediction:</Text>
                  <Text style={styles.instructionText}>1. Select a plot with "HARVESTING" status from the dropdown above</Text>
                  <Text style={styles.instructionText}>2. Click "Add Tree Data" to collect measurements from 3 random trees</Text>
                  <Text style={styles.instructionText}>3. Get AI-powered hybrid prediction combining tree and plot data</Text>
                  
                  <View style={styles.benefitsContainer}>
                    <Text style={styles.benefitsTitle}>Why use hybrid prediction?</Text>
                    <Text style={styles.benefitsText}>• 30-45% more accurate than traditional methods</Text>
                    <Text style={styles.benefitsText}>• Combines tree-level ML with plot-level analysis</Text>
                    <Text style={styles.benefitsText}>• Accounts for individual tree variations</Text>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.instructionTitle}>Next Step: Tree Data Collection</Text>
                  <Text style={styles.instructionText}>
                    Plot selected: {getFilteredPlots().find(p => p.id === selectedPlotId)?.name}
                  </Text>
                  <Text style={styles.instructionText}>
                    Click "Add Tree Data" below to collect measurements from 3 random trees for hybrid yield prediction.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Farm Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Select Farm</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => {
              if (availableFarms.length === 0) {
                Alert.alert('No Farms Available', 'No farms found. Please create a farm first.');
                return;
              }
              
              Alert.alert(
                'Select Farm',
                'Choose a farm to view its plots:',
                availableFarms.map(farm => ({
                  text: `${farm.name} (${farm.num_plots} plots, ${farm.total_area} ha)`,
                  onPress: () => handleFarmChange(farm.id!),
                })).concat([
                  { text: 'Cancel', onPress: () => {} }
                ])
              );
            }}
          >
            <Text style={[styles.dropdownText, !selectedFarmId && styles.placeholderText]}>
              {getSelectedFarmName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {selectedFarmId && (
            <View style={styles.farmInfo}>
              {(() => {
                const farm = availableFarms.find(f => f.id === selectedFarmId);
                if (!farm) return null;
                const farmPlots = getFilteredPlots();
                const harvestingPlots = farmPlots.filter(p => p.status === 'HARVESTING');
                return (
                  <>
                    <Text style={styles.plotInfoText}>
                      <Ionicons name="location" size={14} color="#6B7280" /> Location: {farm.location}
                    </Text>
                    <Text style={styles.plotInfoText}>
                      <Ionicons name="resize" size={14} color="#6B7280" /> Total Area: {farm.total_area} hectares
                    </Text>
                    <Text style={styles.plotInfoText}>
                      <Ionicons name="grid" size={14} color="#6B7280" /> Plots: {farmPlots.length} total, {harvestingPlots.length} ready for harvest
                    </Text>
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* Plot Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Select Plot for Analysis</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => {
              if (!selectedFarmId) {
                Alert.alert('No Farm Selected', 'Please select a farm first.');
                return;
              }
              
              const filteredPlots = getFilteredPlots();
              if (filteredPlots.length === 0) {
                Alert.alert(
                  'No Plots Available', 
                  `No plots found in the selected farm. Please go to the Farm page to add plots to "${getSelectedFarmName()}" first.`,
                  [
                    { text: 'Cancel' },
                    { text: 'Go to Farms', onPress: () => {
                      console.log('Navigate to farms tab');
                    }}
                  ]
                );
                return;
              }
              
              const plotOptions = filteredPlots
                .filter(plot => {
                  return plot.status === 'HARVESTING'; // Only show plots ready for harvesting
                })
                .map(plot => ({
                  text: `${plot.name} (${plot.farm_name || 'Unknown Farm'}) - Status: ${plot.status}, ${plot.area} ha`,
                  onPress: () => setSelectedPlotId(plot.id!)
                }));
              
              if (plotOptions.length === 0) {
                const totalPlots = filteredPlots.length;
                const harvestingPlots = filteredPlots.filter(plot => plot.status === 'HARVESTING');
                const otherStatusPlots = filteredPlots.filter(plot => plot.status !== 'HARVESTING');
                
                Alert.alert(
                  'No Plots Ready for Harvesting', 
                  `Found ${totalPlots} total plots, but none have "HARVESTING" status. ${otherStatusPlots.length} plots have other statuses (${otherStatusPlots.map(p => p.status).join(', ')}). Only plots ready for harvest can be used for yield prediction.`,
                  [{ text: 'OK' }]
                );
                return;
              }
              
              // Add option to clear selection
              plotOptions.push({
                text: 'Clear Selection',
                onPress: () => {
                  setSelectedPlotId(null);
                  setTreesCompletedForPlot(null);
                  setHybridYieldResult(null);
                }
              });
              
              Alert.alert(
                'Select Plot',
                'Choose a mature plot for hybrid yield prediction:',
                plotOptions.map(option => ({ text: option.text, onPress: option.onPress }))
              );
            }}
          >
            <Text style={[styles.dropdownText, !selectedPlotId && styles.placeholderText]}>
              {getSelectedPlotName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          {selectedPlotId && (
            <View style={styles.plotInfo}>
              {(() => {
                const plot = getFilteredPlots().find(p => p.id === selectedPlotId);
                if (!plot) return null;
                const ageYears = (plot.age_months || 0) / 12;
                return (
                  <>
                    <Text style={styles.plotInfoText}>
                      <Ionicons name="business" size={14} color="#6B7280" /> Farm: {plot.farm_name || 'Unknown'}
                    </Text>
                    <Text style={styles.plotInfoText}>
                      <Ionicons name="time" size={14} color="#6B7280" /> Age: {ageYears.toFixed(1)} years
                    </Text>
                    <Text style={styles.plotInfoText}>
                      <Ionicons name="resize" size={14} color="#6B7280" /> Area: {plot.area} hectares
                    </Text>
                    <Text style={styles.plotInfoText}>
                      <Ionicons name="leaf" size={14} color="#6B7280" /> Status: {plot.status}
                    </Text>
                    {plot.farm_location && (
                      <Text style={styles.plotInfoText}>
                        <Ionicons name="location" size={14} color="#6B7280" /> Location: {plot.farm_location}
                      </Text>
                    )}
                  </>
                );
              })()}
            </View>
          )}
          
          {selectedPlotId && (
            <TouchableOpacity 
              style={[styles.addButton, styles.treeDataButton]}
              onPress={openTreeInputModal}
            >
              <Ionicons name="leaf" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Tree Data for Hybrid Prediction</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Yield Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="add-circle" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Add Your Yield Record</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.addButton, styles.fullButton]}
            onPress={() => setShowAddYieldModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Yield Record</Text>
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

        {/* Recent Hybrid Predictions Section */}
        {recentPredictions && recentPredictions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Recent Hybrid Predictions</Text>
            </View>
            
            {loadingPredictions ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <View style={styles.recordsContainer}>
                {recentPredictions.map((prediction, index) => {
                  const plotName = availablePlots.find(p => p.id === prediction.plot_id)?.name || `Plot ${prediction.plot_id}`;
                  const predictionDate = new Date(prediction.calculated_at);
                  
                  return (
                    <View key={prediction.id || index} style={styles.predictionCard}>
                      <View style={styles.predictionHeader}>
                        <Text style={styles.predictionPlotName}>{plotName}</Text>
                        <Text style={styles.predictionDate}>
                          {predictionDate.toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.predictionContent}>
                        <View style={styles.predictionStat}>
                          <Text style={styles.predictionLabel}>Predicted Yield</Text>
                          <Text style={styles.predictionValue}>
                            {prediction.final_hybrid_yield?.toFixed(1) || 'N/A'} kg
                          </Text>
                        </View>
                        <View style={styles.predictionStat}>
                          <Text style={styles.predictionLabel}>Confidence</Text>
                          <Text style={styles.predictionValue}>
                            {((prediction.confidence_score || 0) * 100).toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.predictionStat}>
                          <Text style={styles.predictionLabel}>Trees</Text>
                          <Text style={styles.predictionValue}>
                            {prediction.total_trees || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
```
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
              <Text style={styles.label}>{t('yield_weather.my_yield.yield_amount')}</Text>
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

      {/* Tree Input Modal */}
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={showTreeInputModal}
        onRequestClose={() => setShowTreeInputModal(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setShowTreeInputModal(false)}>
              <Ionicons name="close" size={24} color="#666666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEnteringTotalTrees 
                ? t('yield_weather.my_yield.total_trees')
                : `${t('yield_weather.my_yield.tree_input_method')} - ${t('yield_weather.my_yield.tree_of', { current: currentTreeIndex + 1, total: 3 })}`
              }
            </Text>

            {!isEnteringTotalTrees && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[styles.progressFill, { width: `${((currentTreeIndex + 1) / 3) * 100}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{currentTreeIndex + 1}/3 trees</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Step 1: Total Trees Input */}
              {isEnteringTotalTrees && (
                <View style={{ paddingTop: 20 }}>
                  <View style={[styles.formGroup, { backgroundColor: '#F0FDF4', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 2, borderColor: '#4CAF50' }]}>
                    <Text style={[styles.label, { fontSize: 16, marginBottom: 10, color: '#047857' }]}>{t('yield_weather.my_yield.total_trees')} *</Text>
                    <TextInput
                      style={[styles.input, { fontSize: 16, borderColor: '#4CAF50' }]}
                      value={totalTreesInPlot}
                      onChangeText={setTotalTreesInPlot}
                      placeholder="Enter total trees"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                    <Text style={[styles.helperText, { marginTop: 12, fontSize: 14, color: '#059669' }]}>
                      This helps calculate the total yield. You're sampling 3 random trees out of this total.
                    </Text>
                  </View>

                  <View style={styles.instructionContainer}>
                    <Text style={styles.instructionTitle}>
                      Next Steps:
                    </Text>
                    <Text style={styles.instructionText}>
                      After entering the total trees, you'll collect detailed measurements from 3 random trees in your plot for accurate yield prediction.
                    </Text>
                  </View>
                </View>
              )}

              {/* Step 2: Tree Data Entry */}
              {!isEnteringTotalTrees && treeData.length > 0 && currentTreeIndex < treeData.length && (
                <View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('yield_weather.my_yield.tree_code')}</Text>
                    <TextInput
                      style={styles.input}
                      value={treeData[currentTreeIndex].treeCode}
                      onChangeText={(text) => updateTreeData(currentTreeIndex, 'treeCode', text)}
                      placeholder="e.g., TREE_1"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('yield_weather.my_yield.stem_diameter')} *</Text>
                    <TextInput
                      style={styles.input}
                      value={treeData[currentTreeIndex].stem_diameter_mm}
                      onChangeText={(text) => updateTreeData(currentTreeIndex, 'stem_diameter_mm', text)}
                      placeholder="Enter diameter in mm"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('yield_weather.my_yield.number_of_stems')} *</Text>
                    <TextInput
                      style={styles.input}
                      value={treeData[currentTreeIndex].num_existing_stems}
                      onChangeText={(text) => updateTreeData(currentTreeIndex, 'num_existing_stems', text)}
                      placeholder="Enter number of stems"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Fertilizer Used</Text>
                    <TouchableOpacity 
                      style={[styles.dropdown, treeData[currentTreeIndex].fertilizer_used_tree && styles.activeOption]}
                      onPress={() => updateTreeData(currentTreeIndex, 'fertilizer_used_tree', !treeData[currentTreeIndex].fertilizer_used_tree)}
                    >
                      <Text style={styles.dropdownText}>
                        {treeData[currentTreeIndex].fertilizer_used_tree ? 'Yes' : 'No'}
                      </Text>
                      <Ionicons 
                        name={treeData[currentTreeIndex].fertilizer_used_tree ? "checkmark-circle" : "ellipse-outline"} 
                        size={20} 
                        color={treeData[currentTreeIndex].fertilizer_used_tree ? "#4CAF50" : "#9CA3AF"} 
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Disease Status</Text>
                    <View style={styles.optionGroup}>
                      {['none', 'mild', 'severe'].map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.optionButton,
                            treeData[currentTreeIndex].diseases_tree === status && styles.activeOption
                          ]}
                          onPress={() => updateTreeData(currentTreeIndex, 'diseases_tree', status)}
                        >
                          <Text style={[
                            styles.optionText,
                            treeData[currentTreeIndex].diseases_tree === status && styles.activeOptionText
                          ]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {treeData[currentTreeIndex].predicted_canes && (
                    <View style={styles.treePredictionContainer}>
                      <Text style={styles.predictionLabel}>Model 1 Prediction:</Text>
                      <Text style={styles.predictionValue}>
                        {treeData[currentTreeIndex].predicted_canes} canes per tree
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {isEnteringTotalTrees ? (
                /* Step 1: Next button to proceed to tree data entry */
                <TouchableOpacity
                  style={[styles.saveButton, { width: '100%' }, !totalTreesInPlot && styles.disabledButton]}
                  onPress={() => {
                    if (!totalTreesInPlot || parseInt(totalTreesInPlot) <= 0) {
                      Alert.alert('Required', 'Please enter the total number of trees in the plot.');
                      return;
                    }
                    setIsEnteringTotalTrees(false); // Move to tree data entry step
                  }}
                  disabled={!totalTreesInPlot}
                >
                  <Text style={styles.saveButtonText}>Next: Enter Tree Data</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                /* Step 2: Navigation buttons for tree data entry */
                <View style={styles.navigationButtons}>
                  <TouchableOpacity
                    style={[styles.navButton, currentTreeIndex === 0 && styles.disabledButton]}
                    onPress={previousTree}
                    disabled={currentTreeIndex === 0}
                  >
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    <Text style={styles.navButtonText}>Previous</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, treeSubmitting && styles.disabledButton]}
                    onPress={submitTreeData}
                    disabled={treeSubmitting}
                  >
                    {treeSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.saveButtonText}>
                          {currentTreeIndex === 2 ? 'Run Prediction' : 'Save & Next'}
                        </Text>
                        {currentTreeIndex < 2 && <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />}
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  treeButton: {
    backgroundColor: '#8B5CF6',
  },
  treeDataButton: {
    backgroundColor: '#8B5CF6',
    marginTop: 12,
    width: '100%',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  activeOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#4CAF50',
  },
  optionGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  activeOptionText: {
    color: '#059669',
  },
  treePredictionContainer: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 16,
  },
  predictionLabel: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 16,
    color: '#0C4A6E',
    fontWeight: '600',
  },
  modalActions: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 4,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hybridResultContainer: {
    marginTop: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  predictionBreakdown: {
    marginTop: 16,
  },
  predictionStep: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  stepDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  finalPrediction: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginTop: 8,
  },
  finalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    marginBottom: 4,
  },
  finalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#065F46',
  },
  yieldPerHectare: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  methodInfo: {
    backgroundColor: '#EDF2F7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  methodText: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  instructionContainer: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
  },
  plotInfo: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  farmInfo: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  plotInfoText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullButton: {
    flex: 1,
  },
  benefitsContainer: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  benefitsText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 18,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  predictionPlotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  predictionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  predictionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  predictionStat: {
    flex: 1,
    alignItems: 'center',
  },
  predictionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
});

export default MyYieldScreen;