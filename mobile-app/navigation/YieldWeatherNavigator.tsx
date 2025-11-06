import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import YieldWeatherHome from '../screens/Yeild_weather/YieldWeatherHome';
import FarmDetailsScreen from '../screens/Yeild_weather/farm-details';
import PastYieldFormScreen from '../screens/Yeild_weather/past-yield-form';
import YieldPredictionScreen from '../screens/Yeild_weather/yield-prediction';
import FarmAssistanceScreen from '../screens/Yeild_weather/farm-assistance';

// Define the navigation parameter types for the Yield Weather stack
export type YieldWeatherStackParamList = {
  YieldWeatherHome: undefined;
  FarmDetails: undefined;
  PastYieldForm: undefined;
  YieldPrediction: undefined;
  FarmAssistance: undefined;
};

const Stack = createStackNavigator<YieldWeatherStackParamList>();

// This navigator will be used inside the Expo Router
const YieldWeatherNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="YieldWeatherHome"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="YieldWeatherHome" 
        component={YieldWeatherHome}
        options={{ 
          title: 'Farm Weather',
          headerShown: false // Hide header for home screen to keep it clean
        }}
      />
      <Stack.Screen 
        name="FarmDetails" 
        component={FarmDetailsScreen}
        options={{ 
          title: 'Farm Details',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="PastYieldForm" 
        component={PastYieldFormScreen}
        options={{ 
          title: 'Past Yield Data',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="YieldPrediction" 
        component={YieldPredictionScreen}
        options={{ 
          title: 'Yield Prediction',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="FarmAssistance" 
        component={FarmAssistanceScreen}
        options={{ 
          title: 'Farm Assistant',
          headerShown: true 
        }}
      />
    </Stack.Navigator>
  );
};

export default YieldWeatherNavigator;
