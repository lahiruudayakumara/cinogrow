import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';

type NavigationProp = StackNavigationProp<YieldWeatherStackParamList>;

const YieldWeatherHome = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleFindMyYield = () => {
    navigation.navigate('FarmDetails');
  };

  const handleFarmAssistant = () => {
    navigation.navigate('FarmAssistance');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi Udari!</Text>
          <Text style={styles.subtitle}>Here's what your farm looks like today.</Text>
        </View>

        {/* Weather Cards */}
        <View style={styles.weatherCards}>
          {/* Rainfall Card */}
          <View style={[styles.weatherCard, styles.rainfallCard]}>
            <View style={styles.cardIcon}>
              <Ionicons name="rainy" size={24} color="#4A90E2" />
            </View>
            <Text style={styles.cardLabel}>Rainfall</Text>
            <Text style={styles.cardValue}>12mm</Text>
          </View>

          {/* Temperature Card */}
          <View style={[styles.weatherCard, styles.temperatureCard]}>
            <View style={styles.cardIcon}>
              <Ionicons name="thermometer" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.cardLabel}>Temperature</Text>
            <Text style={styles.cardValue}>28°C</Text>
          </View>
        </View>

        {/* Wind Speed Card */}
        <View style={[styles.weatherCard, styles.windCard]}>
          <View style={styles.windCardContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="leaf" size={24} color="#4CAF50" />
            </View>
            <View style={styles.windInfo}>
              <Text style={styles.cardLabel}>Wind Speed</Text>
              <Text style={styles.cardValue}>15 km/h</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleFindMyYield}>
            <Text style={styles.primaryButtonText}>Find My Yield</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleFarmAssistant}>
            <Text style={styles.secondaryButtonText}>Farm Assistant</Text>
          </TouchableOpacity>
        </View>

        {/* What's Happening Section */}
        <View style={styles.whatsHappening}>
          <Text style={styles.sectionTitle}>What's Happening</Text>
          
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="rainy" size={20} color="#4A90E2" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Alert</Text>
              <Text style={styles.alertDescription}>
                Rain expected tomorrow - delay pruning
              </Text>
            </View>
          </View>
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  weatherCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weatherCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rainfallCard: {
    backgroundColor: '#E3F2FD',
    flex: 0.48,
  },
  temperatureCard: {
    backgroundColor: '#FFE5E5',
    flex: 0.48,
  },
  windCard: {
    backgroundColor: '#E8F5E8',
    marginBottom: 24,
  },
  windCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  windInfo: {
    marginLeft: 16,
    flex: 1,
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  actionButtons: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  whatsHappening: {
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});

export default YieldWeatherHome;
