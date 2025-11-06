import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';

type YieldPredictionNavigationProp = StackNavigationProp<YieldWeatherStackParamList, 'YieldPrediction'>;

type YieldPredictionProps = {
  navigation: YieldPredictionNavigationProp;
};

const YieldPrediction = ({ navigation }: YieldPredictionProps) => {
  const handleBackToHome = () => {
    navigation.navigate('YieldWeatherHome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Yield Prediction</Text>
          <Text style={styles.subtitle}>Based on your farm data and historical patterns</Text>
        </View>

        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Ionicons name="analytics" size={24} color="#4CAF50" />
            <Text style={styles.predictionTitle}>Estimated Yield</Text>
          </View>
          <Text style={styles.yieldValue}>1,250 kg</Text>
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceProgress, { width: '85%' }]} />
            </View>
            <Text style={styles.confidenceText}>Confidence Level: 85%</Text>
          </View>
        </View>

        <View style={styles.historicalCard}>
          <Text style={styles.cardTitle}>Historical Comparison</Text>
          <View style={styles.historicalRow}>
            <View style={styles.historicalItem}>
              <Text style={styles.historicalLabel}>Previous Average</Text>
              <Text style={styles.historicalValue}>1,100 kg</Text>
            </View>
            <View style={styles.historicalItem}>
              <Text style={styles.historicalLabel}>5-Year Trend</Text>
              <Text style={[styles.historicalValue, styles.positiveChange]}>+10%</Text>
            </View>
          </View>
        </View>

        <View style={styles.insightsCard}>
          <Text style={styles.cardTitle}>Key Insights</Text>
          <View style={styles.insightItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.insightText}>Favorable weather conditions expected</Text>
          </View>
          <View style={styles.insightItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.insightText}>Optimal planting date recorded</Text>
          </View>
          <View style={styles.insightItem}>
            <Ionicons name="alert-circle" size={20} color="#FF9800" />
            <Text style={styles.insightText}>Monitor for pest activity during growth</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleBackToHome}>
            <Text style={styles.primaryButtonText}>Back to Home</Text>
            <Ionicons name="home" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  yieldValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  confidenceProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666666',
  },
  historicalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  historicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historicalItem: {
    flex: 0.48,
    alignItems: 'center',
  },
  historicalLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  historicalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  positiveChange: {
    color: '#4CAF50',
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

export default YieldPrediction;