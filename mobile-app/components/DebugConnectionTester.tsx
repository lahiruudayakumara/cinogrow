import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiConfig from '../config/api';
import { fertilizerAPI } from '../services/fertilizerAPI';

interface ConnectionTestResult {
    name: string;
    url: string;
    status: 'success' | 'failed' | 'testing';
    message: string;
    details?: any;
}

export const DebugConnectionTester: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const [testResults, setTestResults] = useState<ConnectionTestResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const runConnectionTests = async () => {
        console.log('🔍 Starting comprehensive connection tests...');

        setIsLoading(true);
        setTestResults([]);

        const tests: ConnectionTestResult[] = [
            {
                name: 'Main Backend Health',
                url: apiConfig.API_BASE_URL.replace('/api/v1', '/health'),
                status: 'testing',
                message: 'Testing main backend health...'
            },
            {
                name: 'Farm API Health',
                url: ${ apiConfig.API_BASE_URL } / farm - assistance / health,
            status: 'testing',
            message: 'Testing farm assistance API...'
            },
        {
            name: 'Weather API Health',
            url: ${ apiConfig.API_BASE_URL }/weather/health,
                status: 'testing',
                    message: 'Testing weather API...'
},
    {
        name: 'Fertilizer ML API Health',
        url: ${ apiConfig.API_BASE_URL }/fertilizer-detection/real / health.replace('/api/v1', '/api/v1'),
            status: 'testing',
                message: 'Testing fertilizer ML API...'
            },
        ];

setTestResults([...tests]);

// Test each endpoint
for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(🧪 Testing: ${ test.name } - ${ test.url });

    try {
        // Create abort controller with timeout for React Native compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(test.url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId); // Clear timeout if request completes

        console.log(📊 ${ test.name } response: ${ response.status } ${ response.ok ? '✅' : '❌' });

        if (response.ok) {
            const data = await response.json();
            console.log(📋 ${ test.name } data:, data);

            tests[i] = {
                ...test,
                status: 'success',
                message: ✅ Connected(${ response.status
            }),
            details: data
        };
    } else {
        const errorText = await response.text();
        console.error(❌ ${ test.name } error: ${ response.status } - ${ errorText });

        tests[i] = {
            ...test,
            status: 'failed',
            message: ❌ Failed(${ response.status
        }: ${ response.statusText }),
        details: { error: errorText }
    };
}
            } catch (error) {
    console.error(❌ ${ test.name } failed:, error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout (10s)';
        } else {
            errorMessage = error.message;
        }
    } else {
        errorMessage = String(error);
    }

    tests[i] = {
        ...test,
        status: 'failed',
        message: ❌ Connection failed: ${ errorMessage },
    details: { error: errorMessage }
};
            }

// Update results after each test
setTestResults([...tests]);
        }

// Test fertilizer API separately using the service
console.log('🔬 Testing fertilizer API using service...');
try {
    const fertilizerTestResult = await fertilizerAPI.testConnection();
    console.log(🔬 Fertilizer API service test: ${ fertilizerTestResult? '✅ Success': '❌ Failed' });

    const fertilizerTest: ConnectionTestResult = {
        name: 'Fertilizer API Service Test',
        url: 'Service method test',
        status: fertilizerTestResult ? 'success' : 'failed',
        message: fertilizerTestResult ? '✅ Service test passed' : '❌ Service test failed',
        details: { serviceMethod: true, result: fertilizerTestResult }
    };

    setTestResults(prev => [...prev, fertilizerTest]);
} catch (error) {
    console.error('❌ Fertilizer API service test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const fertilizerTest: ConnectionTestResult = {
        name: 'Fertilizer API Service Test',
        url: 'Service method test',
        status: 'failed',
        message: ❌ Service test failed: ${ errorMessage },
        details: { serviceMethod: true, error: errorMessage }
};

setTestResults(prev => [...prev, fertilizerTest]);
        }

setIsLoading(false);

const successCount = tests.filter(t => t.status === 'success').length;
const totalTests = tests.length;

console.log(🎯 Connection tests completed: ${ successCount } / ${ totalTests } passed);

if (successCount === totalTests) {
    Alert.alert('✅ All Tests Passed', 'All backend services are accessible! ML analysis should work properly.');
} else {
    Alert.alert('⚠ Some Tests Failed', ${ successCount } / ${ totalTests } services are accessible.Check the results for details.);
}
    };

const getStatusIcon = (status: 'success' | 'failed' | 'testing') => {
    switch (status) {
        case 'success': return 'checkmark-circle';
        case 'failed': return 'close-circle';
        case 'testing': return 'time';
    }
};

const getStatusColor = (status: 'success' | 'failed' | 'testing') => {
    switch (status) {
        case 'success': return '#4CAF50';
        case 'failed': return '#F44336';
        case 'testing': return '#FF9800';
    }
};

return (
    <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>🔍 Connection Debugger</Text>
            {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
            )}
        </View>

        <TouchableOpacity
            style={styles.testButton}
            onPress={runConnectionTests}
            disabled={isLoading}
        >
            <Text style={styles.testButtonText}>
                {isLoading ? 'Testing...' : 'Run Connection Tests'}
            </Text>
            {!isLoading && <Ionicons name="flash" size={20} color="#FFFFFF" />}
        </TouchableOpacity>

        <ScrollView style={styles.resultsContainer}>
            {testResults.map((result, index) => (
                <View key={index} style={styles.resultItem}>
                    <View style={styles.resultHeader}>
                        <Ionicons
                            name={getStatusIcon(result.status)}
                            size={20}
                            color={getStatusColor(result.status)}
                        />
                        <Text style={styles.resultName}>{result.name}</Text>
                    </View>
                    <Text style={styles.resultUrl}>{result.url}</Text>
                    <Text style={[styles.resultMessage, { color: getStatusColor(result.status) }]}>
                        {result.message}
                    </Text>
                    {result.details && (
                        <Text style={styles.resultDetails}>
                            Details: {JSON.stringify(result.details, null, 2).substring(0, 200)}
                            {JSON.stringify(result.details, null, 2).length > 200 ? '...' : ''}
                        </Text>
                    )}
                </View>
            ))}
        </ScrollView>

        <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
                This tool tests all backend API endpoints to help debug connectivity issues.
                Make sure your backend server is running on {apiConfig.API_BASE_URL}
            </Text>
        </View>
    </View>
);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeButton: {
        padding: 8,
    },
    testButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    testButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    resultsContainer: {
        flex: 1,
    },
    resultItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    resultUrl: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    resultMessage: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    resultDetails: {
        fontSize: 11,
        color: '#9CA3AF',
        backgroundColor: '#F3F4F6',
        padding: 8,
        borderRadius: 6,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EBF8FF',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    infoText: {
        fontSize: 12,
        color: '#6B7280',
        flex: 1,
        lineHeight: 16,
    },
});

export default DebugConnectionTester;
