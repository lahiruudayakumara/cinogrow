import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import types
import { FertilizerAnalysisResponse } from '../services/fertilizerAPI';
import { LeafAnalysisMetadata } from '../services/imageAnalysisService';

// Import screens
import FertilizerHomeScreen from '../screens/Fertilizer/FertilizerHomeScreen';
import UploadLeafScreen from '../screens/Fertilizer/UploadLeafScreen';
import UploadSoilScreen from '../screens/Fertilizer/UploadSoilScreen';
import PhotoPreview from '../screens/Fertilizer/PhotoPreview';
import FertilizerResultScreen from '../screens/Fertilizer/FertilizerResultScreen';

// Define the navigation parameter types for the Fertilizer stack
export type FertilizerStackParamList = {
    FertilizerHome: { leafImage?: string; soilImage?: string };
    FertilizerUploadLeaf: undefined;
    FertilizerUploadSoil: { fromLeaf?: boolean; leafImage?: string };
    FertilizerPhotoPreview: {
        imageUri: string;
        imageType: 'leaf' | 'soil';
        leafImage?: string;
        soilImage?: string;
        leafMetadata?: LeafAnalysisMetadata;
    };
    FertilizerResult: {
        leafImage?: string;
        soilImage?: string;
        analysisType?: 'leaf-only' | 'comprehensive';
        mlAnalysis?: FertilizerAnalysisResponse; // Add ML analysis data
        roboflowAnalysis?: any; // Add Roboflow workflow output
        plantAge?: number; // Plant age in years for recommendations
    };
};

const Stack = createStackNavigator<FertilizerStackParamList>();

// This navigator will be used inside the Expo Router
const FertilizerNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="FertilizerHome"
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
                name="FertilizerHome"
                component={FertilizerHomeScreen}
                options={{
                    title: 'Fertilizer Recommendations',
                    headerShown: false // Hide header for home screen to keep it clean
                }}
            />
            <Stack.Screen
                name="FertilizerUploadLeaf"
                component={UploadLeafScreen}
                options={{
                    title: 'Upload Leaf Sample',
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="FertilizerUploadSoil"
                component={UploadSoilScreen}
                options={{
                    title: 'Upload Soil Sample',
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="FertilizerPhotoPreview"
                component={PhotoPreview}
                options={{
                    title: 'Photo Preview',
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="FertilizerResult"
                component={FertilizerResultScreen}
                options={({ navigation }) => ({
                    title: 'Analysis Results',
                    headerShown: true,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('FertilizerHome', {})}
                            style={{ marginLeft: 10, padding: 5 }}
                        >
                            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    ),
                })}
            />
        </Stack.Navigator>
    );
};

export default FertilizerNavigator;