import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import apiConfig from '../../config/api';

// Use localhost for web platform, otherwise use the configured API URL
const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

export default function PreliminaryOilQualityAssessment() {
  const { t } = useTranslation();
  const [color, setColor] = useState('');
  const [clarity, setClarity] = useState('');
  const [aroma, setAroma] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [predictedPrice, setPredictedPrice] = useState('');
  const [labAdvice, setLabAdvice] = useState('');

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

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/oil_yield/batch`);
        if (!response.ok) {
          throw new Error(`Failed to load batches (HTTP ${response.status})`);
        }
        const data = await response.json();
        setBatches(Array.isArray(data) ? data : []);
      } catch (e: any) {
        Alert.alert(t('oil_yield.quality.messages.failed_load_batches'), e?.message || t('yield_weather.common.unknown_error'));
      }
    };
    fetchBatches();
  }, []);

  const calculateQuality = () => {
    if (!selectedBatch || !color || !clarity || !aroma) {
      Alert.alert(
        'Missing Information',
        'Please select a material batch and all quality attributes.'
      );
      return;
    }

    const colorScoreMap: Record<string, number> = {
      pale_yellow: 90,
      golden: 80,
      amber: 75,
      dark: 50,
    };

    const clarityScoreMap: Record<string, number> = {
      clear: 90,
      slightly_cloudy: 70,
      cloudy: 40,
    };

    const aromaScoreMap: Record<string, number> = {
      mild: 60,
      aromatic: 90,
      pungent: 75,
    };

    const finalScore = Math.round(
      (colorScoreMap[color] +
        clarityScoreMap[clarity] +
        aromaScoreMap[aroma]) / 3
    );

    let qualityLabel = '';
    let priceRange = '';
    const recs: string[] = [];

    if (finalScore >= 85) {
      qualityLabel = 'Excellent';
      priceRange = '$120 – $200 / L';
      recs.push('Suitable for premium markets and export preparation');
      recs.push('Highly recommended for laboratory certification');
      recs.push('Maintain controlled storage to preserve volatile compounds');
      setLabAdvice('Proceed with full laboratory analysis for certification and export.');
    } else if (finalScore >= 70) {
      qualityLabel = 'Good';
      priceRange = '$70 – $120 / L';
      recs.push('Minor purification may improve market value');
      recs.push('Recommended to refine distillation parameters');
      setLabAdvice('Improve quality slightly before investing in laboratory testing.');
    } else if (finalScore >= 50) {
      qualityLabel = 'Fair';
      priceRange = '$30 – $70 / L';
      recs.push('Filtering or redistillation is advised');
      recs.push('Review raw material handling and drying process');
      setLabAdvice('Laboratory testing not cost-effective at this stage.');
    } else {
      qualityLabel = 'Poor';
      priceRange = '$5 – $30 / L';
      recs.push('Do not proceed with laboratory testing');
      recs.push('Investigate contamination or processing failures');
      setLabAdvice('Resolve quality issues before any certification attempts.');
    }

    // Add plant-part contextual note from selected batch
    if (selectedBatch?.plant_part?.toLowerCase().includes('leave')) {
      recs.push('Leaves & Twigs often show higher eugenol; expect stronger aroma.');
    } else if (selectedBatch?.plant_part) {
      recs.push('Featherings & Chips tend to have higher cinnamaldehyde; color may be richer.');
    }

    setScore(finalScore);
    setLabel(qualityLabel);
    setRecommendations(recs);
    setPredictedPrice(priceRange);
  };

  const clearForm = () => {
    setColor('');
    setClarity('');
    setAroma('');
    setScore(null);
    setLabel('');
    setRecommendations([]);
    setPredictedPrice('');
    setLabAdvice('');
  };

  const getQualityColor = () => {
    if (label === 'Excellent') return '#30D158';
    if (label === 'Good') return '#0A84FF';
    if (label === 'Fair') return '#FF9F0A';
    return '#FF3B30';
  };

  const RadioOption = ({ 
    label: optionLabel, 
    value, 
    selected, 
    onSelect, 
    icon,
    subtitle 
  }: {
    label: string;
    value: string;
    selected: boolean;
    onSelect: () => void;
    icon: string;
    subtitle?: string;
  }) => (
    <TouchableOpacity
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.radioContent}>
        <View style={styles.radioIconCircle}>
          <MaterialCommunityIcons 
            name={icon as any} 
            size={20} 
            color={selected ? '#4aab4e' : '#8E8E93'} 
          />
        </View>
        <View style={styles.radioTextContainer}>
          <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>
            {optionLabel}
          </Text>
          {subtitle && (
            <Text style={styles.radioSubtext}>{subtitle}</Text>
          )}
        </View>
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
          <BlurView 
            intensity={isPrimary ? 100 : 70} 
            tint={isPrimary ? "dark" : "light"} 
            style={styles.controlButtonBlur}
          >
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
              <MaterialCommunityIcons name="flask-outline" size={28} color="#4aab4e" />
            </View>
          </View>
          <Text style={styles.header}>{t('oil_yield.quality.header.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('oil_yield.quality.header.subtitle')}
          </Text>
        </View>

        {/* Scientific Context Card */}
        {/* <View style={styles.infoCard}>
          <BlurView intensity={70} tint="light" style={styles.infoCardBlur}>
            <View style={styles.infoCardHeader}>
              <MaterialCommunityIcons name="flask-outline" size={20} color="#5E5CE6" />
              <Text style={styles.infoCardTitle}>Scientific Context</Text>
            </View>
            <Text style={styles.infoCardText}>
              This assessment is based on visual and sensory indicators commonly used
              in preliminary screening of essential oils before laboratory confirmation.
            </Text>
          </BlurView>
        </View> */}

        {/* Input Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('oil_yield.quality.attributes_section.title')}</Text>
          
        </View>

        {/* Color Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="palette" size={24} color="#4aab4e" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.quality.color.title')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.quality.color.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label={t('oil_yield.quality.color.pale_yellow')}
                value="pale_yellow"
                selected={color === 'pale_yellow'}
                onSelect={() => setColor('pale_yellow')}
                icon="circle"
                subtitle={t('oil_yield.quality.color.pale_yellow_sub')}
              />
              <RadioOption
                label={t('oil_yield.quality.color.golden')}
                value="golden"
                selected={color === 'golden'}
                onSelect={() => setColor('golden')}
                icon="circle"
                subtitle={t('oil_yield.quality.color.golden_sub')}
              />
              <RadioOption
                label={t('oil_yield.quality.color.amber')}
                value="amber"
                selected={color === 'amber'}
                onSelect={() => setColor('amber')}
                icon="circle"
                subtitle={t('oil_yield.quality.color.amber_sub')}
              />
              <RadioOption
                label={t('oil_yield.quality.color.dark')}
                value="dark"
                selected={color === 'dark'}
                onSelect={() => setColor('dark')}
                icon="circle"
                subtitle={t('oil_yield.quality.color.dark_sub')}
              />
            </View>
          </BlurView>
        </View>

        {/* Clarity Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="water" size={24} color="#4aab4e" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.quality.clarity.title')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.quality.clarity.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label={t('oil_yield.quality.clarity.clear')}
                value="clear"
                selected={clarity === 'clear'}
                onSelect={() => setClarity('clear')}
                icon="water"
                subtitle={t('oil_yield.quality.clarity.clear_sub')}
              />
              <RadioOption
                label={t('oil_yield.quality.clarity.slightly_cloudy')}
                value="slightly_cloudy"
                selected={clarity === 'slightly_cloudy'}
                onSelect={() => setClarity('slightly_cloudy')}
                icon="water-opacity"
                subtitle={t('oil_yield.quality.clarity.slightly_cloudy_sub')}
              />
              <RadioOption
                label={t('oil_yield.quality.clarity.cloudy')}
                value="cloudy"
                selected={clarity === 'cloudy'}
                onSelect={() => setClarity('cloudy')}
                icon="water-off"
                subtitle={t('oil_yield.quality.clarity.cloudy_sub')}
              />
            </View>
          </BlurView>
        </View>

        {/* Aroma Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="flower" size={24} color="#4aab4e" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.quality.aroma.title')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.quality.aroma.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label={t('oil_yield.quality.aroma.mild')}
                value="mild"
                selected={aroma === 'mild'}
                onSelect={() => setAroma('mild')}
                icon="flower-outline"
                subtitle={t('oil_yield.quality.aroma.mild_sub')}
              />
              <RadioOption
                label={t('oil_yield.quality.aroma.aromatic')}
                value="aromatic"
                selected={aroma === 'aromatic'}
                onSelect={() => setAroma('aromatic')}
                icon="flower"
                subtitle={t('oil_yield.quality.aroma.aromatic_sub')}
              />
              <RadioOption
                label={t('oil_yield.quality.aroma.pungent')}
                value="pungent"
                selected={aroma === 'pungent'}
                onSelect={() => setAroma('pungent')}
                icon="flower-pollen"
                subtitle={t('oil_yield.quality.aroma.pungent_sub')}
              />
            </View>
          </BlurView>
        </View>

        {/* Material Batch Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="database" size={24} color="#4aab4e" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.quality.batch.title')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.quality.batch.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              {batches.length === 0 ? (
                <Text style={styles.labelSubtext}>{t('oil_yield.quality.batch.no_batches')}</Text>
              ) : (
                batches.map((b) => (
                  <RadioOption
                    key={b.id}
                    label={b.batch_name ? b.batch_name : `Batch #${b.id}`}
                    value={String(b.id)}
                    selected={selectedBatchId === b.id}
                    onSelect={() => setSelectedBatchId(b.id)}
                    icon="database"
                    subtitle={`${b.plant_part} • ${b.cinnamon_type}`}
                  />
                ))
              )}
            </View>
          </BlurView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <ControlButton
            onPress={calculateQuality}
            isPrimary={true}
            icon="check-decagram"
            text={t('oil_yield.quality.buttons.evaluate')}
            disabled={!selectedBatch || !color || !clarity || !aroma}
          />
        </View>

        {/* Results Section */}
        {score !== null && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('oil_yield.quality.results.title')}</Text>
              <View style={styles.successBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#4aab4e" />
                <Text style={styles.successText}>{t('oil_yield.quality.results.status_complete')}</Text>
              </View>
            </View>

            {/* Quality Score Card */}
            <View style={styles.resultCard}>
              <BlurView intensity={70} tint="light" style={styles.resultBlur}>
                <View style={styles.resultHeader}>
                  <View style={[styles.resultIconContainer, { backgroundColor: `${getQualityColor()}20` }]}>
                    <MaterialCommunityIcons name="star-circle" size={32} color={getQualityColor()} />
                  </View>
                  <View style={[styles.resultBadge, { backgroundColor: `${getQualityColor()}20` }]}>
                    <Text style={[styles.resultBadgeText, { color: getQualityColor() }]}>
                      {label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.resultTitle}>{t('oil_yield.quality.results.quality_score')}</Text>
                <View style={styles.resultValueRow}>
                  <Text style={[styles.resultValue, { color: getQualityColor() }]}>
                    {score}
                  </Text>
                  <Text style={styles.resultValueUnit}>{t('oil_yield.quality.results.unit_over_100')}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultMeta}>
                  <MaterialCommunityIcons name="palette" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>
                    {color.replace('_', ' ')}
                  </Text>
                  <View style={styles.resultMetaDot} />
                  <MaterialCommunityIcons name="water" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>
                    {clarity.replace('_', ' ')}
                  </Text>
                  <View style={styles.resultMetaDot} />
                  <MaterialCommunityIcons name="flower" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{aroma}</Text>
                  {selectedBatch?.plant_part ? (
                    <>
                      <View style={styles.resultMetaDot} />
                      <MaterialCommunityIcons name="nature" size={14} color="#8E8E93" />
                      <Text style={styles.resultMetaText}>{selectedBatch.plant_part}</Text>
                    </>
                  ) : null}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { 
                      width: `${score}%`, 
                      backgroundColor: getQualityColor()
                    }]} />
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Price Estimation Card */}
           

            {/* Lab Decision Card */}
            <View style={styles.decisionCard}>
              <BlurView intensity={70} tint="light" style={styles.decisionBlur}>
                <View style={styles.decisionHeader}>
                  <View style={styles.decisionIconCircle}>
                    <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#4aab4e" />
                  </View>
                  <Text style={styles.decisionTitle}>{t('oil_yield.quality.results.lab_recommendation_title')}</Text>
                </View>
                <Text style={styles.decisionText}>{labAdvice}</Text>
              </BlurView>
            </View>

            {/* Recommendations Card */}
           

            {/* Lab Parameters Card */}
          

            {/* Disclaimer Card */}
           

            {/* Clear Button */}
            <TouchableOpacity onPress={clearForm} style={styles.clearButton} activeOpacity={0.7}>
              <Text style={styles.clearText}>{t('oil_yield.quality.buttons.clear')}</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(92, 230, 101, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(92, 230, 122, 0.2)',
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
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  infoCardBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(92, 230, 99, 0.15)',
    padding: 16,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.32,
  },
  infoCardText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
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
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  radioOptionSelected: {
    borderColor: 'rgba(92, 230, 113, 0.3)',
    backgroundColor: 'rgba(92, 230, 113, 0.05)',
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
    fontSize: 12,
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
  actionsRow: {
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
    borderColor: 'rgba(92, 230, 131, 0.2)',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: 'rgba(60, 67, 60, 0.18)',
    marginVertical: 12,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  resultMetaText: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
    textTransform: 'capitalize',
  },
  resultMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8E8E93',
    marginHorizontal: 2,
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
  priceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  priceBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    padding: 20,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  priceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceHeaderText: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
    marginBottom: 2,
  },
  priceSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: 0.36,
    marginBottom: 16,
    textAlign: 'center',
  },
  priceFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 67, 62, 0.18)',
  },
  priceInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceInfoText: {
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
    borderBottomColor: 'rgba(61, 67, 60, 0.18)',
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
    borderTopColor: 'rgba(60, 67, 61, 0.18)',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  qualityBadgeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  decisionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  decisionBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(92, 230, 133, 0.2)',
    padding: 20,
  },
  decisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 67, 62, 0.18)',
  },
  decisionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(92, 230, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
  },
  decisionText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
    letterSpacing: -0.24,
  },
  labCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  labBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.2)',
    padding: 18,
  },
  labHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 67, 61, 0.18)',
  },
  labIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.32,
  },
  labItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  labItemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9F0A',
    marginTop: 6,
  },
  labItemText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  disclaimerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF9F0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  disclaimerBlur: {
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.2)',
    padding: 16,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9F0A',
    letterSpacing: -0.24,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  contactButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  contactBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  contactButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.41,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4aab4e',
    letterSpacing: -0.24,
  },
});