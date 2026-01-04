import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import apiConfig from '../../../config/api';

// Use localhost for web platform, otherwise use the configured API URL
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

export default function OilYieldPredictorSecond() {
  const { t } = useTranslation();
  type MaterialBatch = {
    id: number;
    batch_name?: string | null;
    cinnamon_type: string;
    mass_kg: number;
    plant_part: string;
    plant_age_years: number;
    harvest_season: string;
  };

  const [batches, setBatches] = useState<MaterialBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const selectedBatch = batches.find(b => b.id === selectedBatchId) || null;
  const [predictedYield, setPredictedYield] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputSummary, setInputSummary] = useState<any>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/oil_yield/batch`);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Failed to load batches: ${res.status} ${errText}`);
        }
        const data: MaterialBatch[] = await res.json();
        setBatches(data);
      } catch (e: any) {
        console.error('❌ Failed to fetch batches', e);
        Alert.alert(t('oil_yield.predictor.alerts.load_error'), e.message || t('yield_weather.common.unknown_error'));
      }
    };
    fetchBatches();
  }, []);

  const handlePredict = async () => {
    console.log('🔍 handlePredict called');
    console.log('API_BASE_URL:', API_BASE_URL);
    
    // Validation
    if (!selectedBatch) {
      console.log('❌ Validation failed - no batch selected');
      Alert.alert(t('oil_yield.predictor.alerts.missing_info'), t('oil_yield.predictor.alerts.select_batch_prompt'));
      return;
    }

    setLoading(true);
    setPredictedYield(null);
    setRecommendation(null);
    setInputSummary(null);

    const requestBody = {
      dried_mass_kg: selectedBatch.mass_kg,
      species_variety: selectedBatch.cinnamon_type,
      plant_part: selectedBatch.plant_part,
      age_years: selectedBatch.plant_age_years,
      harvesting_season: selectedBatch.harvest_season,
    };

    console.log('📤 Sending request to:', `${API_BASE_URL}/oil_yield/predict`);
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(`${API_BASE_URL}/oil_yield/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Response data:', JSON.stringify(data, null, 2));
      
      // Set prediction results
      const yieldInML = (data.predicted_yield_liters * 1000).toFixed(2);
      console.log('📊 Calculated yield in mL:', yieldInML);
      
      setPredictedYield(yieldInML);
      setInputSummary(data.input_summary);

      // Generate recommendations based on results
      const recommendations = generateRecommendations(
        data.predicted_yield_liters,
        selectedBatch.plant_part,
        selectedBatch.cinnamon_type,
        selectedBatch.harvest_season
      );
      console.log('💡 Generated recommendations:', recommendations);
      setRecommendation(JSON.stringify(recommendations));

      console.log('✅ Prediction completed successfully');

    } catch (error: any) {
      console.error('❌ Prediction error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert(
        t('oil_yield.predictor.alerts.prediction_failed'),
        `Unable to connect to the prediction service.\n\nError: ${error.message}\n\nAPI URL: ${API_BASE_URL}/oil_yield/predict\n\nPlease check your connection and try again.`
      );
    } finally {
      setLoading(false);
      console.log('🏁 handlePredict finished');
    }
  };

  const generateRecommendations = (
    yieldLiters: number,
    plantPart: string,
    variety: string,
    season: string
  ) => {
    const recommendations = {
      primary: '',
      tips: [] as string[],
      quality: '',
    };

    if (plantPart === 'Leaves & Twigs') {
      recommendations.primary = `Good yield potential! Leaves & Twigs typically produce higher oil volumes.`;
      recommendations.tips = [
        'Maintain distillation temperature at 100-105°C',
        'Ensure consistent steam flow throughout process',
        `Your ${variety} variety is well-suited for this extraction`,
        'Leaves & Twigs are rich in eugenol content',
      ];
    } else {
      recommendations.primary = `Quality-focused extraction from Featherings & Chips.`;
      recommendations.tips = [
        'Extend distillation time for optimal extraction',
        'Featherings & Chips produce concentrated oil',
        'Monitor moisture content carefully',
        `Ideal for processing during ${season}`,
      ];
    }

    if (yieldLiters >= 5.0) {
      recommendations.quality = 'Excellent yield - Premium quality grade achieved, suitable for high-end applications.';
    } else if (yieldLiters >= 2.0) {
      recommendations.quality = 'Good yield - Standard commercial grade, ideal for food flavoring and aromatherapy.';
    } else {
      recommendations.quality = 'Moderate yield - Consider optimizing parameters for better results.';
    }

    return recommendations;
  };

  const RadioOption = ({ label, value, selected, onSelect, color }: {
    label: string;
    value: string;
    selected: boolean;
    onSelect: () => void;
    color: string;
  }) => (
    <TouchableOpacity
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[styles.radioCircle, selected && { borderColor: color }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: color }]} />}
      </View>
      <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
      {selected && (
        <MaterialCommunityIcons name="check" size={18} color={color} style={styles.radioCheck} />
      )}
    </TouchableOpacity>
  );

  const PredictButton = () => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 50,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.predictButton}
          onPress={handlePredict}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          disabled={loading}
        >
          <BlurView intensity={100} tint="dark" style={styles.predictButtonBlur}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.predictText}>{t('oil_yield.predictor.buttons.predicting')}</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="chart-line" size={20} color="#FFFFFF" />
                <Text style={styles.predictText}>{t('oil_yield.predictor.buttons.predict')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
              </>
            )}
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const MetricCard = ({ icon, label, value, unit, color, progress }: {
    icon: string;
    label: string;
    value: string;
    unit?: string;
    color: string;
    progress?: number;
  }) => (
    <View style={styles.metricCard}>
      <BlurView intensity={70} tint="light" style={styles.metricBlur}>
        <View style={[styles.metricIconCircle, { backgroundColor: `${color}20` }]}>
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.metricValueContainer}>
          <Text style={[styles.metricValue, { color }]}>{value}</Text>
          {unit && <Text style={styles.metricUnit}>{unit}</Text>}
        </View>
        {progress !== undefined && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </BlurView>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header with Icon */}
        <View style={styles.headerContainer}>
          <View style={styles.headerIconContainer}>
            <View style={styles.headerIconCircle}>
              <MaterialCommunityIcons name="flask-outline" size={28} color="#4aab4e" />
            </View>
          </View>
          <Text style={styles.header}>{t('oil_yield.predictor.header.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('oil_yield.predictor.header.subtitle')}
          </Text>
        </View>

        {/* Quick Info Banner */}
        {/* <View style={styles.infoBanner}>
          <BlurView intensity={50} tint="light" style={styles.infoBannerBlur}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons name="information" size={20} color="#0A84FF" />
              <Text style={styles.infoBannerText}>Select a batch to predict</Text>
            </View>
          </BlurView>
        </View> */}

        {/* Batch Selection Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('oil_yield.predictor.batch.title')}</Text>
          
        </View>
        
        {/* Material Batch Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#34C759" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.predictor.batch.select_batch')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.predictor.batch.select_batch_subtext')}</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              {batches.length === 0 ? (
                <Text style={styles.labelSubtext}>{t('oil_yield.predictor.batch.no_batches')}</Text>
              ) : (
                batches.map((b) => {
                  const label = b.batch_name
                    ? `${b.batch_name} • ${b.cinnamon_type} • ${b.plant_part} • ${b.mass_kg}kg`
                    : `${b.cinnamon_type} • ${b.plant_part} • ${b.mass_kg}kg`;
                  return (
                    <RadioOption
                      key={b.id}
                      label={label}
                      value={String(b.id)}
                      selected={selectedBatchId === b.id}
                      onSelect={() => setSelectedBatchId(b.id)}
                      color="#34C759"
                    />
                  );
                })
              )}
            </View>
          </BlurView>
        </View>

        {/* Predict Button */}
        <PredictButton />

        {/* Output Section */}
        {predictedYield && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('oil_yield.predictor.results.title')}</Text>
              <View style={styles.successBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#4aab4e" />
                <Text style={styles.successText}>{t('oil_yield.predictor.results.status_complete')}</Text>
              </View>
            </View>

            {/* Main Yield Result Card */}
            <View style={styles.resultCard}>
              <BlurView intensity={70} tint="light" style={styles.resultBlur}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultIconContainer}>
                    <MaterialCommunityIcons name="flask" size={32} color="#4aab4e" />
                  </View>
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultBadgeText}>{t('oil_yield.predictor.results.badge_predicted')}</Text>
                  </View>
                </View>
                <Text style={styles.resultTitle}>{t('oil_yield.predictor.results.yield_title')}</Text>
                <View style={styles.resultValueRow}>
                  <Text style={styles.resultValue}>{predictedYield}</Text>
                  <Text style={styles.resultValueUnit}>{t('oil_yield.predictor.results.unit_ml')}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultMeta}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{t('oil_yield.predictor.results.meta_just_now')}</Text>
                  <View style={styles.resultMetaDot} />
                  <MaterialCommunityIcons name="leaf" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{selectedBatch?.cinnamon_type || '-'}</Text>
                </View>
              </BlurView>
            </View>

            {/* Input Summary Card */}
            {inputSummary && (
              <View style={styles.inputSummaryCard}>
                <BlurView intensity={70} tint="light" style={styles.cardBlur}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconCircle}>
                      <MaterialCommunityIcons name="information" size={20} color="#0A84FF" />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.label}>{t('oil_yield.predictor.results.input_summary.title')}</Text>
                      <Text style={styles.labelSubtext}>{t('oil_yield.predictor.results.input_summary.subtitle')}</Text>
                    </View>
                  </View>
                  <View style={styles.summaryContent}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('oil_yield.predictor.results.input_summary.dried_mass')}</Text>
                      <Text style={styles.summaryValue}>{inputSummary.dried_mass_kg} kg</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('oil_yield.predictor.results.input_summary.species')}</Text>
                      <Text style={styles.summaryValue}>{inputSummary.species_variety}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('oil_yield.predictor.results.input_summary.plant_part')}</Text>
                      <Text style={styles.summaryValue}>{inputSummary.plant_part}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('oil_yield.predictor.results.input_summary.age')}</Text>
                      <Text style={styles.summaryValue}>{inputSummary.age_years} {t('oil_yield.predictor.results.input_summary.years_suffix')}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('oil_yield.predictor.results.input_summary.season')}</Text>
                      <Text style={styles.summaryValue}>{inputSummary.harvesting_season}</Text>
                    </View>
                  </View>
                </BlurView>
              </View>
            )}

            {/* Metrics Grid */}
            {/* <View style={styles.metricsGrid}>
              <MetricCard
                icon="speedometer"
                label="Efficiency"
                value={efficiency?.toString() || '0'}
                unit="%"
                color="#5E5CE6"
                progress={efficiency || 0}
              />
              <MetricCard
                icon="star"
                label="Quality Score"
                value={qualityScore?.toString() || '0'}
                unit="/100"
                color="#FF9F0A"
                progress={qualityScore || 0}
              />
            </View> */}

            {/* Value Estimation Card */}
            {/* <View style={styles.valueCard}>
              <BlurView intensity={70} tint="light" style={styles.valueBlur}>
                <View style={styles.valueHeader}>
                  <View style={styles.valueIconCircle}>
                    <MaterialCommunityIcons name="cash-multiple" size={24} color="#34C759" />
                  </View>
                  <View style={styles.valueHeaderText}>
                    <Text style={styles.valueLabel}>Estimated Value</Text>
                    <Text style={styles.valueSubtext}>Market price estimate</Text>
                  </View>
                </View>
                <View style={styles.valueAmountContainer}>
                  <Text style={styles.valueCurrency}>$</Text>
                  <Text style={styles.valueAmount}>{estimatedValue}</Text>
                  <Text style={styles.valueUnit}>USD</Text>
                </View>
                <View style={styles.valueFooter}>
                  <View style={styles.valueInfoItem}>
                    <MaterialCommunityIcons name="trending-up" size={16} color="#34C759" />
                    <Text style={styles.valueInfoText}>Market rate</Text>
                  </View>
                  <View style={styles.valueInfoItem}>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#0A84FF" />
                    <Text style={styles.valueInfoText}>Verified</Text>
                  </View>
                </View>
              </BlurView>
            </View> */}

            {/* Recommendation Card */}
            <View style={styles.recommendationCard}>
              <BlurView intensity={70} tint="light" style={styles.recommendationBlur}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIconCircle}>
                    <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FF9F0A" />
                  </View>
                  <Text style={styles.recommendationTitle}>{t('oil_yield.predictor.results.recommendations.title')}</Text>
                </View>
                
                {recommendation && (() => {
                  const rec = JSON.parse(recommendation);
                  return (
                    <>
                      {/* Primary Recommendation */}
                      <View style={styles.recommendationPrimary}>
                        <MaterialCommunityIcons name="check-circle" size={18} color="#4aab4e" />
                        <Text style={styles.recommendationPrimaryText}>{rec.primary}</Text>
                      </View>

                      {/* Tips Section */}
                      <View style={styles.recommendationSection}>
                        <Text style={styles.recommendationSectionTitle}>{t('oil_yield.predictor.results.recommendations.best_practices')}</Text>
                        {rec.tips.map((tip: string, index: number) => (
                          <View key={index} style={styles.recommendationTip}>
                            <View style={styles.tipBullet}>
                              <View style={styles.tipBulletDot} />
                            </View>
                            <Text style={styles.tipText}>{tip}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Quality Badge */}
                      <View style={styles.qualityBadgeContainer}>
                        <View style={styles.qualityBadge}>
                          <MaterialCommunityIcons name="certificate" size={16} color="#5E5CE6" />
                          <Text style={styles.qualityBadgeText}>{rec.quality}</Text>
                        </View>
                      </View>
                    </>
                  );
                })()}
              </BlurView>
            </View>
          </>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(48, 209, 88, 0.2)',
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#3C3C43',
    opacity: 0.6,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  infoBanner: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBannerBlur: {
    flex: 1,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(10, 132, 255, 0.15)',
  },
  infoBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
    letterSpacing: -0.08,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.35,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: 0.2,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  successText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: 0.2,
  },
  inputCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    letterSpacing: -0.41,
  },
  labelSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  radioGroup: {
    gap: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 12,
  },
  radioOptionSelected: {
    borderColor: 'rgba(48, 209, 88, 0.3)',
    backgroundColor: 'rgba(48, 209, 88, 0.05)',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    letterSpacing: -0.32,
  },
  radioLabelSelected: {
    fontWeight: '600',
  },
  radioCheck: {
    marginLeft: 'auto',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontWeight: '500',
    letterSpacing: -0.41,
  },
  inputSuffix: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderLeftWidth: 0,
  },
  inputSuffixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.32,
  },
  predictButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 24,
    shadowColor: '#4aab4e',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 6,
  },
  predictButtonBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4aab4e',
  },
  predictText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.41,
  },
  resultCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  resultBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(48, 209, 88, 0.2)',
    padding: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: 0.2,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.24,
    marginBottom: 6,
  },
  resultValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: 0.36,
  },
  resultValueUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 6,
  },
  resultDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginVertical: 12,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultMetaText: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  resultMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8E8E93',
    marginHorizontal: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  metricBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    alignItems: 'center',
  },
  metricIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.08,
    marginBottom: 8,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.36,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 2,
  },
  progressBarContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  valueCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  valueBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    padding: 20,
  },
  valueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  valueIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueHeaderText: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
    marginBottom: 2,
  },
  valueSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  valueAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  valueCurrency: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: 0.36,
  },
  valueAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#34C759',
    letterSpacing: 0.38,
    marginHorizontal: 4,
  },
  valueUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.32,
  },
  valueFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
  },
  valueInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    letterSpacing: -0.08,
  },
  recommendationCard: {
        marginTop: 36,

    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  recommendationBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  recommendationIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
  },
  recommendationPrimary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  recommendationPrimaryText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 21,
    letterSpacing: -0.24,
  },
  recommendationSection: {
    marginBottom: 16,
  },
  recommendationSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.08,
    marginBottom: 12,
  },
  recommendationTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  tipBullet: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0A84FF',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  qualityBadgeContainer: {
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(94, 92, 230, 0.08)',
    padding: 12,
    borderRadius: 10,
  },
  qualityBadgeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#5E5CE6',
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  inputSummaryCard: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryContent: {
    paddingTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: -0.24,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.24,
  },
});