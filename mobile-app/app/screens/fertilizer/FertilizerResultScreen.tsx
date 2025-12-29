import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    SafeAreaView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiConfig from '../../../config/api';
import axios from 'axios';
import { deserializeResultParams } from '../../fertilizer/types';

interface RoboflowDetection {
    deficiency: string;
    confidence: number;
    severity: string;
    class: string;
}

interface FertilizerRecommendation {
    growth_stage: {
        stage: string;
        description: string;
        age_years: number;
    };
    primary_fertilizer: {
        name: string;
        npk_ratio: string;
        dosage: string;
        dosage_note: string;
        frequency: string;
        application_method: string;
    };
    application_schedule: {
        immediate_action_required: boolean;
        first_application: string;
        ongoing_schedule: string;
        best_time: string;
        weather_conditions: string;
    };
    organic_alternative: {
        description: string;
        note: string;
    };
    additional_care: {
        watering: string;
        mulching: string;
        monitoring: string;
        soil_testing: string;
    };
    expected_results: {
        improvement_timeline: string;
        full_recovery: string;
        monitoring_points: string[];
    };
    warnings: string[];
    deficiency_info: {
        nutrient: string;
        symptoms: string;
        confidence: number;
    };
}

const FertilizerResultScreen: React.FC = () => {
    const router = useRouter();
    const rawParams = useLocalSearchParams();

    // Memoize deserialized params to prevent infinite loops
    const { leafImage, roboflowAnalysis, plantAge } = useMemo(
        () => deserializeResultParams(rawParams as any),
        [rawParams.leafImage, rawParams.roboflowAnalysis, rawParams.plantAge]
    );

    const insets = useSafeAreaInsets();
    const [detections, setDetections] = useState<RoboflowDetection[]>([]);
    const [recommendations, setRecommendations] = useState<FertilizerRecommendation | null>(null);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const isHistoryView = !leafImage; // If no image, it's from history

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

            // Use recommendations from roboflowAnalysis if available
            if (roboflowAnalysis.recommendations) {
                console.log('✅ Using recommendations from analysis response');
                setRecommendations(roboflowAnalysis.recommendations);
            } else if (plantAge && allDetections.length > 0) {
                // Fallback: fetch recommendations if not included in response
                fetchRecommendations(allDetections[0]);
            }
        }
    }, [roboflowAnalysis, plantAge]);

    const fetchRecommendations = async (detection: RoboflowDetection) => {
        try {
            setLoadingRecommendations(true);
            console.log(`🌱 Fetching recommendations for ${plantAge}-year-old plant`);

            const response = await axios.post(
                `${apiConfig.API_BASE_URL}/fertilizer/roboflow/recommendations`,
                null,
                {
                    params: {
                        deficiency: detection.deficiency,
                        severity: detection.severity,
                        plant_age: plantAge,
                        confidence: detection.confidence
                    }
                }
            );

            if (response.data.success) {
                console.log('✅ Recommendations fetched:', response.data.recommendations);
                setRecommendations(response.data.recommendations);
            }
        } catch (error) {
            console.error('❌ Failed to fetch recommendations:', error);
        } finally {
            setLoadingRecommendations(false);
        }
    };

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
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isHistoryView ? 'Analysis History' : 'Deficiency Detection'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {isHistoryView ? 'Previous analysis details' : 'AI-powered leaf analysis results'}
                    </Text>
                </View>

                {/* Analyzed Image - Only show if image exists */}
                {leafImage && (
                    <View style={styles.imageContainer}>
                        <Text style={styles.sectionTitle}>Analyzed Image</Text>
                        <View style={styles.imageCard}>
                            <Image source={{ uri: leafImage }} style={styles.leafImage} />
                        </View>
                    </View>
                )}

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

                {/* Fertilizer Recommendations Section */}
                {plantAge && (
                    <View style={styles.recommendationsContainer}>
                        <View style={styles.recommendationsHeader}>
                            <Ionicons name="leaf-outline" size={24} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>Fertilizer Recommendations</Text>
                            {plantAge && (
                                <View style={styles.plantAgeBadge}>
                                    <Ionicons name="calendar-outline" size={14} color="#4CAF50" />
                                    <Text style={styles.plantAgeText}>{plantAge} {plantAge === 1 ? 'year' : 'years'}</Text>
                                </View>
                            )}
                        </View>

                        {loadingRecommendations ? (
                            <View style={styles.loadingCard}>
                                <ActivityIndicator size="large" color="#4CAF50" />
                                <Text style={styles.loadingText}>Generating personalized recommendations...</Text>
                            </View>
                        ) : recommendations ? (
                            <>
                                {/* Growth Stage */}
                                <View style={styles.recommendationCard}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="git-branch-outline" size={20} color="#4CAF50" />
                                        <Text style={styles.cardTitle}>Growth Stage</Text>
                                    </View>
                                    <Text style={styles.stageDescription}>{recommendations.growth_stage.description}</Text>
                                </View>

                                {/* Primary Fertilizer */}
                                <View style={styles.recommendationCard}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="flask-outline" size={20} color="#4CAF50" />
                                        <Text style={styles.cardTitle}>Recommended Fertilizer</Text>
                                    </View>
                                    <View style={styles.fertilizerDetails}>
                                        <Text style={styles.fertilizerName}>{recommendations.primary_fertilizer.name}</Text>
                                        <View style={styles.npkBadge}>
                                            <Text style={styles.npkText}>NPK: {recommendations.primary_fertilizer.npk_ratio}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Ionicons name="scale-outline" size={16} color="#6B7280" />
                                            <Text style={styles.detailText}>
                                                <Text style={styles.detailBold}>Dosage: </Text>
                                                {recommendations.primary_fertilizer.dosage}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Ionicons name="time-outline" size={16} color="#6B7280" />
                                            <Text style={styles.detailText}>
                                                <Text style={styles.detailBold}>Frequency: </Text>
                                                {recommendations.primary_fertilizer.frequency}
                                            </Text>
                                        </View>
                                        <View style={styles.applicationMethodBox}>
                                            <Text style={styles.applicationMethodTitle}>Application Method:</Text>
                                            <Text style={styles.applicationMethodText}>
                                                {recommendations.primary_fertilizer.application_method}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Application Schedule */}
                                {recommendations.application_schedule.immediate_action_required && (
                                    <View style={[styles.recommendationCard, styles.urgentCard]}>
                                        <View style={styles.urgentHeader}>
                                            <Ionicons name="alert-circle" size={20} color="#DC2626" />
                                            <Text style={styles.urgentTitle}>Immediate Action Required</Text>
                                        </View>
                                        <Text style={styles.urgentText}>
                                            Apply fertilizer {recommendations.application_schedule.first_application.toLowerCase()}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.recommendationCard}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                                        <Text style={styles.cardTitle}>Application Schedule</Text>
                                    </View>
                                    <View style={styles.scheduleDetails}>
                                        <View style={styles.scheduleItem}>
                                            <Text style={styles.scheduleLabel}>First Application:</Text>
                                            <Text style={styles.scheduleValue}>
                                                {recommendations.application_schedule.first_application}
                                            </Text>
                                        </View>
                                        <View style={styles.scheduleItem}>
                                            <Text style={styles.scheduleLabel}>Best Time:</Text>
                                            <Text style={styles.scheduleValue}>
                                                {recommendations.application_schedule.best_time}
                                            </Text>
                                        </View>
                                        <View style={styles.scheduleItem}>
                                            <Text style={styles.scheduleLabel}>Weather:</Text>
                                            <Text style={styles.scheduleValue}>
                                                {recommendations.application_schedule.weather_conditions}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Organic Alternative */}
                                <View style={styles.recommendationCard}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="leaf" size={20} color="#16A34A" />
                                        <Text style={styles.cardTitle}>Organic Alternative</Text>
                                    </View>
                                    <Text style={styles.organicDescription}>
                                        {recommendations.organic_alternative.description}
                                    </Text>
                                    <Text style={styles.organicNote}>
                                        💡 {recommendations.organic_alternative.note}
                                    </Text>
                                </View>

                                {/* Expected Results */}
                                <View style={styles.recommendationCard}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="trending-up-outline" size={20} color="#4CAF50" />
                                        <Text style={styles.cardTitle}>Expected Results</Text>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <Text style={styles.resultLabel}>Improvement Timeline:</Text>
                                        <Text style={styles.resultValue}>
                                            {recommendations.expected_results.improvement_timeline}
                                        </Text>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <Text style={styles.resultLabel}>Full Recovery:</Text>
                                        <Text style={styles.resultValue}>
                                            {recommendations.expected_results.full_recovery}
                                        </Text>
                                    </View>
                                    <View style={styles.monitoringPoints}>
                                        <Text style={styles.monitoringTitle}>Monitor these points:</Text>
                                        {recommendations.expected_results.monitoring_points.map((point, idx) => (
                                            <View key={idx} style={styles.monitoringPoint}>
                                                <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                                                <Text style={styles.monitoringText}>{point}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Warnings */}
                                <View style={[styles.recommendationCard, styles.warningCard]}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="warning-outline" size={20} color="#D97706" />
                                        <Text style={styles.cardTitle}>Important Warnings</Text>
                                    </View>
                                    {recommendations.warnings.map((warning, idx) => (
                                        <View key={idx} style={styles.warningItem}>
                                            <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                                            <Text style={styles.warningText}>{warning}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Additional Care Tips */}
                                <View style={styles.recommendationCard}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="water-outline" size={20} color="#4CAF50" />
                                        <Text style={styles.cardTitle}>Additional Care</Text>
                                    </View>
                                    <View style={styles.careItem}>
                                        <Ionicons name="water" size={16} color="#3B82F6" />
                                        <Text style={styles.careText}>{recommendations.additional_care.watering}</Text>
                                    </View>
                                    <View style={styles.careItem}>
                                        <Ionicons name="layers" size={16} color="#8B7355" />
                                        <Text style={styles.careText}>{recommendations.additional_care.mulching}</Text>
                                    </View>
                                    <View style={styles.careItem}>
                                        <Ionicons name="eye" size={16} color="#4CAF50" />
                                        <Text style={styles.careText}>{recommendations.additional_care.monitoring}</Text>
                                    </View>
                                </View>
                            </>
                        ) : null}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/fertilizer')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="home" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Back to Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/fertilizer/upload-leaf')}
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
    // Recommendations styles
    recommendationsContainer: {
        marginBottom: 32,
    },
    recommendationsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    plantAgeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        marginLeft: 'auto',
    },
    plantAgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4CAF50',
    },
    loadingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
    },
    recommendationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    urgentCard: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    warningCard: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    stageDescription: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 22,
    },
    fertilizerDetails: {
        gap: 12,
    },
    fertilizerName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: 8,
    },
    npkBadge: {
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    npkText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    detailBold: {
        fontWeight: '600',
        color: '#111827',
    },
    applicationMethodBox: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    applicationMethodTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    applicationMethodText: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 20,
    },
    urgentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    urgentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#DC2626',
    },
    urgentText: {
        fontSize: 14,
        color: '#991B1B',
        lineHeight: 20,
    },
    scheduleDetails: {
        gap: 12,
    },
    scheduleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    scheduleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    scheduleValue: {
        fontSize: 14,
        color: '#6B7280',
        flex: 2,
        textAlign: 'right',
    },
    organicDescription: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 8,
    },
    organicNote: {
        fontSize: 13,
        color: '#059669',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    resultItem: {
        marginBottom: 12,
    },
    resultLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    resultValue: {
        fontSize: 14,
        color: '#111827',
    },
    monitoringPoints: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    monitoringTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    monitoringPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    monitoringText: {
        fontSize: 13,
        color: '#374151',
        flex: 1,
        lineHeight: 20,
    },
    warningItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 12,
    },
    warningText: {
        fontSize: 13,
        color: '#92400E',
        flex: 1,
        lineHeight: 20,
    },
    careItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    careText: {
        fontSize: 13,
        color: '#374151',
        flex: 1,
        lineHeight: 20,
    },
});

export default FertilizerResultScreen;
