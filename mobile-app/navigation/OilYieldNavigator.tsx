import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import OilYieldPredictorScreen from '../screens/Oil_yield/OilYieldPredictor';
import DryingProcessScreen from '../screens/Oil_yield/DryingProcess';
import DistillationProcessScreen from '../screens/Oil_yield/DistillationProcess';
import OilYieldHomeScreen from '../screens/Oil_yield/OilYieldHome';
import OilYieldPredictorSecond from '@/screens/Oil_yield/OilYieldPredictorSecond';
import OilQualityGuideScreen from '../screens/Oil_yield/OilQualityGuide';
import OilPricePredictorScreen from '../screens/Oil_yield/OilPricePredictor';
import TrainingModulesScreen from '../screens/Oil_yield/TrainingModules';
import LabCertificationScreen from '../screens/Oil_yield/LabCertification';
import AddMaterialBatchScreen from '../screens/Oil_yield/AddMaterialBatch';

// Define navigation parameter types
export type RootStackParamList = {
  OilYieldHome: undefined;
  OilYieldPredictor: undefined;
  OilYieldPredictorSecond: undefined;
  DryingProcess: undefined;
  DistillationProcess: undefined;
  OilQualityGuide: undefined;
  OilPricePredictor: undefined;
  TrainingModules: undefined;
  LabCertification: undefined;
  AddMaterialBatch: undefined;
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
      <Stack.Screen
        name="OilQualityGuide"
        component={OilQualityGuideScreen}
        options={{
          title: 'Oil Quality Guide',
        }}
      />
      <Stack.Screen
        name="OilPricePredictor"
        component={OilPricePredictorScreen}
        options={{
          title: 'Oil Price Predictor',
        }}
      />
      <Stack.Screen
        name="TrainingModules"
        component={TrainingModulesScreen}
        options={{
          title: 'Training Modules',
        }}
      />
      <Stack.Screen
        name="LabCertification"
        component={LabCertificationScreen}
        options={{
          title: 'Lab Certification',
        }}
      />
      <Stack.Screen
        name="AddMaterialBatch"
        component={AddMaterialBatchScreen}
        options={{
          title: 'Add Material Batch',
        }}
      />
    </Stack.Navigator>
  );
};

export default OilYieldNavigator;
