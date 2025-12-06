import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OilQualityGuide() {
  const [color, setColor] = useState('');
  const [clarity, setClarity] = useState('');
  const [aroma, setAroma] = useState('');
  const [plantPart, setPlantPart] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [predictedPrice, setPredictedPrice] = useState('');

  const plantPartLabels: Record<string, string> = {
    leaves: 'Leaves',
    bark: 'Bark',
    // roots: 'Roots',
    // flowers: 'Flowers',
    // fruit: 'Fruit',
    // seeds: 'Seeds',
    // whole_plant: 'Whole plant',
  };

  const calculateQuality = () => {
    if (!plantPart || !color || !clarity || !aroma) {
      return;
    }

    const colorScoreMap: Record<string, number> = {
      'pale_yellow': 90,
      'amber': 75,
      'golden': 80,
      'dark': 50,
    };
    const clarityScoreMap: Record<string, number> = {
      'clear': 90,
      'slightly_cloudy': 70,
      'cloudy': 40,
    };
    const aromaScoreMap: Record<string, number> = {
      'mild': 60,
      'aromatic': 90,
      'pungent': 75,
    };

    const colorScore = colorScoreMap[color] ?? 60;
    const clarityScore = clarityScoreMap[clarity] ?? 60;
    const aromaScore = aromaScoreMap[aroma] ?? 60;

    const finalScore = Math.round((colorScore + clarityScore + aromaScore) / 3);

    let qualityLabel = '';
    const recs: string[] = [];
    let priceRange = '';

    if (finalScore >= 85) {
      qualityLabel = 'Excellent';
      recs.push('Ready for commercial use with premium market value');
      recs.push('Store in dark, cool place to preserve aromatic properties');
      recs.push('Ideal for pharmaceutical and high-end cosmetic applications');
      priceRange = '$120 - $200 / L';
    } else if (finalScore >= 70) {
      qualityLabel = 'Good';
      recs.push('Consider mild purification for enhanced quality');
      recs.push('Monitor storage conditions to maintain integrity');
      recs.push('Suitable for food flavoring and aromatherapy markets');
      priceRange = '$70 - $120 / L';
    } else if (finalScore >= 50) {
      qualityLabel = 'Fair';
      recs.push('May require filtering or light refinement process');
      recs.push('Check raw materials and distillation parameters');
      recs.push('Best suited for industrial applications');
      priceRange = '$30 - $70 / L';
    } else {
      qualityLabel = 'Poor';
      recs.push('Perform comprehensive quality control steps');
      recs.push('Investigate distillation and drying issues thoroughly');
      recs.push('Discard if contamination is detected');
      priceRange = '$5 - $30 / L';
    }

    setScore(finalScore);
    setLabel(qualityLabel);
    setRecommendations(recs);
    setPredictedPrice(priceRange);
  };

  const clearForm = () => {
    setPlantPart('');
    setColor('');
    setClarity('');
    setAroma('');
    setScore(null);
    setLabel('');
    setRecommendations([]);
    setPredictedPrice('');
  };

  const getQualityColor = () => {
    if (!label) return '#8E8E93';
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
            color={selected ? '#5E5CE6' : '#8E8E93'} 
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
      <View style={[styles.radioCircle, selected && { borderColor: '#5E5CE6' }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: '#5E5CE6' }]} />}
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
              color={disabled ? '#C7C7CC' : (isPrimary ? '#FFFFFF' : '#5E5CE6')} 
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
              <MaterialCommunityIcons name="test-tube" size={28} color="#5E5CE6" />
            </View>
          </View>
          <Text style={styles.header}>Oil Quality Guide</Text>
          <Text style={styles.headerSubtitle}>
            Evaluate and assess your cinnamon oil quality
          </Text>
        </View>

        {/* Quick Info Banner */}
        <View style={styles.infoBanner}>
          <BlurView intensity={50} tint="light" style={styles.infoBannerBlur}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons name="information" size={20} color="#5E5CE6" />
              <Text style={styles.infoBannerText}>
                Select all attributes for quality assessment
              </Text>
            </View>
          </BlurView>
        </View>

        {/* Input Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quality Attributes</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>

        {/* Color Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="palette" size={24} color="#FF9F0A" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Color</Text>
                <Text style={styles.labelSubtext}>Visual appearance</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Pale Yellow"
                value="pale_yellow"
                selected={color === 'pale_yellow'}
                onSelect={() => setColor('pale_yellow')}
                icon="circle"
                subtitle="Premium quality indicator"
              />
              <RadioOption
                label="Golden"
                value="golden"
                selected={color === 'golden'}
                onSelect={() => setColor('golden')}
                icon="circle"
                subtitle="High quality standard"
              />
              <RadioOption
                label="Amber"
                value="amber"
                selected={color === 'amber'}
                onSelect={() => setColor('amber')}
                icon="circle"
                subtitle="Good quality range"
              />
              <RadioOption
                label="Dark"
                value="dark"
                selected={color === 'dark'}
                onSelect={() => setColor('dark')}
                icon="circle"
                subtitle="May indicate issues"
              />
            </View>
          </BlurView>
        </View>

        {/* Clarity Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="water" size={24} color="#0A84FF" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Clarity</Text>
                <Text style={styles.labelSubtext}>Transparency level</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Clear"
                value="clear"
                selected={clarity === 'clear'}
                onSelect={() => setClarity('clear')}
                icon="water"
                subtitle="Excellent transparency"
              />
              <RadioOption
                label="Slightly Cloudy"
                value="slightly_cloudy"
                selected={clarity === 'slightly_cloudy'}
                onSelect={() => setClarity('slightly_cloudy')}
                icon="water-opacity"
                subtitle="Minor impurities present"
              />
              <RadioOption
                label="Cloudy"
                value="cloudy"
                selected={clarity === 'cloudy'}
                onSelect={() => setClarity('cloudy')}
                icon="water-off"
                subtitle="Requires filtration"
              />
            </View>
          </BlurView>
        </View>

        {/* Aroma Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="flower" size={24} color="#FF2D55" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Aroma</Text>
                <Text style={styles.labelSubtext}>Scent intensity</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Mild"
                value="mild"
                selected={aroma === 'mild'}
                onSelect={() => setAroma('mild')}
                icon="flower-outline"
                subtitle="Subtle fragrance"
              />
              <RadioOption
                label="Aromatic"
                value="aromatic"
                selected={aroma === 'aromatic'}
                onSelect={() => setAroma('aromatic')}
                icon="flower"
                subtitle="Strong pleasant scent"
              />
              <RadioOption
                label="Pungent"
                value="pungent"
                selected={aroma === 'pungent'}
                onSelect={() => setAroma('pungent')}
                icon="flower-pollen"
                subtitle="Intense sharp odor"
              />
            </View>
          </BlurView>
        </View>

        {/* Plant Part Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="nature" size={24} color="#34C759" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Plant Part</Text>
                <Text style={styles.labelSubtext}>Source material</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Bark"
                value="bark"
                selected={plantPart === 'bark'}
                onSelect={() => setPlantPart('bark')}
                icon="nature-people"
              />
              <RadioOption
                label="Leaves & Twigs"
                value="leaves"
                selected={plantPart === 'leaves'}
                onSelect={() => setPlantPart('leaves')}
                icon="leaf"
              />
              {/* <RadioOption
                label="Roots"
                value="roots"
                selected={plantPart === 'roots'}
                onSelect={() => setPlantPart('roots')}
                icon="tree"
              />
              <RadioOption
                label="Flowers"
                value="flowers"
                selected={plantPart === 'flowers'}
                onSelect={() => setPlantPart('flowers')}
                icon="flower-tulip"
              />
              <RadioOption
                label="Fruit"
                value="fruit"
                selected={plantPart === 'fruit'}
                onSelect={() => setPlantPart('fruit')}
                icon="fruit-cherries"
              />
              <RadioOption
                label="Seeds"
                value="seeds"
                selected={plantPart === 'seeds'}
                onSelect={() => setPlantPart('seeds')}
                icon="seed"
              />
              <RadioOption
                label="Whole Plant"
                value="whole_plant"
                selected={plantPart === 'whole_plant'}
                onSelect={() => setPlantPart('whole_plant')}
                icon="sprout"
              /> */}
            </View>
          </BlurView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <ControlButton
            onPress={calculateQuality}
            isPrimary={true}
            icon="check-decagram"
            text="Evaluate Quality"
            disabled={!plantPart || !color || !clarity || !aroma}
          />
        </View>

        {score !== null && (
          <View style={styles.actionsRow}>
            <ControlButton
              onPress={clearForm}
              isPrimary={false}
              icon="refresh"
              text="Clear Form"
            />
          </View>
        )}

        {/* Results Section */}
        {score !== null && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Assessment Results</Text>
              <View style={styles.successBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#30D158" />
                <Text style={styles.successText}>Complete</Text>
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
                <Text style={styles.resultTitle}>Quality Score</Text>
                <View style={styles.resultValueRow}>
                  <Text style={[styles.resultValue, { color: getQualityColor() }]}>
                    {score}
                  </Text>
                  <Text style={styles.resultValueUnit}>/100</Text>
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
            <View style={styles.priceCard}>
              <BlurView intensity={70} tint="light" style={styles.priceBlur}>
                <View style={styles.priceHeader}>
                  <View style={styles.priceIconCircle}>
                    <MaterialCommunityIcons name="cash-multiple" size={24} color="#34C759" />
                  </View>
                  <View style={styles.priceHeaderText}>
                    <Text style={styles.priceLabel}>Market Value Estimate</Text>
                    <Text style={styles.priceSubtext}>Global price range</Text>
                  </View>
                </View>
                <Text style={styles.priceValue}>{predictedPrice}</Text>
                <View style={styles.priceFooter}>
                  <View style={styles.priceInfoItem}>
                    <MaterialCommunityIcons name="chart-line" size={16} color="#34C759" />
                    <Text style={styles.priceInfoText}>Market rate</Text>
                  </View>
                  <View style={styles.priceInfoItem}>
                    <MaterialCommunityIcons name="nature" size={16} color="#8E8E93" />
                    <Text style={styles.priceInfoText}>
                      {plantPartLabels[plantPart]}
                    </Text>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Recommendations Card */}
            <View style={styles.recommendationCard}>
              <BlurView intensity={70} tint="light" style={styles.recommendationBlur}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIconCircle}>
                    <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FF9F0A" />
                  </View>
                  <Text style={styles.recommendationTitle}>Quality Recommendations</Text>
                </View>
                
                <View style={styles.recommendationSection}>
                  <Text style={styles.recommendationSectionTitle}>Action Items</Text>
                  {recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationTip}>
                      <View style={styles.tipBullet}>
                        <View style={styles.tipBulletDot} />
                      </View>
                      <Text style={styles.tipText}>{rec}</Text>
                    </View>
                  ))}
                </View>

                {/* Quality Badge */}
                <View style={styles.qualityBadgeContainer}>
                  <View style={[styles.qualityBadge, { backgroundColor: `${getQualityColor()}15` }]}>
                    <MaterialCommunityIcons name="certificate" size={16} color={getQualityColor()} />
                    <Text style={[styles.qualityBadgeText, { color: getQualityColor() }]}>
                      {label} Grade Classification
                    </Text>
                  </View>
                </View>
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
    backgroundColor: 'rgba(94, 92, 230, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 92, 230, 0.2)',
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
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBannerBlur: {
    flex: 1,
    backgroundColor: 'rgba(94, 92, 230, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 92, 230, 0.15)',
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
    color: '#5E5CE6',
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
    color: '#30D158',
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
    borderColor: 'rgba(94, 92, 230, 0.3)',
    backgroundColor: 'rgba(94, 92, 230, 0.05)',
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
    shadowColor: '#5E5CE6',
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
    color: '#5E5CE6',
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
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  resultBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 92, 230, 0.2)',
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
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
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
    shadowColor: '#34C759',
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
    color: '#34C759',
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
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
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
});