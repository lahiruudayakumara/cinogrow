import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import type { NavigationProp } from '@react-navigation/native';

interface PastYieldFormProps {
  navigation: NavigationProp<any>;
}

const PastYieldForm = ({ navigation }: PastYieldFormProps) => {
  const [yields, setYields] = useState([{ year: '', yield: '' }]);

  const handleAddYear = () => {
    setYields([...yields, { year: '', yield: '' }]);
  };

  const handleChange = (index: number, field: 'year' | 'yield', value: string) => {
    const newYields = [...yields];
    newYields[index][field] = value;
    setYields(newYields);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>+ Enter Past Yield Data</Text>
      <Text style={styles.subText}>Enter your past cinnamon yield data to get your yield estimate accuracy.</Text>
      {yields.map((item, index) => (
        <View key={index} style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Year"
            value={item.year}
            onChangeText={(text) => handleChange(index, 'year', text)}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Yield (kg)"
            value={item.yield}
            onChangeText={(text) => handleChange(index, 'yield', text)}
            keyboardType="numeric"
          />
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={handleAddYear}>
        <Text style={styles.addButtonText}>Add another</Text>
      </TouchableOpacity>
      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
          <Text style={styles.navButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('YieldPrediction')}>
          <Text style={styles.navButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  subText: { fontSize: 14, color: '#666', marginBottom: 20 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, width: '48%', borderRadius: 5 },
  addButton: { backgroundColor: '#2E7D32', padding: 10, borderRadius: 5, alignItems: 'center', marginBottom: 20 },
  addButtonText: { color: '#fff', fontSize: 16 },
  navButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  navButton: { padding: 10, backgroundColor: '#2E7D32', borderRadius: 5, alignItems: 'center', flex: 1, marginHorizontal: 5 },
  navButtonText: { color: '#fff', fontSize: 16 },
});

export default PastYieldForm;