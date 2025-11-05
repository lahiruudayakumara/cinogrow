import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OilYieldPredictorSecond() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>OilYieldPredictorScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 18,
    color: '#1c1c1e',
  },
});
