import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import apiConfig from '../config/api';

export const ConnectionTestComponent: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setConnectionStatus('Testing...');
    setLogs([]);
    
    addLog(`Using API Base URL: ${apiConfig.API_BASE_URL}`);
    
    // Test main health endpoint
    try {
      const healthUrl = apiConfig.API_BASE_URL.replace('/api/v1', '/health');
      addLog(`Testing main health endpoint: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Main health check successful: ${data.message}`);
        setConnectionStatus('✅ Connected');
      } else {
        addLog(`❌ Main health check failed: ${response.status}`);
        setConnectionStatus('❌ Connection Failed');
      }
    } catch (error) {
      addLog(`❌ Main health error: ${error}`);
      
      // Try fallback URLs
      const fallbackUrls = apiConfig.FALLBACK_URLS || [];
      
      for (let i = 0; i < fallbackUrls.length; i++) {
        const url = fallbackUrls[i];
        const healthUrl = url.replace('/api/v1', '/health');
        
        try {
          addLog(`Trying fallback ${i + 1}: ${healthUrl}`);
          const response = await fetch(healthUrl);
          
          if (response.ok) {
            const data = await response.json();
            addLog(`✅ Fallback ${i + 1} successful: ${data.message}`);
            setConnectionStatus(`✅ Connected via fallback ${i + 1}`);
            return;
          }
        } catch (fallbackError) {
          addLog(`❌ Fallback ${i + 1} failed: ${fallbackError}`);
        }
      }
      
      setConnectionStatus('❌ All connections failed');
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      <Text style={styles.status}>{connectionStatus}</Text>
      
      <Button title="Test Connection" onPress={testConnection} />
      
      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  logContainer: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  logText: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default ConnectionTestComponent;