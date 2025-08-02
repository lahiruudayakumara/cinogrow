import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import type { NavigationProp } from '@react-navigation/native';

interface FarmDetailsProps {
  navigation: NavigationProp<any>;
}

const FarmDetails = ({ navigation }: FarmDetailsProps) => {
  const [formData, setFormData] = useState({ location: '', area: '', cinnamonType: '', plantingDate: '' });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>+ Enter Farm Details</Text>
      <TextInput style={styles.input} placeholder="Farm Location" value={formData.location} onChangeText={(text) => setFormData({ ...formData, location: text })} />
      <TextInput style={styles.input} placeholder="Area (Acres/Hectares)" value={formData.area} onChangeText={(text) => setFormData({ ...formData, area: text })} keyboardType="numeric" />
      <Picker style={styles.input} selectedValue={formData.cinnamonType} onValueChange={(itemValue) => setFormData({ ...formData, cinnamonType: itemValue })}>
        <Picker.Item label="Select Cinnamon Type" value="" />
        <Picker.Item label="Ceylon Cinnamon" value="Ceylon" />
        <Picker.Item label="Cassia Cinnamon" value="Cassia" />
      </Picker>
      <TextInput style={styles.input} placeholder="Planting Date" value={formData.plantingDate} onChangeText={(text) => setFormData({ ...formData, plantingDate: text })} />
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('PastYieldForm')}>
        <Text style={styles.buttonText}>Get Yield Estimate</Text>
      </TouchableOpacity>
      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
          <Text style={styles.navButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('PastYieldForm')}>
          <Text style={styles.navButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  button: { backgroundColor: '#2E7D32', padding: 10, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16 },
  navButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  navButton: { padding: 10, backgroundColor: '#2E7D32', borderRadius: 5, alignItems: 'center', flex: 1, marginHorizontal: 5 },
  navButtonText: { color: '#fff', fontSize: 16 },
});

export default FarmDetails;