import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    SafeAreaView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { FertilizerStackParamList } from '../../navigation/FertilizerNavigator';

type FertilizerResultScreenNavigationProp = StackNavigationProp<
    FertilizerStackParamList,
    'FertilizerResult'
>;

type FertilizerResultScreenRouteProp = RouteProp<FertilizerStackParamList, 'FertilizerResult'>;

interface FertilizerResultScreenProps {
    navigation: FertilizerResultScreenNavigationProp;
    route: FertilizerResultScreenRouteProp;
}

interface RoboflowDetection {
    deficiency: string;
    confidence: number;
    severity: string;
    class: string;
}

const FertilizerResultScreen: React.FC<FertilizerResultScreenProps> = ({
    navigation,
    route,
}) => {
    const { leafImage, roboflowAnalysis } = route.params;
    const insets = useSafeAreaInsets();
    const [detections, setDetections] = useState<RoboflowDetection[]>([]);

    useEffect(() => {
        if (roboflowAnalysis) {
            console.log('🔄 Processing Roboflow output:', roboflowAnalysis);

            // Extract predictions from roboflow_output array
            const roboflowOutput = roboflowAnalysis.roboflow_output || [];
            const allDetections: RoboflowDetection[] = [];

            // Process each workflow output
            roboflowOutput.forEach((output: any) => {
                // Access nested predictions object
                const predictionsData = output.predictions;

                if (predictionsData && predictionsData.predictions) {
                    // Extract predictions array from nested structure
                    const predictions = predictionsData.predictions || [];

                    predictions.forEach((pred: any) => {
                        allDetections.push({
                            deficiency: pred.class || 'Unknown',
                            confidence: pred.confidence || 0,
                            severity: pred.confidence > 0.7 ? 'High' : pred.confidence > 0.4 ? 'Moderate' : 'Low',
                            class: pred.class || 'Unknown'
                        });
                    });
                }
            });

            console.log('📊 Processed detections:', allDetections);
            setDetections(allDetections);
        }
    }, [roboflowAnalysis]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'High': return '#DC2626';
            case 'Moderate': return '#D97706';
            case 'Low': return '#16A34A';
            default: return '#6B7280';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{
                    paddingBottom: Platform.select({
                        ios: 40 + insets.bottom,
                        default: 40 + insets.bottom,
                    }),
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Deficiency Detection</Text>
                    <Text style={styles.headerSubtitle}>
                        AI-powered leaf analysis results
                    </Text>
                </View>

                {/* Analyzed Image */}
                <View style={styles.imageContainer}>
                    <Text style={styles.sectionTitle}>Analyzed Image</Text>
                    <View style={styles.imageCard}>
                        <Image source={{ uri: leafImage }} style={styles.leafImage} />
                    </View>
                </View>

                {/* Detections Section */}
                <View style={styles.detectionsContainer}>
                    <View style={styles.detectionsHeader}>
                        <Ionicons name="scan" size={24} color="#4CAF50" />
                        <Text style={styles.sectionTitle}>Detected Deficiencies</Text>
                    </View>

                    {detections.length === 0 ? (
                        <View style={styles.noDetectionsCard}>
                            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                            <Text style={styles.noDetectionsTitle}>No Deficiencies Detected</Text>
                            <Text style={styles.noDetectionsText}>
                                Your plant appears healthy. Continue regular care and monitoring.
                            </Text>
                        </View>
                    ) : (
                        detections.map((detection, index) => (
                            <View key={index} style={styles.detectionCard}>
                                <View style={styles.detectionHeader}>
                                    <View style={styles.detectionIconContainer}>
                                        <Ionicons name="leaf" size={24} color="#4CAF50" />
                                    </View>
                                    <View style={styles.detectionInfo}>
                                        <Text style={styles.detectionTitle}>{detection.deficiency}</Text>
                                        <View style={styles.detectionMeta}>
                                            <View style={[styles.severityBadge, {
                                                backgroundColor: getSeverityColor(detection.severity)
                                            }]}>
                                                <Text style={styles.severityText}>{detection.severity}</Text>
                                            </View>
                                            <View style={styles.confidenceBadge}>
                                                <Ionicons name="analytics" size={12} color="#6B7280" />
                                                <Text style={styles.confidenceText}>
                                                    {(detection.confidence * 100).toFixed(1)}%
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.detectionDetails}>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Class:</Text>
                                        <Text style={styles.detailValue}>{detection.class}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Confidence:</Text>
                                        <Text style={styles.detailValue}>
                                            {(detection.confidence * 100).toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>

                                {/* Confidence Progress Bar */}
                                <View style={styles.progressBarContainer}>
                                    <View style={styles.progressBarBackground}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${detection.confidence * 100}%`,
                                                    backgroundColor: getSeverityColor(detection.severity)
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('FertilizerHome')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="home" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Back to Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('FertilizerUploadLeaf')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera" size={20} color="#4CAF50" />
                        <Text style={styles.secondaryButtonText}>Analyze Another</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        marginTop: 20,
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 22,
    },
    imageContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    imageCard: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    leafImage: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    detectionsContainer: {
        marginBottom: 32,
    },
    detectionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    noDetectionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    noDetectionsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#4CAF50',
        marginTop: 16,
        marginBottom: 8,
    },
    noDetectionsText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    detectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    detectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    detectionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E7F5E7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    detectionInfo: {
        flex: 1,
    },
    detectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    detectionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    severityText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    confidenceText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    detectionDetails: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    progressBarContainer: {
        marginTop: 12,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 2,
        borderColor: '#4CAF50',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4CAF50',
    },
});

export default FertilizerResultScreen;
