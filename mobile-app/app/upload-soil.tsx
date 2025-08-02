import React from 'react';
import { router } from 'expo-router';
import UploadSoilScreen from '@/screens/Fertilizer/UploadSoilScreen';

export default function UploadSoilRoute() {
    const handleGoBack = () => {
        router.back();
    };

    const handleUploadComplete = (imageUri: string) => {
        // Handle upload completion
        console.log('Upload completed:', imageUri);
        // You can navigate to results screen or back to fertilizer tab
        router.back();
    };

    return (
        <UploadSoilScreen
            onGoBack={handleGoBack}
            onUploadComplete={handleUploadComplete}
        />
    );
}
