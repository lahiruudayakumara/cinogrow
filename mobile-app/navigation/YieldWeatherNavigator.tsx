import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import YieldWeatherHome from '../app/screens/yield-weather/YieldWeatherHome';
import MyFarmScreen from '../app/screens/yield-weather/MyFarm';
import MyPlantingRecordsScreen from '../app/screens/yield-weather/MyPlantingRecords';
import FarmAssistanceScreen from '../app/screens/yield-weather/FarmAssistance';
import YieldPredictorScreen from '../app/screens/yield-weather/YieldPredictor';
import MyYieldScreen from '../app/screens/yield-weather/MyYield';

// Define the navigation parameter types for the Yield Weather stack
export type YieldWeatherStackParamList = {
  YieldWeatherHome: undefined;
  MyFarm: undefined;
  MyPlantingRecords: undefined;
  FarmAssistance: undefined;
  YieldPredictor: undefined;
  MyYield: undefined;
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
        name="MyFarm" 
        component={MyFarmScreen}
        options={{ 
          title: 'My Farm',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="MyPlantingRecords" 
        component={MyPlantingRecordsScreen}
        options={{ 
          title: 'My Planting Records',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="FarmAssistance" 
        component={FarmAssistanceScreen}
        options={{ 
          title: 'Farm Assistance',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="YieldPredictor" 
        component={YieldPredictorScreen}
        options={{ 
          title: 'Yield Predictor',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="MyYield" 
        component={MyYieldScreen}
        options={{ 
          title: 'My Yield Records',
          headerShown: true 
        }}
      />
    </Stack.Navigator>
  );
};

export default YieldWeatherNavigator;
