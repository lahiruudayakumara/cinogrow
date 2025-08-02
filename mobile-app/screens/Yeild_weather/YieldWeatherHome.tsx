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
import { LinearGradient } from 'expo-linear-gradient';
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
          <LinearGradient
            colors={['#4FC3F7', '#29B6F6', '#0288D1']}
            style={[styles.weatherCard, styles.rainfallCard]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="rainy" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.cardLabel}>Rainfall</Text>
            <Text style={styles.cardValue}>12mm</Text>
          </LinearGradient>

          {/* Temperature Card */}
          <LinearGradient
            colors={['#FF8A65', '#FF7043', '#F4511E']}
            style={[styles.weatherCard, styles.temperatureCard]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="thermometer" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.cardLabel}>Temperature</Text>
            <Text style={styles.cardValue}>28°C</Text>
          </LinearGradient>
        </View>

        {/* Wind Speed Card */}
        <LinearGradient
          colors={['#81C784', '#66BB6A', '#4CAF50']}
          style={[styles.weatherCard, styles.windCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.windCardContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="leaf" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.windInfo}>
              <Text style={styles.cardLabel}>Wind Speed</Text>
              <Text style={styles.cardValue}>15 km/h</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButtonContainer} onPress={handleFindMyYield}>
            <LinearGradient
              colors={['#66BB6A', '#4CAF50', '#388E3C']}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Find My Yield</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButtonContainer} onPress={handleFarmAssistant}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FA']}
              style={styles.secondaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#4CAF50" style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Farm Assistant</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* What's Happening Section */}
        <View style={styles.whatsHappening}>
          <Text style={styles.sectionTitle}>What's Happening</Text>
          
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.alertCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.alertIcon}>
              <Ionicons name="warning" size={24} color="#FF9800" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Weather Alert</Text>
              <Text style={styles.alertDescription}>
                Rain expected tomorrow - delay pruning activities
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  weatherCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weatherCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  rainfallCard: {
    flex: 0.48,
  },
  temperatureCard: {
    flex: 0.48,
  },
  windCard: {
    marginBottom: 32,
  },
  windCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  windInfo: {
    marginLeft: 20,
    flex: 1,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 6,
    opacity: 0.9,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionButtons: {
    marginBottom: 40,
  },
  primaryButtonContainer: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 20,
  },
  alertCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  alertIcon: {
    marginRight: 16,
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 12,
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
