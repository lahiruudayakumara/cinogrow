import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

import type { StackNavigationProp } from '@react-navigation/stack';

type WeatherHomeProps = {
  navigation: StackNavigationProp<any>;
};

const WeatherHome = ({ navigation }: WeatherHomeProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>+ Farm Assistant</Text>
      <View style={styles.assistantBox}>
        <Text style={styles.assistantText}>Current Stage</Text>
        <Text>Pruning Stage</Text>
        <Text>Day 45 of growth cycle</Text>
      </View>
      <View style={styles.keyActivities}>
        <Text style={styles.keyText}>Key Activities</Text>
        <View style={styles.activityItem}>
          <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
          <Text>Planting</Text>
          <Text>due on July 28</Text>
        </View>
        <View style={styles.activityItem}>
          <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
          <Text>Pruning</Text>
          <Text>Recommended</Text>
        </View>
        <View style={styles.activityItem}>
          <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
          <Text>Harvesting</Text>
          <Text>Alert on August 20</Text>
        </View>
      </View>
      <View style={styles.alertContainer}>
        <Text style={styles.alertText}>Weather Alert</Text>
        <View style={styles.alertBox}>
          <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
          <Text>High Wind Warning</Text>
          <Text>on July 28. Secure equipment and crops.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20 },
  assistantBox: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 5, marginBottom: 20 },
  assistantText: { fontWeight: 'bold', color: '#2E7D32' },
  keyActivities: { marginBottom: 20 },
  keyText: { fontSize: 16, color: '#666', marginBottom: 10 },
  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: { width: 20, height: 20, marginRight: 10 },
  alertContainer: { marginTop: 'auto' },
  alertText: { fontSize: 16, color: '#666', marginBottom: 10 },
  alertBox: { backgroundColor: '#E0F7FA', padding: 10, borderRadius: 5, flexDirection: 'row', alignItems: 'center' },
});

export default WeatherHome;