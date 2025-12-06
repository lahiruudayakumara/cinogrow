import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OilPricePredictor() {
  const [oilType, setOilType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [qualityGrade, setQualityGrade] = useState('');
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Price calculation based on current market rates
  const calculatePrice = () => {
    if (!oilType || !quantity || !qualityGrade) {
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return;
    }

    // Base prices per kg (LKR) - these are approximate market rates
    let basePrice = 0;
    let priceVariation = 0;

    if (oilType === 'Leaf') {
      // Cinnamon leaf oil: 75-85% eugenol
      basePrice = 8000; // LKR per kg
      priceVariation = 1500;
      
      // Quality adjustment
      if (qualityGrade === 'Premium') {
        basePrice += 2000; // High eugenol content (>80%)
      } else if (qualityGrade === 'Standard') {
        basePrice += 500;
      }
    } else if (oilType === 'Bark') {
      // Cinnamon bark oil: 30-75% cinnamaldehyde
      basePrice = 15000; // LKR per kg (higher than leaf oil)
      priceVariation = 3000;
      
      // Quality adjustment based on cinnamaldehyde content
      if (qualityGrade === 'Premium') {
        basePrice += 5000; // Superior grade (≥60% cinnamaldehyde)
      } else if (qualityGrade === 'Standard') {
        basePrice += 2000; // Special grade (55-60%)
      }
    }

    const totalPrice = basePrice * qty;
    const minPrice = (basePrice - priceVariation) * qty;
    const maxPrice = (basePrice + priceVariation) * qty;

    setPredictedPrice(Math.round(totalPrice));
    setPriceRange({ min: Math.round(minPrice), max: Math.round(maxPrice) });
    setShowResults(true);
  };

  const formatCurrency = (value: number) => {
    return `LKR ${value.toLocaleString()}`;
  };

  const getMarketInsights = () => {
    const insights = {
      trend: '',
      factors: [] as string[],
      recommendation: '',
    };

    if (oilType === 'Leaf') {
      insights.trend = 'Stable demand in pharmaceutical and cosmetic industries';
      insights.factors = [
        'Eugenol content (75-85%) is key price determinant',
        'International demand from perfume manufacturers',
        'Seasonal variations affect availability',
        'Export certifications increase value by 20-30%',
      ];
      insights.recommendation = 'Best selling time: After harvest season (March-June)';
    } else if (oilType === 'Bark') {
      insights.trend = 'High demand as premium flavoring agent';
      insights.factors = [
        'Cinnamaldehyde content directly impacts price',
        'Superior grade (≥60%) commands premium prices',
        'Food & beverage industry drives demand',
        'International standards certification essential',
      ];
      insights.recommendation = 'Focus on quality to achieve superior grade classification';
    }

    return insights;
  };

  const RadioOption = ({ label, value, selected, onSelect, icon, subtitle }: {
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
          <MaterialCommunityIcons name={icon as any} size={20} color={selected ? '#FF3B30' : '#8E8E93'} />
        </View>
        <View style={styles.radioTextContainer}>
          <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
          {subtitle && <Text style={styles.radioSubtext}>{subtitle}</Text>}
        </View>
      </View>
      <View style={[styles.radioCircle, selected && { borderColor: '#FF3B30' }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: '#FF3B30' }]} />}
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
      <Animated.View style={[styles.controlButtonWrapper, { transform: [{ scale: scaleAnim }] }]}>
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
              color={disabled ? '#C7C7CC' : (isPrimary ? '#FFFFFF' : '#FF3B30')} 
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
              <MaterialCommunityIcons name="chart-line" size={28} color="#FF3B30" />
            </View>
          </View>
          <Text style={styles.header}>Oil Price Predictor</Text>
          <Text style={styles.headerSubtitle}>
            Estimate market value based on quality and quantity
          </Text>
        </View>

        {/* Quick Info Banner */}
        <View style={styles.infoBanner}>
          <BlurView intensity={50} tint="light" style={styles.infoBannerBlur}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons name="information" size={20} color="#FF3B30" />
              <Text style={styles.infoBannerText}>
                Real-time market rates for cinnamon oil
              </Text>
            </View>
          </BlurView>
        </View>

        {/* Input Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>

        {/* Oil Type Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="flask" size={24} color="#FF3B30" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Oil Type</Text>
                <Text style={styles.labelSubtext}>Select product type</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Leaf Oil (Eugenol)"
                value="Leaf"
                selected={oilType === 'Leaf'}
                onSelect={() => setOilType('Leaf')}
                icon="leaf"
                subtitle="~LKR 8,000-10,000/kg"
              />
              <RadioOption
                label="Bark Oil (Cinnamaldehyde)"
                value="Bark"
                selected={oilType === 'Bark'}
                onSelect={() => setOilType('Bark')}
                icon="nature-people"
                subtitle="~LKR 15,000-20,000/kg"
              />
            </View>
          </BlurView>
        </View>

        {/* Quality Grade Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="certificate" size={24} color="#30D158" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Quality Grade</Text>
                <Text style={styles.labelSubtext}>Product classification</Text>
              </View>
            </View>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Premium Grade"
                value="Premium"
                selected={qualityGrade === 'Premium'}
                onSelect={() => setQualityGrade('Premium')}
                icon="star"
                subtitle={oilType === 'Bark' ? '≥60% cinnamaldehyde' : '>80% eugenol'}
              />
              <RadioOption
                label="Standard Grade"
                value="Standard"
                selected={qualityGrade === 'Standard'}
                onSelect={() => setQualityGrade('Standard')}
                icon="star-half-full"
                subtitle={oilType === 'Bark' ? '55-60% cinnamaldehyde' : '75-80% eugenol'}
              />
              <RadioOption
                label="Basic Grade"
                value="Basic"
                selected={qualityGrade === 'Basic'}
                onSelect={() => setQualityGrade('Basic')}
                icon="star-outline"
                subtitle="Standard quality"
              />
            </View>
          </BlurView>
        </View>

        {/* Quantity Input Card */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="weight-kilogram" size={24} color="#0A84FF" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>Quantity</Text>
                <Text style={styles.labelSubtext}>In kilograms</Text>
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity (e.g., 10)"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
              <View style={styles.inputSuffix}>
                <Text style={styles.inputSuffixText}>kg</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Calculate Button */}
        <ControlButton
          onPress={calculatePrice}
          isPrimary={true}
          icon="calculator"
          text="Calculate Market Value"
          disabled={!oilType || !quantity || !qualityGrade}
        />

        {/* Results Section */}
        {showResults && predictedPrice && priceRange && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Market Estimate</Text>
              <View style={styles.successBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#30D158" />
                <Text style={styles.successText}>Calculated</Text>
              </View>
            </View>

            {/* Price Card */}
            <View style={styles.resultCard}>
              <BlurView intensity={70} tint="light" style={styles.resultBlur}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultIconContainer}>
                    <MaterialCommunityIcons name="cash-multiple" size={32} color="#FF3B30" />
                  </View>
                  <View style={styles.resultBadge}>
                    <Text style={styles.resultBadgeText}>Estimated Value</Text>
                  </View>
                </View>
                <Text style={styles.resultTitle}>Predicted Market Price</Text>
                <View style={styles.resultValueRow}>
                  <Text style={styles.resultValue}>{formatCurrency(predictedPrice)}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.priceRangeContainer}>
                  <View style={styles.priceRangeItem}>
                    <MaterialCommunityIcons name="arrow-down" size={16} color="#FF3B30" />
                    <Text style={styles.priceRangeLabel}>Min</Text>
                    <Text style={styles.priceRangeValue}>{formatCurrency(priceRange.min)}</Text>
                  </View>
                  <View style={styles.priceRangeDivider} />
                  <View style={styles.priceRangeItem}>
                    <MaterialCommunityIcons name="arrow-up" size={16} color="#30D158" />
                    <Text style={styles.priceRangeLabel}>Max</Text>
                    <Text style={styles.priceRangeValue}>{formatCurrency(priceRange.max)}</Text>
                  </View>
                </View>
                <View style={styles.resultMeta}>
                  <MaterialCommunityIcons name="flask" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{oilType} Oil</Text>
                  <View style={styles.resultMetaDot} />
                  <MaterialCommunityIcons name="certificate" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{qualityGrade}</Text>
                  <View style={styles.resultMetaDot} />
                  <MaterialCommunityIcons name="weight" size={14} color="#8E8E93" />
                  <Text style={styles.resultMetaText}>{quantity} kg</Text>
                </View>
              </BlurView>
            </View>

            {/* Market Insights Card */}
            <View style={styles.recommendationCard}>
              <BlurView intensity={70} tint="light" style={styles.recommendationBlur}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIconCircle}>
                    <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FF9F0A" />
                  </View>
                  <Text style={styles.recommendationTitle}>Market Insights</Text>
                </View>
                
                {(() => {
                  const insights = getMarketInsights();
                  return (
                    <>
                      {/* Market Trend */}
                      <View style={styles.recommendationPrimary}>
                        <MaterialCommunityIcons name="trending-up" size={18} color="#FF3B30" />
                        <Text style={styles.recommendationPrimaryText}>{insights.trend}</Text>
                      </View>

                      {/* Price Factors */}
                      <View style={styles.recommendationSection}>
                        <Text style={styles.recommendationSectionTitle}>Price Factors</Text>
                        {insights.factors.map((factor: string, index: number) => (
                          <View key={index} style={styles.recommendationTip}>
                            <View style={styles.tipBullet}>
                              <View style={styles.tipBulletDot} />
                            </View>
                            <Text style={styles.tipText}>{factor}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Recommendation Badge */}
                      <View style={styles.qualityBadgeContainer}>
                        <View style={styles.qualityBadge}>
                          <MaterialCommunityIcons name="calendar-check" size={16} color="#5E5CE6" />
                          <Text style={styles.qualityBadgeText}>{insights.recommendation}</Text>
                        </View>
                      </View>
                    </>
                  );
                })()}
              </BlurView>
            </View>

            {/* Standards Reference Card */}
            <View style={styles.infoCard}>
              <BlurView intensity={70} tint="light" style={styles.infoBlur}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconCircle}>
                    <MaterialCommunityIcons name="file-document" size={20} color="#0A84FF" />
                  </View>
                  <Text style={styles.infoTitle}>Quality Standards</Text>
                </View>
                <View style={styles.infoContent}>
                  {oilType === 'Leaf' ? (
                    <>
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#30D158" />
                        <Text style={styles.infoItemText}>SLS 184:2012 & ISO 3524:2003 compliance</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="flask" size={16} color="#30D158" />
                        <Text style={styles.infoItemText}>Eugenol content: 75-85% required</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="certificate" size={16} color="#30D158" />
                        <Text style={styles.infoItemText}>Export certification increases value 20-30%</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#30D158" />
                        <Text style={styles.infoItemText}>SLS 185:2012 standard compliance</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="flask" size={16} color="#30D158" />
                        <Text style={styles.infoItemText}>Superior: ≥60% cinnamaldehyde</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="certificate" size={16} color="#30D158" />
                        <Text style={styles.infoItemText}>Premium pricing for certified superior grade</Text>
                      </View>
                    </>
                  )}
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
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 59, 48, 0.2)',
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
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBannerBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 59, 48, 0.15)',
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
    color: '#FF3B30',
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
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  radioContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.24,
  },
  radioLabelSelected: {
    color: '#FF3B30',
  },
  radioSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    padding: 16,
    letterSpacing: -0.32,
  },
  inputSuffix: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  inputSuffixText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  controlButtonWrapper: {
    marginBottom: 16,
  },
  controlButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButton: {
    shadowColor: '#FF3B30',
  },
  secondaryButton: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  disabledButton: {
    opacity: 0.5,
  },
  controlButtonBlur: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  controlButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.41,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#FF3B30',
  },
  disabledButtonText: {
    color: '#C7C7CC',
  },
  resultCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  resultBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 59, 48, 0.2)',
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
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
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
    marginBottom: 12,
  },
  resultValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: -0.5,
  },
  resultDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginVertical: 12,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceRangeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceRangeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  priceRangeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  priceRangeDivider: {
    width: 0.5,
    height: 30,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginHorizontal: 12,
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
  recommendationPrimary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
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
    backgroundColor: '#FF3B30',
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
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
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
});
