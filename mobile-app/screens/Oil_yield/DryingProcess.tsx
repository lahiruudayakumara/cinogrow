import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiConfig from '../../config/api';

// Use localhost for web platform, otherwise use the configured API URL
const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

export default function DryingProcess() {
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
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
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
        Alert.alert('Load Error', e.message || 'Could not load material batches');
      }
    };
    fetchBatches();
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Algorithm for estimated drying time based on selected batch
  useEffect(() => {
    const part = selectedBatch?.plant_part;
    if (part === 'Leaves & Twigs') setEstimatedDuration(96); // 3-5 days (avg 4 days)
    else if (part === 'Featherings & Chips') setEstimatedDuration(36);
    else setEstimatedDuration(null);
  }, [selectedBatch]);

  const toggleTimer = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setTime(0);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!estimatedDuration) return 0;
    const progressPercent = Math.min((time / (estimatedDuration * 3600)) * 100, 100);
    return progressPercent;
  };

  const getRecommendation = () => {
    const part = selectedBatch?.plant_part;
    if (part === 'Featherings & Chips') {
      return {
        primary: 'Featherings & Chips require careful monitoring to preserve essential oils.',
        tips: [
          'Ensure steady air flow and direct sunlight exposure',
          'Check moisture levels every 6 hours',
          'Optimal temperature range: 25-30°C',
        ],
        quality: 'Premium quality achievable with proper drying technique',
      };
    } else if (part === 'Leaves & Twigs') {
      return {
        primary: 'Leaves from prunings and immature branches must be dried in the field for 3-5 days, then bundled and transported to oil extraction facility.',
        tips: [
          'Dry leaves in the field for 3-5 days after cutting',
          'Do NOT exceed 5 days - oil yield reduces significantly',
          'Protect dried leaves from rain exposure at all costs',
          'Bundle dried leaves and transport to distillery immediately',
        ],
        quality: 'Maximum oil yield when dried within 5 days and protected from rain',
      };
    } else {
      return {
        primary: 'Material requires balanced drying to maintain quality.',
        tips: [
          'Rotate material evenly for uniform drying',
          'Bundle loosely to allow air circulation',
          'Avoid direct moisture exposure during process',
        ],
        quality: 'Good quality achievable with consistent rotation',
      };
    }
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
          <MaterialCommunityIcons name={icon as any} size={20} color={selected ? '#FF9F0A' : '#8E8E93'} />
        </View>
        <View style={styles.radioTextContainer}>
          <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
          <Text style={styles.radioSubtext}>
            {value === 'Bark' ? '36 hours' : value === 'Leaf' ? '3-5 days' : '30 hours'}
          </Text>
        </View>
      </View>
      <View style={[styles.radioCircle, selected && { borderColor: '#FF9F0A' }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: '#FF9F0A' }]} />}
      </View>
    </TouchableOpacity>
  );

  const ControlButton = ({ onPress, isPrimary, icon, text }: {
    onPress: () => void;
    isPrimary: boolean;
    icon: string;
    text: string;
  }) => {
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
      <Animated.View style={[styles.controlButtonWrapper, !isPrimary && { flex: 1 }, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[styles.controlButton, isPrimary ? styles.primaryButton : styles.secondaryButton]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <BlurView intensity={isPrimary ? 100 : 70} tint={isPrimary ? "dark" : "light"} style={styles.controlButtonBlur}>
            <MaterialCommunityIcons name={icon as any} size={20} color={isPrimary ? '#FFFFFF' : '#FF9F0A'} />
            <Text style={[styles.controlButtonText, isPrimary ? styles.primaryButtonText : styles.secondaryButtonText]}>
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
              <MaterialCommunityIcons name="weather-sunny" size={28} color="#FF9F0A" />
            </View>
          </View>
          <Text style={styles.header}>Drying Process</Text>
          <Text style={styles.headerSubtitle}>
            Monitor and optimize your cinnamon drying process
          </Text>
        </View>

        {/* Quick Info Banner */}
        <View style={styles.infoBanner}>
          <BlurView intensity={50} tint="light" style={styles.infoBannerBlur}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons name="information" size={20} color="#FF9F0A" />
              <Text style={styles.infoBannerText}>Select a batch to begin monitoring</Text>
            </View>
          </BlurView>
        </View>

        {/* Batch Selection Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Material Batch</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>

        {/* Material Batch Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#FF9F0A" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Select Batch</Text>
                <Text style={styles.labelSubtext}>Choose material batch to monitor drying</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              {batches.length === 0 ? (
                <Text style={styles.labelSubtext}>No batches found</Text>
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

        {/* Timer Section */}
        {selectedBatch && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Timer Control</Text>
              <View style={[styles.successBadge, isRunning && styles.activeBadge]}>
                <MaterialCommunityIcons 
                  name={isRunning ? "clock-fast" : "clock-outline"} 
                  size={14} 
                  color={isRunning ? "#FF9F0A" : "#30D158"} 
                />
                <Text style={[styles.successText, isRunning && styles.activeText]}>
                  {isRunning ? 'Running' : 'Ready'}
                </Text>
              </View>
            </View>

            {/* Main Timer Card */}
            <View style={styles.timerCard}>
              <BlurView intensity={70} tint="light" style={styles.timerBlur}>
                <View style={styles.timerHeader}>
                  <View style={styles.timerIconContainer}>
                    <MaterialCommunityIcons 
                      name={isRunning ? "timer" : "timer-outline"} 
                      size={32} 
                      color="#FF9F0A" 
                    />
                  </View>
                  <View style={styles.timerBadge}>
                    <Text style={styles.timerBadgeText}>
                      {isRunning ? 'In Progress' : 'Paused'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.timerLabel}>Current Duration</Text>
                <Text style={styles.timerValue}>{formatTime(time)}</Text>
                
                {estimatedDuration && (
                  <>
                    <View style={styles.timerDivider} />
                    <View style={styles.timerMeta}>
                      <View style={styles.timerMetaItem}>
                        <MaterialCommunityIcons name="target" size={14} color="#8E8E93" />
                        <Text style={styles.timerMetaText}>
                          Target: {estimatedDuration}h
                        </Text>
                      </View>
                      <View style={styles.resultMetaDot} />
                      <View style={styles.timerMetaItem}>
                        <MaterialCommunityIcons name="progress-clock" size={14} color="#8E8E93" />
                        <Text style={styles.timerMetaText}>
                          {getProgress().toFixed(1)}% complete
                        </Text>
                      </View>
                      <View style={styles.resultMetaDot} />
                      <View style={styles.timerMetaItem}>
                        <MaterialCommunityIcons name="leaf" size={14} color="#8E8E93" />
                        <Text style={styles.timerMetaText}>
                          {selectedBatch.cinnamon_type} • {selectedBatch.plant_part}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { 
                          width: `${getProgress()}%`, 
                          backgroundColor: getProgress() >= 100 ? '#30D158' : '#FF9F0A' 
                        }]} />
                      </View>
                    </View>
                  </>
                )}
              </BlurView>
            </View>

            {/* Control Buttons */}
            <View style={styles.controlsContainer}>
              <ControlButton
                onPress={toggleTimer}
                isPrimary={true}
                icon={isRunning ? "pause" : "play"}
                text={isRunning ? "Pause Drying" : "Start Drying"}
              />
            </View>

            {time > 0 && (
              <View style={styles.controlsContainer}>
                <ControlButton
                  onPress={resetTimer}
                  isPrimary={false}
                  icon="restart"
                  text="Reset Timer"
                />
              </View>
            )}

            {/* Estimated Duration Card */}
            {estimatedDuration && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Drying Information</Text>
                </View>

                <View style={styles.estimateCard}>
                  <BlurView intensity={70} tint="light" style={styles.estimateBlur}>
                    <View style={styles.estimateHeader}>
                      <View style={styles.estimateIconCircle}>
                        <MaterialCommunityIcons name="timer-sand" size={24} color="#5E5CE6" />
                      </View>
                      <View style={styles.estimateHeaderText}>
                        <Text style={styles.estimateLabel}>Optimal Duration</Text>
                        <Text style={styles.estimateSubtext}>Recommended for {selectedBatch?.plant_part}</Text>
                      </View>
                    </View>
                    <View style={styles.estimateValueContainer}>
                      <Text style={styles.estimateValue}>{estimatedDuration}</Text>
                      <Text style={styles.estimateUnit}>hours</Text>
                    </View>
                    <View style={styles.estimateFooter}>
                      <View style={styles.estimateInfoItem}>
                        <MaterialCommunityIcons name="weather-sunny" size={16} color="#FF9F0A" />
                        <Text style={styles.estimateInfoText}>Sun drying</Text>
                      </View>
                      <View style={styles.estimateInfoItem}>
                        <MaterialCommunityIcons name="thermometer" size={16} color="#0A84FF" />
                        <Text style={styles.estimateInfoText}>25-30°C</Text>
                      </View>
                    </View>
                  </BlurView>
                </View>

                {/* Recommendation Card */}
                <View style={styles.recommendationCard}>
                  <BlurView intensity={70} tint="light" style={styles.recommendationBlur}>
                    <View style={styles.recommendationHeader}>
                      <View style={styles.recommendationIconCircle}>
                        <MaterialCommunityIcons name="lightbulb-on" size={20} color="#30D158" />
                      </View>
                      <Text style={styles.recommendationTitle}>Best Practices</Text>
                    </View>
                    
                    {(() => {
                      const rec = getRecommendation();
                      return (
                        <>
                          {/* Primary Recommendation */}
                          <View style={styles.recommendationPrimary}>
                            <MaterialCommunityIcons name="check-circle" size={18} color="#30D158" />
                            <Text style={styles.recommendationPrimaryText}>{rec.primary}</Text>
                          </View>

                          {/* Tips Section */}
                          <View style={styles.recommendationSection}>
                            <Text style={styles.recommendationSectionTitle}>Key Guidelines</Text>
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
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.2)',
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
    shadowColor: '#FF9F0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBannerBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.15)',
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
    color: '#FF9F0A',
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
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  successText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#30D158',
    letterSpacing: 0.2,
  },
  activeText: {
    color: '#FF9F0A',
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
    borderColor: 'rgba(255, 159, 10, 0.3)',
    backgroundColor: 'rgba(255, 159, 10, 0.05)',
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
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    letterSpacing: -0.32,
    marginBottom: 2,
  },
  radioLabelSelected: {
    fontWeight: '600',
  },
  radioSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
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
  timerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF9F0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  timerBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.2)',
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
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  timerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9F0A',
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
    color: '#FF9F0A',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  timerDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
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
  resultMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8E8E93',
    marginHorizontal: 8,
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
  controlsContainer: {
    marginBottom: 16,
  },
  controlButtonWrapper: {
    marginBottom: 0,
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
    shadowColor: '#FF9F0A',
  },
  secondaryButton: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
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
    color: '#FF9F0A',
  },
  controlButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.41,
  },
  estimateCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  estimateBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 92, 230, 0.2)',
    padding: 20,
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  estimateIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(94, 92, 230, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateHeaderText: {
    flex: 1,
  },
  estimateLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
    marginBottom: 2,
  },
  estimateSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  estimateValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  estimateValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#5E5CE6',
    letterSpacing: 0.38,
    marginRight: 8,
  },
  estimateUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.32,
  },
  estimateFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
  },
  estimateInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  estimateInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    letterSpacing: -0.08,
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
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  recommendationIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
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
});