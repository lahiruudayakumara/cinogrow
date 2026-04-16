import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import OilPricePredictorScreen from '../app/screens/Oil_yield/OilPricePredictor';
import AddMaterialBatchScreen from '../app/screens/Oil_yield/AddMaterialBatch';

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
        name="OilPricePredictor"
        component={OilPricePredictorScreen}
        options={{
          title: 'Oil Price Predictor',
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
