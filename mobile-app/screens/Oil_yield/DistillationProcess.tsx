import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import apiConfig from '../../config/api';

// Use localhost for web platform, otherwise use the configured API URL
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

export default function DistillationProcess() {
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
  const [distillCapacity, setDistillCapacity] = useState('');
  const [optimalTime, setOptimalTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load material batches
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
        Alert.alert(t('oil_yield.distillation.alerts.load_error'), e.message || t('yield_weather.common.unknown_error'));
      }
    };
    fetchBatches();
  }, []);

  // API-based Calculation Logic
  const calculateOptimalTime = async () => {
    console.log('🔍 calculateOptimalTime called');
    console.log('API_BASE_URL:', API_BASE_URL);

    if (!selectedBatch || !distillCapacity) {
      console.log('❌ Validation failed - missing fields');
      Alert.alert(t('oil_yield.distillation.alerts.missing_info'), t('oil_yield.distillation.alerts.missing_fields'));
      return;
    }

    const capacity = parseFloat(distillCapacity);
    if (isNaN(capacity) || capacity <= 0) {
      console.log('❌ Invalid capacity value');
      Alert.alert(t('oil_yield.distillation.alerts.invalid_input'), t('oil_yield.distillation.alerts.invalid_capacity'));
      return;
    }

    setLoading(true);
    setOptimalTime(null);
    setShowResults(false);

    // Map cinnamon type to API expected literals
    const cinnamonTypeMap: { [key: string]: string } = {
      'Sri Gemunu': 'Sri Gamunu',
      'Sri Vijaya': 'Sri Wijaya',
    };

    const requestBody = {
      plant_part: selectedBatch.plant_part,
      cinnamon_type: cinnamonTypeMap[selectedBatch.cinnamon_type] || selectedBatch.cinnamon_type,
      distillation_capacity_liters: capacity,
    };

    console.log('📤 Sending request to:', `${API_BASE_URL}/oil_yield/predict_distillation_time`);
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(`${API_BASE_URL}/oil_yield/predict_distillation_time`, {
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

      const predictedTime = data.predicted_time_hours;
      console.log('📊 Predicted time:', predictedTime, 'hours');

      setOptimalTime(parseFloat(predictedTime.toFixed(1)));
      setRemainingTime(Math.round(predictedTime * 60)); // convert to minutes
      setShowResults(true);

      console.log('✅ Calculation completed successfully');
    } catch (error: any) {
      console.error('❌ Prediction error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert(
        t('oil_yield.distillation.alerts.prediction_failed'),
        `Unable to connect to the prediction service.\n\nError: ${error.message}\n\nAPI URL: ${API_BASE_URL}/oil_yield/predict_distillation_time\n\nPlease check your connection and try again.`
      );
    } finally {
      setLoading(false);
      console.log('🏁 calculateOptimalTime finished');
    }
  };

  // Countdown timer
  useEffect(() => {
    if (isRunning && remainingTime > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingTime((prev) => (prev > 0 ? prev - 1 : 0));
      }, 60000); // every minute
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remainingTime]);

  const handleStartPause = () => {
    if (!optimalTime) return;
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (optimalTime) {
      setRemainingTime(Math.round(optimalTime * 60));
    }
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  };

  const getProgress = () => {
    if (!optimalTime) return 0;
    const totalMinutes = optimalTime * 60;
    const elapsed = totalMinutes - remainingTime;
    return Math.min((elapsed / totalMinutes) * 100, 100);
  };

  const getRecommendations = () => {
    const recommendations = {
      primary: '',
      tips: [] as string[],
      quality: '',
    };

    const part = selectedBatch?.plant_part;
    if (part === 'Featherings & Chips') {
      recommendations.primary = 'Bark oil contains 0.5-4% oil with 30-75% cinnamaldehyde. Used as flavoring agent in food, beverages, perfumes and medicines.';
      recommendations.tips = [
        'Use cinnamon quills, featherings, and chips as raw material',
        'Steam distillation for 7 hours at controlled temperature',
        'Oil should be clear, pale yellow, free from sediment',
        'Higher cinnamaldehyde content = Superior grade (≥60%)',
      ];
      recommendations.quality = 'Superior grade achievable with ≥60% cinnamaldehyde content';
    } else if (part === 'Leaves & Twigs') {
      recommendations.primary = 'Leaf oil contains up to 4% oil with 75-85% eugenol. Average yield: 100 kg oil/hectare/year (1-2% of leaf weight).';
      recommendations.tips = [
        'Use mature leaves and chopped leaves as raw material',
        'Steam distillation for 5-6 hours with continuous steam flow',
        'Oil should be clear, light to dark yellow, free from particles',
        'Used in perfumes, insect repellents, disinfectants, medicines',
      ];
      recommendations.quality = 'Premium quality with 75-85% eugenol content';
    } else {
      recommendations.primary = 'Twig distillation balances yield and quality with careful monitoring.';
      recommendations.tips = [
        'Maintain temperature around 102-105°C',
        'Ensure even steam distribution',
        'Check for consistent oil flow during process',
      ];
      recommendations.quality = 'Good quality oil with balanced aromatic profile';
    }

    return recommendations;
  };

  const RadioOption = ({ label, value, selected, onSelect, icon }: {
    label: string;
    value: string;
    selected: boolean;
    onSelect: () => void;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.radioContent}>
        <View style={styles.radioIconCircle}>
          <MaterialCommunityIcons name={icon as any} size={20} color={selected ? '#4aab4e' : '#8E8E93'} />
        </View>
        <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
      </View>
      <View style={[styles.radioCircle, selected && { borderColor: '#4aab4e' }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: '#4aab4e' }]} />}
      </View>
    </TouchableOpacity>
  );

  const ControlButton = ({ onPress, isPrimary, icon, text, disabled }: {
    onPress: () => void;
    isPrimary: boolean;
    icon: string;
    text: string;
    disabled?: boolean;
  }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      if (disabled) return;
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
      }).start();
    };

    const handlePressOut = () => {
      if (disabled) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 50,
      }).start();
    };

    return (
      <Animated.View style={[styles.controlButtonWrapper, !isPrimary && { flex: 1 }, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isPrimary ? styles.primaryButton : styles.secondaryButton,
            disabled && styles.disabledButton,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          disabled={disabled}
        >
          <BlurView intensity={isPrimary ? 100 : 70} tint={isPrimary ? "dark" : "light"} style={styles.controlButtonBlur}>
            <MaterialCommunityIcons 
              name={icon as any} 
              size={20} 
              color={disabled ? '#C7C7CC' : (isPrimary ? '#FFFFFF' : '#4aab4e')} 
            />
            <Text style={[
              styles.controlButtonText,
              isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
              disabled && styles.disabledButtonText,
            ]}>
              {text}
            </Text>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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
              <MaterialCommunityIcons name="flask" size={28} color="#4aab4e" />
            </View>
          </View>
          <Text style={styles.header}>{t('oil_yield.distillation.header.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('oil_yield.distillation.header.subtitle')}
          </Text>
        </View>

        {/* Quick Info Banner */}
        {/* <View style={styles.infoBanner}>
          <BlurView intensity={50} tint="light" style={styles.infoBannerBlur}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons name="information" size={20} color="#4aab4e" />
              <Text style={styles.infoBannerText}>Select a batch and capacity</Text>
            </View>
          </BlurView>
        </View> */}

        {/* Batch Selection */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('oil_yield.distillation.batch.title')}</Text>
          
        </View>
        {/* Material Batch Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#34C759" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.distillation.batch.select_batch')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.distillation.batch.select_batch_subtext')}</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              {batches.length === 0 ? (
                <Text style={styles.labelSubtext}>{t('oil_yield.distillation.batch.no_batches')}</Text>
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
                      icon={b.plant_part === 'Leaves & Twigs' ? 'leaf' : 'nature'}
                    />
                  );
                })
              )}
            </View>
          </BlurView>
        </View>

        {/* Capacity Input Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="cup-water" size={24} color="#5E5CE6" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.distillation.capacity.title')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.distillation.capacity.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={t('oil_yield.distillation.capacity.placeholder')}
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                value={distillCapacity}
                onChangeText={setDistillCapacity}
              />
              <View style={styles.inputSuffix}>
                <Text style={styles.inputSuffixText}>{t('oil_yield.distillation.capacity.suffix_l')}</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Calculate Button */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4aab4e" />
            <Text style={styles.loadingText}>{t('oil_yield.distillation.buttons.calculating')}</Text>
          </View>
        ) : (
          <ControlButton
            onPress={calculateOptimalTime}
            isPrimary={true}
            icon="calculator"
            text={t('oil_yield.distillation.buttons.calculate')}
            disabled={!selectedBatch || !distillCapacity}
          />
        )}

        {/* Results Section */}
        {showResults && optimalTime && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('oil_yield.distillation.results.title')}</Text>
              <View style={[styles.successBadge, isRunning && styles.activeBadge]}>
                <MaterialCommunityIcons 
                  name={isRunning ? "clock-fast" : "check-circle"} 
                  size={14} 
                  color={isRunning ? '#4aab4e' : '#30D158'} 
                />
                <Text style={[styles.successText, isRunning && styles.activeText]}>
                  {isRunning ? t('oil_yield.distillation.results.status_running') : t('oil_yield.distillation.results.status_complete')}
                </Text>
              </View>
            </View>

            {/* Optimal Time Card */}
            <View style={styles.resultCard}>
              <BlurView intensity={70} tint="light" style={styles.resultBlur}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultIconContainer}>
                    <MaterialCommunityIcons name="clock-check" size={32} color="#4aab4e" />
                  </View>
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultBadgeText}>Calculated</Text>
                  </View>
                </View>
                <Text style={styles.resultTitle}>{t('oil_yield.distillation.results.optimal_time_title')}</Text>
                <View style={styles.resultValueRow}>
                  <Text style={styles.resultValue}>{optimalTime}</Text>
                  <Text style={styles.resultValueUnit}>{t('oil_yield.distillation.results.unit_hours')}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultMeta}>
                  <MaterialCommunityIcons name="leaf" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{selectedBatch?.plant_part || '-'}</Text>
                  <View style={styles.resultMetaDot} />
                  <MaterialCommunityIcons name="spa" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{selectedBatch?.cinnamon_type || '-'}</Text>
                  <View style={styles.resultMetaDot} />
                  <MaterialCommunityIcons name="cup-water" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{distillCapacity}L</Text>
                </View>
              </BlurView>
            </View>

            {/* Timer Control Card */}
            <View style={styles.timerCard}>
              <BlurView intensity={70} tint="light" style={styles.timerBlur}>
                <View style={styles.timerHeader}>
                  <View style={styles.timerIconContainer}>
                    <MaterialCommunityIcons 
                      name={isRunning ? "timer" : "timer-outline"} 
                      size={32} 
                      color="#4aab4e" 
                    />
                  </View>
                  <View style={styles.timerBadge}>
                    <Text style={styles.timerBadgeText}>
                      {remainingTime === 0 ? t('oil_yield.distillation.results.timer.completed') : (isRunning ? t('oil_yield.distillation.results.timer.in_progress') : t('oil_yield.distillation.results.timer.paused'))}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.timerLabel}>
                  {remainingTime === 0 ? t('oil_yield.distillation.results.timer.process_complete') : t('oil_yield.distillation.results.timer.time_remaining')}
                </Text>
                <Text style={styles.timerValue}>{formatTime(remainingTime)}</Text>
                
                <View style={styles.timerDivider} />
                <View style={styles.timerMeta}>
                  <View style={styles.timerMetaItem}>
                    <MaterialCommunityIcons name="progress-clock" size={14} color="#8E8E93" />
                    <Text style={styles.timerMetaText}>
                      {getProgress().toFixed(1)}{t('oil_yield.distillation.results.timer.progress_complete')}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { 
                      width: `${getProgress()}%`, 
                      backgroundColor: remainingTime === 0 ? '#30D158' : '#4aab4e' 
                    }]} />
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Control Buttons */}
            <View style={styles.controlsRow}>
              <ControlButton
                onPress={handleStartPause}
                isPrimary={false}
                icon={isRunning ? "pause" : "play"}
                text={isRunning ? t('oil_yield.distillation.buttons.pause') : t('oil_yield.distillation.buttons.start')}
                disabled={remainingTime === 0}
              />
              <ControlButton
                onPress={handleReset}
                isPrimary={false}
                icon="restart"
                text={t('oil_yield.distillation.buttons.reset')}
                disabled={remainingTime === Math.round(optimalTime * 60)}
              />
            </View>

            {/* Recommendations Card */}
            

            {/* Equipment & Standards Information */}
           

            {/* Equipment Card
            <View style={styles.infoCard}>
              <BlurView intensity={70} tint="light" style={styles.infoBlur}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconCircle}>
                    <MaterialCommunityIcons name="factory" size={20} color="#5E5CE6" />
                  </View>
                  <Text style={styles.infoTitle}>Distillation Unit Components</Text>
                </View>
                <View style={styles.infoContent}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="circle-small" size={20} color="#8E8E93" />
                    <Text style={styles.infoItemText}>External boiler (continuous steam supply)</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="circle-small" size={20} color="#8E8E93" />
                    <Text style={styles.infoItemText}>Stainless steel distillation chamber</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="circle-small" size={20} color="#8E8E93" />
                    <Text style={styles.infoItemText}>Condenser with stainless steel coils</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="circle-small" size={20} color="#8E8E93" />
                    <Text style={styles.infoItemText}>Three receivers for oil separation</Text>
                  </View>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoFooter}>
                  <MaterialCommunityIcons name="currency-usd" size={16} color="#FF9F0A" />
                  <Text style={styles.infoFooterText}>Initial investment: ~LKR 2 million</Text>
                </View>
              </BlurView>
            </View> */}

            {/* Standards Card */}
           

            {/* Packaging & Storage Card */}
           
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
    backgroundColor: 'rgba(74, 171, 78, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(74, 171, 78, 0.2)',
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
    color: '#3c433fff',
    opacity: 0.6,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  infoBanner: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBannerBlur: {
    flex: 1,
    backgroundColor: 'rgba(74, 171, 78, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(74, 171, 78, 0.15)',
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
    color: '#4aab4e',
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
  activeBadge: {
    backgroundColor: 'rgba(10, 255, 55, 0.12)',
  },
  successText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#30D158',
    letterSpacing: 0.2,
  },
  activeText: {
    color: '#4aab4e',
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
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  radioOptionSelected: {
    borderColor: 'rgba(10, 255, 30, 0.3)',
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
  },
  radioContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
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
  controlButtonWrapper: {
    marginBottom: 16,
  },
  controlButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 6,
  },
  primaryButton: {
    shadowColor: '#4aab4e',
  },
  secondaryButton: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
  },
  disabledButton: {
    shadowOpacity: 0,
    opacity: 0.5,
  },
  controlButtonBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#4aab4e',
  },
  disabledButtonText: {
    color: '#C7C7CC',
  },
  controlButtonText: {
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
    borderColor: 'rgba(10, 255, 67, 0.2)',
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
    backgroundColor: 'rgba(10, 255, 14, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 255, 43, 0.12)',
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
    fontSize: 48,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: -0.5,
  },
  resultValueUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 6,
  },
  resultDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 67, 62, 0.18)',
    marginVertical: 12,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  timerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  timerBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(10, 255, 79, 0.2)',
    padding: 20,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(10, 255, 34, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 255, 30, 0.12)',
  },
  timerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: 0.2,
  },
  timerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.24,
    marginBottom: 6,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  timerDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 67, 62, 0.18)',
    marginVertical: 12,
  },
  timerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  timerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerMetaText: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  progressSection: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  recommendationCard: {
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
    borderBottomColor: 'rgba(60, 67, 61, 0.18)',
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
    backgroundColor: '#4aab4e',
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
    borderTopColor: 'rgba(61, 67, 60, 0.18)',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(92, 230, 124, 0.08)',
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
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  infoBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 67, 62, 0.18)',
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(92, 230, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
  },
  infoContent: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoItemText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  infoDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 67, 62, 0.18)',
    marginVertical: 12,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    padding: 10,
    borderRadius: 8,
  },
  infoFooterText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9F0A',
    letterSpacing: -0.08,
  },
  loadingContainer: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 255, 63, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(10, 255, 67, 0.15)',
  },
  loadingText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4aab4e',
    letterSpacing: -0.41,
  },
});