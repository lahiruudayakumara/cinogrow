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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../../navigation/YieldWeatherNavigator';

// API imports
import { yieldAPI } from '../../../services/yield_weather/yieldAPI';
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

const YieldPredictorScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availablePlots, setAvailablePlots] = useState<PlotWithFarmInfo[]>([]);
  const [availableFarms, setAvailableFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);

  // Form state for predictions
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);

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
  const [readyToCollectTreeData, setReadyToCollectTreeData] = useState(false);

  // Collapsible sections state
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
  const [showReadyInstructions, setShowReadyInstructions] = useState(false);

  // Tree input interface
  interface TreeInputData {
    treeCode: string;
    stem_circumference_inches: string;     // numeric - main predictor (circumference in inches)
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
        stem_circumference_inches: '',
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

      // Load all required data
      const farmsData = await farmAPI.getFarms();

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
    return selectedFarm ? selectedFarm.name : t('yield_weather.my_yield.no_farm_selected');
  };

  // Handle farm selection change
  const handleFarmChange = (farmId: number) => {
    setSelectedFarmId(farmId);
    setSelectedPlotId(null); // Clear plot selection when farm changes
    setTreesCompletedForPlot(null);
    setHybridYieldResult(null);
    setReadyToCollectTreeData(false); // Reset ready state
    // Store in AsyncStorage and reload data
    AsyncStorage.setItem('selectedFarmId', farmId.toString()).then(() => {
      loadData();
    });
  };

  const getSelectedPlotName = () => {
    const plot = availablePlots.find(p => p.id === selectedPlotId);
    return plot ? plot.name : t('yield_weather.my_yield.no_plot_selected');
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
    if (!currentTree.stem_circumference_inches || !currentTree.num_existing_stems) {
      Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_yield.fill_stem_data'));
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
          stemCircumferenceInches: parseFloat(currentTree.stem_circumference_inches),
          numExistingStems: parseInt(currentTree.num_existing_stems),
        }
      };

      // Call tree creation API
      console.log('Tree data to submit:', treePayload);
      // TODO: Implement actual API call
      // const treeResponse = await yieldAPI.createTree(treePayload);

      Alert.alert(t('yield_weather.common.success'), t('yield_weather.my_yield.tree_data_saved', { number: currentTreeIndex + 1 }));

      // Move to next tree or trigger hybrid prediction if all trees are done
      if (currentTreeIndex < 2) {
        nextTree();
      } else {
        // All 3 trees are added, now run hybrid prediction
        await runHybridPrediction();
      }
    } catch (error) {
      console.error('Error submitting tree data:', error);
      Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_yield.failed_save_tree'));
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
        stem_circumference_inches: parseFloat(tree.stem_circumference_inches) || 0,
        fertilizer_used: tree.fertilizer_used_tree,
        disease_status: tree.diseases_tree as 'none' | 'mild' | 'severe',
        num_existing_stems: parseInt(tree.num_existing_stems) || 0,
      })));

      // Prepare tree sample data for API
      const sampleTrees = treeData.map(tree => ({
        tree_code: tree.treeCode,
        stem_circumference_inches: parseFloat(tree.stem_circumference_inches) || 0,
        fertilizer_used: tree.fertilizer_used_tree,
        fertilizer_type: tree.fertilizer_used_tree ? 'organic' as const : null,
        disease_status: tree.diseases_tree as 'none' | 'mild' | 'severe',
        num_existing_stems: parseInt(tree.num_existing_stems) || 1,
        tree_age_years: 4.0 // Default age for mobile predictions
      })).filter(tree => tree.stem_circumference_inches > 0 && tree.num_existing_stems > 0); // Only include valid trees

      if (sampleTrees.length < 3) {
        Alert.alert(t('yield_weather.my_yield.error_label'), t('yield_weather.my_yield.at_least_trees_required'));
        return;
      }

      // Validate total trees input
      const totalTrees = parseInt(totalTreesInPlot);
      if (!totalTrees || totalTrees <= 0) {
        Alert.alert(t('yield_weather.my_yield.error_label'), t('yield_weather.my_yield.enter_total_trees_plot'));
        return;
      }

      if (totalTrees < sampleTrees.length) {
        Alert.alert(t('yield_weather.my_yield.error_label'), t('yield_weather.my_yield.total_less_than_sample', { total: totalTrees, sample: sampleTrees.length }));
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
        t('yield_weather.my_yield.hybrid_prediction_complete'),
        t('yield_weather.my_yield.prediction_summary', {
          yield: transformedResult.hybridYield.toFixed(1),
          perHa: transformedResult.yieldPerHectare.toFixed(1),
          confidence: (transformedResult.confidence * 100).toFixed(1)
        }),
        [
          { text: t('yield_weather.my_yield.ok') }
        ]
      );
    } catch (error) {
      console.error('Error running hybrid prediction:', error);
      Alert.alert(
        t('yield_weather.my_yield.hybrid_prediction_error'),
        `${t('yield_weather.my_yield.failed_hybrid_prediction')}: ${error instanceof Error ? error.message : t('yield_weather.my_yield.unknown_error')}\n\n${t('yield_weather.my_yield.check_tree_data')}`
      );
    } finally {
      setTreeSubmitting(false);
    }
  };

  const openTreeInputModal = () => {
    if (!selectedPlotId) {
      Alert.alert(t('yield_weather.my_yield.notice'), t('yield_weather.my_yield.please_select_plot'));
      return;
    }

    // Check if selected plot is suitable for tree input (age > 3, planted)
    const selectedPlot = availablePlots.find(p => p.id === selectedPlotId);
    if (!selectedPlot) {
      Alert.alert(t('yield_weather.my_yield.error_label'), t('yield_weather.my_yield.selected_plot_not_found'));
      return;
    }

    // Check if plot meets criteria for hybrid prediction
    const plotAgeMonths = selectedPlot.age_months || 0;
    const plotAgeYears = plotAgeMonths / 12;
    if (plotAgeYears <= 3) {
      Alert.alert(
        t('yield_weather.my_yield.plot_not_ready'),
        t('yield_weather.my_yield.plot_age_message', { age: plotAgeYears.toFixed(1) }),
        [{ text: t('yield_weather.my_yield.ok') }]
      );
      return;
    }

    Alert.alert(
      t('yield_weather.my_yield.tree_data_collection'),
      t('yield_weather.my_yield.collection_message', { plotName: selectedPlot.name }),
      [
        { text: t('yield_weather.my_yield.cancel'), style: 'cancel' },
        {
          text: t('yield_weather.my_yield.start_collection'), onPress: () => {
            initializeTreeData();
            setTotalTreesInPlot(''); // Reset total trees input
            setIsEnteringTotalTrees(true); // Start with total trees step
            setShowTreeInputModal(true);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t('yield_weather.my_yield.loading')}</Text>
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
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.title}>{t('yield_weather.my_yield.prediction_title')}</Text>
          </View>
          <Text style={styles.subtitle}>
            {t('yield_weather.my_yield.prediction_subtitle')}
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadData()} style={styles.retryButton}>
              <Text style={styles.retryText}>{t('yield_weather.my_yield.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MAIN PREDICTION SECTION - with clear visual container */}
        <View style={styles.mainPredictionSection}>
          {/* Section Badge */}
          <View style={styles.sectionBadge}>
            <Ionicons name="analytics-outline" size={16} color="#4CAF50" />
            <Text style={styles.sectionBadgeText}>AI YIELD PREDICTION</Text>
          </View>

          {/* Prediction Content */}
          {selectedPlotId && treesCompletedForPlot === selectedPlotId ? (
            /* Show Hybrid Prediction Results */
            <View>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.resultHeaderText}>{t('yield_weather.my_yield.ai_prediction_results')}</Text>
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
                        <Text style={styles.finalLabel}>{t('yield_weather.my_yield.final_hybrid_yield')}</Text>
                        <Text style={styles.finalValue}>
                          {hybridYieldResult.hybridYield?.toFixed(1) || 'N/A'} {t('yield_weather.my_yield.kg_suffix')}
                        </Text>
                        <Text style={styles.yieldPerHectare}>
                          ({hybridYieldResult.yieldPerHectare?.toFixed(1) || 'N/A'} {t('yield_weather.my_yield.kg_ha_suffix')})
                        </Text>
                        
                        {/* Dry Yield and Market Value Section */}
                        <View style={styles.economicInfo}>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                              {t('yield_weather.my_yield.dry_yield_label')}
                            </Text>
                            <Text style={styles.infoValue}>
                              {((hybridYieldResult.hybridYield || 0) * 0.05).toFixed(1)} {t('yield_weather.my_yield.kg_suffix')}
                            </Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabelBold}>
                              {t('yield_weather.my_yield.market_value_label')}
                            </Text>
                            <Text style={styles.infoValueBold}>
                              LKR {(((hybridYieldResult.hybridYield || 0) * 0.05) * 3685).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.confidenceText}>
                          {t('yield_weather.my_yield.overall_confidence')}: {((hybridYieldResult.confidence || 0) * 100).toFixed(1)}%
                        </Text>
                      </View>


                      {/* Method Information */}
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodText}>
                          {t('yield_weather.my_yield.method_info')}
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
                    <Ionicons name="refresh" size={16} color="#4CAF50" />
                    <Text style={styles.resetButtonText}>{t('yield_weather.my_yield.reset_select_new')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* Show Instructions and Selection UI */
            <View>
              <TouchableOpacity
                style={styles.instructionHeader}
                onPress={() => !selectedPlotId ? setShowHowToUse(!showHowToUse) : setShowNextSteps(!showNextSteps)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="information-circle-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                  <Text style={styles.instructionHeaderText}>
                    {selectedPlotId ? t('yield_weather.my_yield.ready_tree_data_collection') : t('yield_weather.my_yield.select_plot_begin')}
                  </Text>
                  <Ionicons
                    name={(!selectedPlotId ? showHowToUse : showNextSteps) ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#4CAF50"
                    style={{ marginLeft: 'auto' }}
                  />
                </View>
              </TouchableOpacity>

              {!selectedPlotId && showHowToUse && (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionTitle}>{t('yield_weather.my_yield.how_to_use_hybrid')}</Text>
                  <Text style={styles.instructionText}>{t('yield_weather.my_yield.step_1_select_plot')}</Text>
                  <Text style={styles.instructionText}>{t('yield_weather.my_yield.step_2_add_tree_data')}</Text>
                  <Text style={styles.instructionText}>{t('yield_weather.my_yield.step_3_get_prediction')}</Text>

                  <View style={styles.benefitsContainer}>
                    <Text style={styles.benefitsTitle}>{t('yield_weather.my_yield.why_hybrid_title')}</Text>
                    <Text style={styles.benefitsText}>{t('yield_weather.my_yield.benefit_1_accuracy')}</Text>
                    <Text style={styles.benefitsText}>{t('yield_weather.my_yield.benefit_2_combines')}</Text>
                    <Text style={styles.benefitsText}>{t('yield_weather.my_yield.benefit_3_accounts')}</Text>
                  </View>
                </View>
              )}

              {selectedPlotId && showNextSteps && (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionTitle}>{t('yield_weather.my_yield.next_step_tree_data')}</Text>
                  <Text style={styles.instructionText}>
                    {t('yield_weather.my_yield.plot_selected')}: {getFilteredPlots().find(p => p.id === selectedPlotId)?.name}
                  </Text>
                  <Text style={styles.instructionText}>
                    {t('yield_weather.my_yield.click_add_tree_data')}
                  </Text>
                </View>
              )}

              {/* Farm Selection */}
              {!(treesCompletedForPlot && treesCompletedForPlot === selectedPlotId) && (
                <View style={styles.selectionGroup}>
                  <View style={styles.selectionHeader}>
                    <Ionicons name="business-outline" size={18} color="#374151" />
                    <Text style={styles.selectionLabel}>{t('yield_weather.my_yield.select_farm')}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.selectionDropdown}
                    onPress={() => {
                      if (availableFarms.length === 0) {
                        Alert.alert(t('yield_weather.my_yield.no_farms_available'), t('yield_weather.my_yield.no_farms_message'));
                        return;
                      }

                      Alert.alert(
                        t('yield_weather.my_yield.select_farm'),
                        t('yield_weather.my_yield.select_farm_message'),
                        availableFarms.map(farm => ({
                          text: `${farm.name} (${farm.num_plots} ${t('yield_weather.my_yield.plots_info')}, ${farm.total_area} ${t('yield_weather.my_yield.ha_suffix')})`,
                          onPress: () => handleFarmChange(farm.id!),
                        })).concat([
                          { text: t('yield_weather.my_yield.cancel'), onPress: () => { } }
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
                    <View style={styles.infoBox}>
                      {(() => {
                        const farm = availableFarms.find(f => f.id === selectedFarmId);
                        if (!farm) return null;
                        const farmPlots = getFilteredPlots();
                        const harvestingPlots = farmPlots.filter(p => p.status === 'HARVESTING');
                        return (
                          <>
                            <Text style={styles.infoText}>
                              <Ionicons name="location" size={14} color="#6B7280" /> {t('yield_weather.my_yield.location_label')}: {farm.location}
                            </Text>
                            <Text style={styles.infoText}>
                              <Ionicons name="resize" size={14} color="#6B7280" /> {t('yield_weather.my_yield.total_area_label')}: {farm.total_area} {t('yield_weather.my_yield.hectares_suffix')}
                            </Text>
                            <Text style={styles.infoText}>
                              <Ionicons name="grid" size={14} color="#6B7280" /> {t('yield_weather.my_yield.plots_info')}: {t('yield_weather.my_yield.total_ready_harvest', { total: farmPlots.length, ready: harvestingPlots.length })}
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                  )}
                </View>
              )}

              {/* Plot Selection */}
              {!(treesCompletedForPlot && treesCompletedForPlot === selectedPlotId) && (
                <View style={styles.selectionGroup}>
                  <View style={styles.selectionHeader}>
                    <Ionicons name="location-outline" size={18} color="#374151" />
                    <Text style={styles.selectionLabel}>{t('yield_weather.my_yield.select_plot_analysis')}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.selectionDropdown}
                    onPress={() => {
                      if (!selectedFarmId) {
                        Alert.alert(t('yield_weather.my_yield.no_farm_selected'), t('yield_weather.my_yield.no_farms_message'));
                        return;
                      }

                      const filteredPlots = getFilteredPlots();
                      if (filteredPlots.length === 0) {
                        Alert.alert(
                          t('yield_weather.my_yield.no_plots_available'),
                          t('yield_weather.my_yield.no_plots_message', { farmName: getSelectedFarmName() }),
                          [
                            { text: t('yield_weather.my_yield.cancel') },
                            {
                              text: t('yield_weather.my_yield.go_to_farms'), onPress: () => {
                                console.log('Navigate to farms tab');
                              }
                            }
                          ]
                        );
                        return;
                      }

                      const plotOptions = filteredPlots
                        .filter(plot => {
                          return plot.status === 'HARVESTING'; // Only show plots ready for harvesting
                        })
                        .map(plot => ({
                          text: `${plot.name} (${plot.farm_name || t('yield_weather.my_yield.unknown_plot')}) - ${t('yield_weather.my_yield.status_label')}: ${plot.status}, ${plot.area} ${t('yield_weather.my_yield.ha_suffix')}`,
                          onPress: () => setSelectedPlotId(plot.id!)
                        }));

                      if (plotOptions.length === 0) {
                        const totalPlots = filteredPlots.length;
                        const harvestingPlots = filteredPlots.filter(plot => plot.status === 'HARVESTING');
                        const otherStatusPlots = filteredPlots.filter(plot => plot.status !== 'HARVESTING');

                        Alert.alert(
                          t('yield_weather.my_yield.no_plots_harvesting'),
                          t('yield_weather.my_yield.found_plots_message', {
                            total: totalPlots,
                            other: otherStatusPlots.length,
                            statuses: otherStatusPlots.map(p => p.status).join(', ')
                          }),
                          [{ text: t('yield_weather.my_yield.ok') }]
                        );
                        return;
                      }

                      // Add option to clear selection
                      plotOptions.push({
                        text: t('yield_weather.my_yield.clear_selection'),
                        onPress: () => {
                          setSelectedPlotId(null);
                          setTreesCompletedForPlot(null);
                          setHybridYieldResult(null);
                        }
                      });

                      Alert.alert(
                        t('yield_weather.my_yield.select_plot'),
                        t('yield_weather.my_yield.select_plot_message'),
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
                    <View style={styles.infoBox}>
                      {(() => {
                        const plot = getFilteredPlots().find(p => p.id === selectedPlotId);
                        if (!plot) return null;
                        const ageYears = (plot.age_months || 0) / 12;
                        return (
                          <>
                            <Text style={styles.infoText}>
                              <Ionicons name="business" size={14} color="#6B7280" /> {t('yield_weather.my_yield.farm')}: {plot.farm_name || t('yield_weather.common.unknown')}
                            </Text>
                            <Text style={styles.infoText}>
                              <Ionicons name="time" size={14} color="#6B7280" /> {t('yield_weather.my_yield.age_label')}: {ageYears.toFixed(1)} {t('yield_weather.my_yield.years_suffix')}
                            </Text>
                            <Text style={styles.infoText}>
                              <Ionicons name="resize" size={14} color="#6B7280" /> {t('yield_weather.my_yield.area_label')}: {plot.area} {t('yield_weather.my_yield.hectares_suffix')}
                            </Text>
                            <Text style={styles.infoText}>
                              <Ionicons name="leaf" size={14} color="#6B7280" /> {t('yield_weather.my_yield.status_label')}: {plot.status}
                            </Text>
                            {plot.farm_location && (
                              <Text style={styles.infoText}>
                                <Ionicons name="location" size={14} color="#6B7280" /> {t('yield_weather.my_yield.location_label')}: {plot.farm_location}
                              </Text>
                            )}
                          </>
                        );
                      })()}
                    </View>
                  )}

                  {selectedPlotId && !readyToCollectTreeData && (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => setReadyToCollectTreeData(true)}
                    >
                      <Text style={styles.primaryButtonText}>{t('yield_weather.common.next')}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Ready to Collect Tree Data */}
              {selectedPlotId && readyToCollectTreeData && !(treesCompletedForPlot && treesCompletedForPlot === selectedPlotId) && (
                <View style={styles.treeDataSection}>
                  <TouchableOpacity
                    style={styles.instructionHeader}
                    onPress={() => setShowReadyInstructions(!showReadyInstructions)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons name="leaf-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                      <Text style={styles.instructionHeaderText}>{t('yield_weather.my_yield.ready_tree_data_collection')}</Text>
                      <Ionicons
                        name={showReadyInstructions ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#4CAF50"
                        style={{ marginLeft: 'auto' }}
                      />
                    </View>
                  </TouchableOpacity>

                  {showReadyInstructions && (
                    <View style={styles.instructionContainer}>
                      <Text style={styles.instructionText}>
                        {t('yield_weather.my_yield.click_add_tree_data')}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={openTreeInputModal}
                  >
                    <Ionicons name="leaf" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('yield_weather.my_yield.add_tree_data')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* DIVIDER */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
        </View>

        {/* RECENT AI PREDICTIONS SECTION - Clearly separate */}
        {recentPredictions && recentPredictions.length > 0 && (
          <View style={styles.historySectionContainer}>
            {/* Section Badge */}
            <View style={styles.sectionBadge}>
              <Ionicons name="time-outline" size={16} color="#6366F1" />
              <Text style={[styles.sectionBadgeText, { color: '#6366F1' }]}>PREDICTION HISTORY</Text>
            </View>

            <View style={styles.historyHeader}>
              <Ionicons name="archive-outline" size={24} color="#6366F1" />
              <Text style={styles.historyHeaderText}>{t('yield_weather.my_yield.recent_ai_predictions')}</Text>
            </View>

            {loadingPredictions ? (
              <ActivityIndicator size="small" color="#6366F1" style={{ marginTop: 16 }} />
            ) : (
              <View style={styles.historyCardsContainer}>
                {recentPredictions.slice(0, 2).map((prediction, index) => {
                  const plotName = availablePlots.find(p => p.id === prediction.plot_id)?.name || `Plot ${prediction.plot_id}`;
                  const predictionDate = new Date(prediction.calculated_at);

                  return (
                    <View key={prediction.id || index} style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyCardTitleRow}>
                          <Ionicons name="location" size={16} color="#6366F1" />
                          <Text style={styles.historyPlotName}>{plotName}</Text>
                        </View>
                        <Text style={styles.historyDate}>
                          {predictionDate.toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.historyCardContent}>
                        <View style={styles.historyStat}>
                          <Text style={styles.historyStatLabel}>{t('yield_weather.my_yield.predicted_yield')}</Text>
                          <Text style={styles.historyStatValue}>
                            {prediction.final_hybrid_yield?.toFixed(1) || 'N/A'} {t('yield_weather.my_yield.kg_suffix')}
                          </Text>
                        </View>
                        <View style={styles.historyStatDivider} />
                        <View style={styles.historyStat}>
                          <Text style={styles.historyStatLabel}>{t('yield_weather.my_yield.confidence')}</Text>
                          <Text style={styles.historyStatValue}>
                            {((prediction.confidence_score || 0) * 100).toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.historyStatDivider} />
                        <View style={styles.historyStat}>
                          <Text style={styles.historyStatLabel}>{t('yield_weather.my_yield.trees')}</Text>
                          <Text style={styles.historyStatValue}>
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

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

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
                      placeholder={t('yield_weather.my_yield.enter_total_trees')}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                    <Text style={[styles.helperText, { marginTop: 12, fontSize: 14, color: '#059669' }]}>
                      {t('yield_weather.my_yield.step_1_select_plot')}
                    </Text>
                  </View>

                  <View style={styles.instructionContainer}>
                    <Text style={styles.instructionTitle}>
                      {t('yield_weather.my_yield.next_steps_title')}
                    </Text>
                    <Text style={styles.instructionText}>
                      {t('yield_weather.my_yield.tree_measurement_info')}
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
                      placeholder={t('yield_weather.my_yield.tree_code_placeholder')}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('yield_weather.my_yield.stem_circumference')} *</Text>
                    <TextInput
                      style={styles.input}
                      value={treeData[currentTreeIndex].stem_circumference_inches}
                      onChangeText={(text) => updateTreeData(currentTreeIndex, 'stem_circumference_inches', text)}
                      placeholder={t('yield_weather.my_yield.enter_circumference_placeholder')}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('yield_weather.my_yield.number_of_stems')} *</Text>
                    <TextInput
                      style={styles.input}
                      value={treeData[currentTreeIndex].num_existing_stems}
                      onChangeText={(text) => updateTreeData(currentTreeIndex, 'num_existing_stems', text)}
                      placeholder={t('yield_weather.my_yield.enter_stems_placeholder')}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('yield_weather.my_yield.fertilizer_used_label')}</Text>
                    <TouchableOpacity
                      style={[styles.dropdown, treeData[currentTreeIndex].fertilizer_used_tree && styles.activeOption]}
                      onPress={() => updateTreeData(currentTreeIndex, 'fertilizer_used_tree', !treeData[currentTreeIndex].fertilizer_used_tree)}
                    >
                      <Text style={styles.dropdownText}>
                        {treeData[currentTreeIndex].fertilizer_used_tree ? t('yield_weather.my_yield.yes') : t('yield_weather.my_yield.no')}
                      </Text>
                      <Ionicons
                        name={treeData[currentTreeIndex].fertilizer_used_tree ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={treeData[currentTreeIndex].fertilizer_used_tree ? "#4CAF50" : "#9CA3AF"}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('yield_weather.my_yield.disease_status_label')}</Text>
                    <View style={styles.optionGroup}>
                      {['none', 'mild', 'severe'].map((status) => {
                        const labelKey = status === 'none' ? 'disease_none_label' :
                          status === 'mild' ? 'disease_mild_label' : 'disease_severe_label';
                        return (
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
                              {t(`yield_weather.my_yield.${labelKey}`)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {treeData[currentTreeIndex].predicted_canes && (
                    <View style={styles.treePredictionContainer}>
                      <Text style={styles.predictionLabel}>{t('yield_weather.my_yield.model_prediction_label')}</Text>
                      <Text style={styles.predictionValue}>
                        {treeData[currentTreeIndex].predicted_canes} {t('yield_weather.my_yield.canes_per_tree')}
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
                      Alert.alert(t('yield_weather.my_yield.required_title'), t('yield_weather.my_yield.enter_total_trees_required'));
                      return;
                    }
                    setIsEnteringTotalTrees(false); // Move to tree data entry step
                  }}
                  disabled={!totalTreesInPlot}
                >
                  <Text style={styles.saveButtonText}>{t('yield_weather.my_yield.next_enter_tree_data')}</Text>
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
                    <Text style={styles.navButtonText}>{t('yield_weather.my_yield.previous_button')}</Text>
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
                          {currentTreeIndex === 2 ? t('yield_weather.my_yield.run_prediction_button') : t('yield_weather.my_yield.save_next_button')}
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
    marginTop: Platform.OS === 'android' ? 0 : -70,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#DC2626',
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

  // MAIN PREDICTION SECTION STYLES
  mainPredictionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 6,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  resultHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  instructionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  instructionContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 20,
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
  selectionGroup: {
    marginBottom: 20,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  selectionDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
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
    fontSize: 15,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  treeDataSection: {
    marginTop: 8,
  },

  // DIVIDER STYLES
  sectionDivider: {
    marginVertical: 32,
    alignItems: 'center',
  },
  dividerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#E5E7EB',
  },

  // HISTORY SECTION STYLES
  historySectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  historyHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  historyCardsContainer: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyPlotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyStat: {
    flex: 1,
    alignItems: 'center',
  },
  historyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  historyStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  historyStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },

  // RESULTS STYLES (kept from original)
  hybridResultContainer: {
    marginTop: 0,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  plotName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  predictionBreakdown: {
    gap: 12,
  },
  finalPrediction: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  finalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    marginBottom: 8,
  },
  finalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 4,
  },
  yieldPerHectare: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '500',
    marginBottom: 16,
  },
  economicInfo: {
    gap: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  infoRow: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'center',
  },
  infoLabelBold: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  infoValueBold: {
    fontSize: 17,
    color: '#047857',
    fontWeight: '800',
    textAlign: 'center',
  },
  confidenceText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '500',
  },
  predictionStep: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 10,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  stepDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  methodInfo: {
    backgroundColor: '#EDF2F7',
    padding: 12,
    borderRadius: 8,
  },
  methodText: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // MODAL STYLES (kept from original)
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
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
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
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
    borderRadius: 8,
    gap: 4,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default YieldPredictorScreen;