import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import apiConfig from '../../../config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

// Use localhost for web platform, otherwise use the configured API URL
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

export default function OilPricePredictor() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // SARIMA time series forecasting (UI: daily/weekly/monthly)
  const fetchForecast = async (range: 'daily' | 'weekly' | 'monthly') => {
    console.log('🔍 Fetching SARIMA forecast');
    console.log('Oil Type: Leaf');
    console.log('Time Range:', range);

    setLoading(true);
    setShowResults(false);
    setForecastData(null);

    try {
      // Map UI range to backend-expected values
      const backendRange = range === 'daily' ? 'days' : range === 'monthly' ? 'months' : 'days';
      const steps = range === 'daily' ? 7 : range === 'weekly' ? 56 : 12;
      const response = await fetch(`${API_BASE_URL}/oil_yield/price_forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oil_type: 'Leaf',
          time_range: backendRange,
          steps,
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Forecast data received');
      
      setForecastData(data);
      setTimeRange(range);
      setShowResults(true);
    } catch (error: any) {
      console.error('❌ Forecast error:', error);
      Alert.alert(
        'Forecast Failed',
        `Unable to fetch price forecast.\n\nError: ${error.message}\n\nPlease check your connection and try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Load default chart on mount
  useEffect(() => {
    fetchForecast('monthly');
  }, []);

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  // Aggregate daily points into weekly averages (8 weeks)
  const aggregateWeekly = (values: number[]) => {
    const weeks: number[] = [];
    for (let i = 0; i < values.length; i += 7) {
      const chunk = values.slice(i, i + 7);
      if (chunk.length === 0) break;
      const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
      weeks.push(Number(avg.toFixed(2)));
    }
    return weeks;
  };

  const getDisplayedStatistics = () => {
    if (!forecastData || !forecastData.forecast) return null;
    if (timeRange === 'weekly') {
      const weekly = aggregateWeekly(forecastData.forecast);
      if (weekly.length === 0) return null;
      const mean = weekly.reduce((a: number, b: number) => a + b, 0) / weekly.length;
      const min = Math.min(...weekly);
      const max = Math.max(...weekly);
      return { mean, min, max };
    }
    return forecastData.statistics || null;
  };

  const getChartData = () => {
    if (!forecastData || !forecastData.forecast) {
      return { labels: [], datasets: [{ data: [] }] };
    }

    let prices: number[] = forecastData.forecast || [];
    const dates: string[] = forecastData.dates || [];

    if (timeRange === 'weekly') {
      prices = aggregateWeekly(prices);
    }

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const monthShort = (d: Date) => d.toLocaleString('en-US', { month: 'short' });
    const weekdayShort = (d: Date) => d.toLocaleString('en-US', { weekday: 'short' });
    const formatDM = (ds: string) => {
      const d = new Date(ds);
      return `${pad2(d.getDate())} ${monthShort(d)}`;
    };
    const weekOfMonth = (ds: string) => {
      const d = new Date(ds);
      return Math.ceil(d.getDate() / 7);
    };

    let labels: string[] = [];
    if (timeRange === 'daily' && dates.length) {
      labels = dates.map((ds) => {
        const d = new Date(ds);
        // Stack parts vertically to avoid overlap
        return `${weekdayShort(d)}\n${pad2(d.getDate())}\n${monthShort(d)}`;
      });
    } else if (timeRange === 'weekly' && dates.length) {
      labels = [];
      for (let i = 0; i < dates.length; i += 7) {
        const start = dates[i];
        const sd = new Date(start);
        // Week number + month on separate lines
        labels.push(`W${weekOfMonth(start)}\n${monthShort(sd)}`);
      }
      // Ensure labels length matches aggregated prices length
      if (labels.length > prices.length) labels = labels.slice(0, prices.length);
      if (labels.length < prices.length) {
        // pad with last known label
        const last = labels[labels.length - 1] || 'W? ??/??';
        while (labels.length < prices.length) labels.push(last);
      }
    } else {
      // Monthly: show month names from dates
      if (dates.length) {
        labels = dates.map((ds) => {
          const d = new Date(ds);
          return d.toLocaleString('en-US', { month: 'long' });
        });
      } else {
        labels = prices.map((_, index: number) => `M${index + 1}`);
      }
    }

    return {
      labels,
      datasets: [
        {
          data: prices,
          color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 'daily') return 'Next 30 Days';
    if (timeRange === 'weekly') return 'Next 4–5 Weeks';
    return 'Next 12 Months';
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
              <MaterialCommunityIcons name="chart-line" size={28} color="#4aab4e" />
            </View>
          </View>
          <Text style={styles.header}>Leaf Oil Price Forecast</Text>
          <Text style={styles.headerSubtitle}>
             ML forecast for cinnamon leaf oil prices
          </Text>
        </View>

        {/* View Toggle Buttons */}
        {!loading && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>View</Text>
            </View>
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[styles.viewToggleButton, timeRange === 'daily' && styles.viewToggleButtonActive]}
                onPress={() => fetchForecast('daily')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="calendar-today" 
                  size={18} 
                  color={timeRange === 'daily' ? '#FFFFFF' : '#8E8E93'} 
                />
                <Text style={[styles.viewToggleText, timeRange === 'daily' && styles.viewToggleTextActive]}>
                  Daily
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleButton, timeRange === 'weekly' && styles.viewToggleButtonActive]}
                onPress={() => fetchForecast('weekly')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="calendar-week" 
                  size={18} 
                  color={timeRange === 'weekly' ? '#FFFFFF' : '#8E8E93'} 
                />
                <Text style={[styles.viewToggleText, timeRange === 'weekly' && styles.viewToggleTextActive]}>
                  Weekly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleButton, timeRange === 'monthly' && styles.viewToggleButtonActive]}
                onPress={() => fetchForecast('monthly')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="calendar-month" 
                  size={18} 
                  color={timeRange === 'monthly' ? '#FFFFFF' : '#8E8E93'} 
                />
                <Text style={[styles.viewToggleText, timeRange === 'monthly' && styles.viewToggleTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>Loading forecast...</Text>
          </View>
        )}

        {/* Results Section */}
        {showResults && forecastData && (
          <>
          

          

            {/* Price Chart Card */}
            <View style={styles.chartCard}>
              <BlurView intensity={70} tint="light" style={styles.chartBlur}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartIconCircle}>
                    <MaterialCommunityIcons name="chart-areaspline" size={24} color="#4aab4e" />
                  </View>
                  <View style={styles.chartHeaderText}>
                    <Text style={styles.chartTitle}>Price Trend</Text>
                    <Text style={styles.chartSubtext}>SARIMA forecast visualization</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(() => {
                    const chartData = getChartData();
                    const computedWidth = Math.max(CHART_WIDTH, chartData.labels.length * 40);
                    return (
                      <LineChart
                        data={chartData}
                        width={computedWidth}
                    height={280}
                    chartConfig={{
                      backgroundColor: '#FFFFFF',
                      backgroundGradientFrom: '#FFFFFF',
                      backgroundGradientTo: '#F9F9F9',
                      decimalPlaces: 2,
                      color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(60, 60, 67, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                          propsForLabels: {
                            fontSize: 10,
                          },
                      propsForDots: {
                        r: '5',
                        strokeWidth: '2',
                        stroke: '#FF3B30',
                      },
                      propsForBackgroundLines: {
                        strokeDasharray: '',
                        stroke: 'rgba(0, 0, 0, 0.05)',
                      },
                    }}
                    bezier
                    style={styles.chart}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    withDots={true}
                    withShadow={false}
                    withInnerLines={true}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                        verticalLabelRotation={60}
                        xLabelsOffset={-6}
                      />
                    );
                  })()}
                </ScrollView>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.legendText}>Predicted Price (LKR/kg)</Text>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Statistics Card */}
            <View style={styles.recommendationCard}>
              <BlurView intensity={70} tint="light" style={styles.recommendationBlur}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIconCircle}>
                    <MaterialCommunityIcons name="chart-box" size={20} color="#4aab4e" />
                  </View>
                  <Text style={styles.recommendationTitle}>Forecast Statistics</Text>
                </View>
                
                {getDisplayedStatistics() && (
                  <>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons name="arrow-up" size={20} color="#30D158" />
                        <Text style={styles.statLabel}>Average</Text>
                        <Text style={styles.statValue}>
                          {formatCurrency((getDisplayedStatistics() as any).mean || 0)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons name="arrow-down" size={20} color="#FF3B30" />
                        <Text style={styles.statLabel}>Min</Text>
                        <Text style={styles.statValue}>
                          {formatCurrency((getDisplayedStatistics() as any).min || 0)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons name="arrow-up" size={20} color="#FF9F0A" />
                        <Text style={styles.statLabel}>Max</Text>
                        <Text style={styles.statValue}>
                          {formatCurrency((getDisplayedStatistics() as any).max || 0)}
                        </Text>
                      </View>
                    </View>
                    
                  </>
                )}
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
    backgroundColor: 'rgba(48, 255, 96, 0.15)',
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
    backgroundColor: 'rgba(10, 255, 96, 0.15)',
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
  loadingContainer: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 59, 48, 0.15)',
  },
  loadingText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
    letterSpacing: -0.41,
  },
  forecastSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.08,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  chartCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  chartBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  chartIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(48, 255, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartHeaderText: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
    marginBottom: 2,
  },
  chartSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    letterSpacing: -0.08,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.08,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  viewToggleButtonActive: {
    backgroundColor: '#22c232ff',
    borderColor: '#23c04dff',
    shadowColor: '#1cb435ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.24,
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
});
