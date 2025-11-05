import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

// Import screens
import FarmDetailsScreen from '../screens/Yeild_weather/farm-details';
import PastYieldFormScreen from '../screens/Yeild_weather/past-yield-form';
import YieldPredictionScreen from '../screens/Yeild_weather/yield-prediction';
import FarmAssistanceScreen from '../screens/Yeild_weather/farm-assistance';

// Added oil screens
import OilYieldPredictorScreen from '../screens/Oil_yield/OilYieldPredictor';
import DryingProcessScreen from '../screens/Oil_yield/DryingProcess';
import DistillationProcessScreen from '../screens/Oil_yield/DistillationProcess';
import OilScreen from '../app/(tabs)/oil';

// Define the navigation parameter types
export type RootStackParamList = {
  Home: undefined;
  FarmDetails: undefined;
  PastYieldForm: undefined;
  YieldPrediction: undefined;
  FarmAssistance: undefined;
  OilYieldPredictor: undefined;  
  DryingProcess: undefined;      
  DistillationProcess: undefined; 
};

const Stack = createStackNavigator<RootStackParamList>();

const YieldWeatherNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
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
        name="Home"
        component={OilScreen}
        options={{ title: 'CinoGrow', headerShown: false }}
      />

      {/* Yield & Weather Screens */}
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

      {/* Oil Screens */}
      <Stack.Screen
        name="OilYieldPredictor"
        component={OilYieldPredictorScreen}
        options={{
          title: 'Oil Yield Predictor',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="DryingProcess"
        component={DryingProcessScreen}
        options={{
          title: 'Drying Process Timer',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="DistillationProcess"
        component={DistillationProcessScreen}
        options={{
          title: 'Distillation Process Timer',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <NavigationContainer>
      <YieldWeatherNavigator />
    </NavigationContainer>
  );
};

export default TabNavigator;




