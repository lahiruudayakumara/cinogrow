import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import locationService from '../services/locationService';

interface LocationDebugState {
  isLoading: boolean;
  result: any;
  diagnostics: any;
  error: string | null;
}

export const LocationDebugComponent: React.FC = () => {
  const [state, setState] = useState<LocationDebugState>({
    isLoading: false,
    result: null,
    diagnostics: null,
    error: null
  });

  const testLocation = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('🔍 Starting location test...');
      
      // Get diagnostics first
      const diagnostics = await locationService.getDiagnostics();
      console.log('📊 Diagnostics:', diagnostics);
      
      // Test location with timeout
      const startTime = Date.now();
      const locationPromise = locationService.getLocationWithFallback();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 15000);
      });

      const result = await Promise.race([locationPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      console.log('✅ Location result:', result, 'Duration:', duration, 'ms');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        result: { ...result, duration },
        diagnostics
      }));
      
    } catch (error) {
      const duration = Date.now() - Date.now();
      console.log('❌ Location test failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        diagnostics: state.diagnostics
      }));
    }
  };

  const testGPSOnly = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('🛰️ Testing GPS only...');
      const startTime = Date.now();
      const result = await locationService.getGPSLocation();
      const duration = Date.now() - startTime;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        result: { ...result, duration, method: 'GPS Only' }
      }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const clearResults = () => {
    setState({
      isLoading: false,
      result: null,
      diagnostics: null,
      error: null
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Location Debug Tool</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={testLocation}
          disabled={state.isLoading}
        >
          <Text style={styles.buttonText}>
            {state.isLoading ? 'Testing...' : 'Test Location (with fallback)'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testGPSOnly}
          disabled={state.isLoading}
        >
          <Text style={styles.buttonText}>Test GPS Only</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {state.diagnostics && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>📊 Diagnostics:</Text>
          <Text style={styles.resultText}>
            Permission: {state.diagnostics.permissionStatus}
          </Text>
          <Text style={styles.resultText}>
            Services Enabled: {state.diagnostics.servicesEnabled ? '✅' : '❌'}
          </Text>
          <Text style={styles.resultText}>
            Has Last Known: {state.diagnostics.hasLastKnown ? '✅' : '❌'}
          </Text>
          <Text style={styles.resultText}>
            Manual Set: {state.diagnostics.manualLocationSet ? '✅' : '❌'}
          </Text>
          {state.diagnostics.error && (
            <Text style={styles.errorText}>Error: {state.diagnostics.error}</Text>
          )}
        </View>
      )}

      {state.result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>
            📍 Location Result {state.result.method ? `(${state.result.method})` : ''}:
          </Text>
          <Text style={styles.resultText}>
            Success: {state.result.success ? '✅' : '❌'}
          </Text>
          {state.result.duration && (
            <Text style={styles.resultText}>
              Duration: {state.result.duration}ms
            </Text>
          )}
          {state.result.coordinates && (
            <>
              <Text style={styles.resultText}>
                Latitude: {state.result.coordinates.latitude}
              </Text>
              <Text style={styles.resultText}>
                Longitude: {state.result.coordinates.longitude}
              </Text>
            </>
          )}
          {state.result.error && (
            <Text style={styles.errorText}>Error: {state.result.error}</Text>
          )}
        </View>
      )}

      {state.error && (
        <View style={styles.resultContainer}>
          <Text style={styles.errorTitle}>❌ Error:</Text>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontFamily: 'monospace',
  },
});