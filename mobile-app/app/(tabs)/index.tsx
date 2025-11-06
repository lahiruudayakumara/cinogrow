import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import YieldWeatherNavigator from '../../navigation/YieldWeatherNavigator';

const Weather = () => {
  return (
    <View style={{ flex: 1 }}>
      <YieldWeatherNavigator />
    </View>
  );
};

export default Weather;

