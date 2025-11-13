import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import OilYieldPredictorScreen from '../screens/Oil_yield/OilYieldPredictor';
import DryingProcessScreen from '../screens/Oil_yield/DryingProcess';
import DistillationProcessScreen from '../screens/Oil_yield/DistillationProcess';
import OilYieldHomeScreen from '../screens/Oil_yield/OilYieldHome';
import OilYieldPredictorSecond from '@/screens/Oil_yield/OilYieldPredictorSecond';

// Define navigation parameter types
export type RootStackParamList = {
  OilYieldHome: undefined;
  OilYieldPredictor: undefined;
  OilYieldPredictorSecond: undefined;
  DryingProcess: undefined;
  DistillationProcess: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const OilYieldNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="OilYieldHome"
      screenOptions={{
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
      }}
    >
      <Stack.Screen
        name="OilYieldHome"
        component={OilYieldHomeScreen}
        options={{
          title: 'Oil Yield Home',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OilYieldPredictor"
        component={OilYieldPredictorScreen}
        options={{
          title: 'Oil Yield Predictor HOME',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OilYieldPredictorSecond"
        component={OilYieldPredictorSecond}
        options={{
          title: 'Oil Yield Predictor',
        }}
      />
      <Stack.Screen
        name="DryingProcess"
        component={DryingProcessScreen}
        options={{
          title: 'Drying Process Timer',
        }}
      />
      <Stack.Screen
        name="DistillationProcess"
        component={DistillationProcessScreen}
        options={{
          title: 'Distillation Process Timer',
        }}
      />
    </Stack.Navigator>
  );
};

export default OilYieldNavigator;
