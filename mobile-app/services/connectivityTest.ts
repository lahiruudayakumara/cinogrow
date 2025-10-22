import { Platform } from 'react-native';

// Simple connectivity test function
export async function testAPIConnectivity() {
  const testUrls = [
    'http://192.168.53.65:8001/health',                  // Your actual Wi-Fi IP - main health endpoint
    'http://10.0.2.2:8001/health',                       // Android emulator - main health endpoint
    'http://127.0.0.1:8001/health',                      // Localhost - main health endpoint
    'http://localhost:8001/health',                      // Alternative localhost - main health endpoint
    'http://192.168.53.65:8001/api/v1/farms',            // Test farms endpoint
    'http://10.0.2.2:8001/api/v1/farms'                  // Test farms endpoint - Android
  ];

  console.log('🔍 Starting connectivity test...');
  console.log(`📱 Platform: ${Platform.OS}`);
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    try {
      console.log(`\n🌐 Testing URL ${i + 1}/${testUrls.length}: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`📡 Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! API is reachable');
        console.log(`📊 Response:`, data);
        return { success: true, url, data };
      } else {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Network Error:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  console.log('\n💥 All URLs failed. Check backend server and network settings.');
  return { success: false };
}

// Quick single URL test
export async function quickConnectivityTest(url: string) {
  try {
    console.log(`⚡ Quick test: ${url}`);
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}
