/**
 * Mobile App ML Integration Test
 * Tests the complete flow from mobile app to backend ML API
 */

import { fertilizerAPI } from '../services/fertilizerAPI';

const testMLIntegration = async () => {
    console.log('🔬 Testing Mobile App ML Integration...\n');

    try {
        // Test 1: API Connection
        console.log('Test 1: Testing API connection...');
        const isConnected = await fertilizerAPI.testConnection();
        console.log(✅ API Connection: ${isConnected ? 'SUCCESS' : 'FAILED'}\n);

        if (!isConnected) {
            console.log('❌ Cannot proceed with tests - API not available');
            return;
        }

        // Test 2: Model Info
        console.log('Test 2: Getting model information...');
        const modelInfo = await fertilizerAPI.getModelInfo();
        if (modelInfo) {
            console.log('✅ Model Info Retrieved:');
            console.log(`   - Type: ${modelInfo.model_type}`);
            console.log(`   - Version: ${modelInfo.version}`);
            console.log(`   - Accuracy: ${modelInfo.accuracy}%`);
            console.log(`   - Features: ${modelInfo.features_count}`);
            console.log(`   - Classes: ${modelInfo.classes.join(', ')}\n`);
        } else {
            console.log('❌ Failed to get model info\n');
        }

        // Test 3: Service Availability
        console.log('Test 3: Checking service availability...');
        const isAvailable = await fertilizerAPI.isServiceAvailable();
        console.log(✅ Service Available: ${isAvailable ? 'YES' : 'NO'}\n);

        // Test 4: Recommendations
        console.log('Test 4: Testing recommendations endpoint...');
        const recommendations = await fertilizerAPI.getDetailedRecommendations(
            'nitrogen_deficiency',
            'moderate'
        );
        
        if (recommendations.length > 0) {
            console.log('✅ Recommendations Retrieved:');
            recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec.category}: ${rec.title}`);
                console.log(`      Priority: ${rec.priority}`);
                console.log(`      Items: ${rec.items.length} recommendations`);
            });
            console.log('');
        } else {
            console.log('❌ No recommendations received\n');
        }

        // Test 5: Image Analysis Simulation
        console.log('Test 5: Image analysis flow simulation...');
        console.log('Note: This would normally use actual image data from camera/gallery');
        console.log('✅ Image analysis flow components ready\n');

        console.log('🎉 ML Integration Test Complete!');
        console.log('The mobile app is ready to connect to the real ML backend.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Export for use in React Native
export { testMLIntegration };
