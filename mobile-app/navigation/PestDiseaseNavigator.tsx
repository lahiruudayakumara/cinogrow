import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import PestDiseaseHomeScreen from '../screens/pest_disesease/index';

const Stack = createStackNavigator();

const PestDiseaseNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="PestDiseaseHome"
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
                name="PestDiseaseHome"
                component={PestDiseaseHomeScreen}
                options={{
                    title: 'Pest & Disease Management',
                    headerShown: false
                }}
            />
        </Stack.Navigator>
    );
};

export default PestDiseaseNavigator;