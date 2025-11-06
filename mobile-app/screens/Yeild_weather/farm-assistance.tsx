import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { YieldWeatherStackParamList } from '../../navigation/YieldWeatherNavigator';

type FarmAssistanceNavigationProp = StackNavigationProp<YieldWeatherStackParamList, 'FarmAssistance'>;

interface FarmAssistanceProps {
  navigation: FarmAssistanceNavigationProp;
}
const FarmAssistance = ({ navigation }: FarmAssistanceProps) => {
  const handleBackToHome = () => {
    navigation.navigate('YieldWeatherHome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Farm Assistant</Text>
          <Text style={styles.subtitle}>Your personalized farming guidance</Text>
        </View>

        <View style={styles.currentStageCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="leaf" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Current Stage</Text>
          </View>
          <View style={styles.stageInfo}>
            <Text style={styles.stageName}>Pruning Stage</Text>
            <Text style={styles.stageDay}>Day 45 of growth cycle</Text>
          </View>
        </View>

        <View style={styles.activitiesCard}>
          <Text style={styles.cardTitle}>Key Activities</Text>
          
          <View style={styles.activityItem}>
            <Ionicons name="flower" size={20} color="#4CAF50" />
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Planting</Text>
              <Text style={styles.activityDate}>Due on July 28</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </View>

          <View style={styles.activityItem}>
            <Ionicons name="cut" size={20} color="#FF9800" />
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Pruning</Text>
              <Text style={styles.activityStatus}>Recommended</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </View>

          <View style={styles.activityItem}>
            <Ionicons name="basket" size={20} color="#2196F3" />
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Harvesting</Text>
              <Text style={styles.activityAlert}>Alert on August 20</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </View>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={24} color="#FF6B6B" />
            <Text style={styles.alertTitle}>Weather Alert</Text>
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertType}>High Wind Warning</Text>
            <Text style={styles.alertDescription}>
              Expected on July 28. Secure equipment and crops to prevent damage.
            </Text>
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
  currentStageCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  stageInfo: {
    alignItems: 'center',
  },
  stageName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  stageDay: {
    fontSize: 14,
    color: '#666666',
  },
  activitiesCard: {
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 14,
    color: '#666666',
  },
  activityStatus: {
    fontSize: 14,
    color: '#FF9800',
  },
  activityAlert: {
    fontSize: 14,
    color: '#F44336',
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginLeft: 8,
  },
  alertContent: {
    marginLeft: 32,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#BF5000',
    lineHeight: 20,
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

export default FarmAssistance;