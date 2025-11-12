// Debug utility for testing API connectivity
import { weatherAPI } from './yield_weather/weatherAPI';

export class APIDebugger {
  static async testConnectivity() {
    console.log('🔍 Starting API connectivity test...');
    
    try {
      // Test 1: Health check
      console.log('\n1️⃣ Testing weather service health...');
      const healthResult = await weatherAPI.checkHealth();
      console.log('Health check result:', healthResult);
      
      if (healthResult.status === 'healthy') {
        console.log('✅ Health check passed');
      } else {
        console.log('❌ Health check failed');
        return false;
      }

      // Test 2: Get weather by coordinates (Colombo, Sri Lanka)
      console.log('\n2️⃣ Testing weather by coordinates...');
      const weatherResult = await weatherAPI.getCurrentWeather({
        latitude: 6.9271,
        longitude: 79.8612
      });
      
      if (weatherResult.success) {
        console.log('✅ Weather fetch successful');
        console.log(`📍 Location: ${weatherResult.location}`);
        console.log(`🌡️  Temperature: ${weatherResult.data?.temperature}°C`);
        console.log(`💧 Humidity: ${weatherResult.data?.humidity}%`);
      } else {
        console.log('❌ Weather fetch failed:', weatherResult.message);
        return false;
      }

      console.log('\n🎉 All API tests passed! Your connection is working.');
      return true;
      
    } catch (error) {
      console.error('❌ API test failed with error:', error);
      return false;
    }
  }

  static async quickTest() {
    console.log('⚡ Quick API test...');
    try {
      const result = await weatherAPI.checkHealth();
      if (result.status === 'healthy') {
        console.log('✅ API is reachable');
        return true;
      } else {
        console.log('❌ API health check failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Quick test failed:', error);
      return false;
    }
  }
}

export default APIDebugger;
