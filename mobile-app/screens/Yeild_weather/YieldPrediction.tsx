import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';

type YieldPredictionProps = {
  navigation: StackNavigationProp<any, any>;
};

const YieldPrediction = ({ navigation }: YieldPredictionProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>+ Yield Prediction</Text>
      <View style={styles.yieldBox}>
        <Text style={styles.yieldText}>Estimated Yield</Text>
        <Text style={styles.yieldValue}>1250 kg</Text>
        <Text>Confidence Level 85%</Text>
      </View>
      <View style={styles.historicalContainer}>
        <Text>Historical</Text>
        <Text>100 kg</Text>
        <Text>Last 5 Years +10%</Text>
      </View>
      <Image source={require('./assets/images/graph.png')} style={styles.graph} />
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('FarmAssistance')}>
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20 },
  yieldBox: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  yieldText: { fontSize: 18, color: '#2E7D32' },
  yieldValue: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
  historicalContainer: { marginBottom: 20 },
  graph: { width: '100%', height: 150, marginBottom: 20 },
  button: { backgroundColor: '#2E7D32', padding: 10, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16 },
});

export default YieldPrediction;