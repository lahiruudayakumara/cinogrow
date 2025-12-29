import React from 'react';
import { Stack } from 'expo-router';

export default function FertilizerLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#4CAF50',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '600',
                    fontSize: 18,
                },
                headerShown: true,
                headerBackTitle: 'Back',
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Fertilizer Recommendations',
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="upload-leaf"
                options={{
                    title: 'Upload Leaf Sample',
                    headerBackVisible: true,
                }}
            />
            <Stack.Screen
                name="upload-soil"
                options={{
                    title: 'Upload Soil Sample',
                    headerBackVisible: true,
                }}
            />
            <Stack.Screen
                name="photo-preview"
                options={{
                    title: 'Photo Preview',
                    headerBackVisible: true,
                }}
            />
            <Stack.Screen
                name="result"
                options={{
                    title: 'Analysis Results',
                    headerBackVisible: true,
                }}
            />
        </Stack>
    );
}
