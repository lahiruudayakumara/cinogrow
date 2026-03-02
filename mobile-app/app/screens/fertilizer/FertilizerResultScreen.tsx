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
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const rawParams = useLocalSearchParams();

    // Memoize deserialized params to prevent infinite loops
    const { leafImage, soilImage, roboflowAnalysis, soilAnalysis, combinedAnalysis, analysisType, plantAge } = useMemo(
        () => deserializeResultParams(rawParams as any),
        [rawParams.leafImage, rawParams.soilImage, rawParams.roboflowAnalysis, rawParams.soilAnalysis, rawParams.combinedAnalysis, rawParams.analysisType, rawParams.plantAge]
    );

    const insets = useSafeAreaInsets();
    const [detections, setDetections] = useState<RoboflowDetection[]>([]);
    const [recommendations, setRecommendations] = useState<FertilizerRecommendation | null>(null);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const [combinedSoilAnalysis, setCombinedSoilAnalysis] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'details'>('overview');
    const isHistoryView = !leafImage && !soilImage; // If no images, it's from history

    // Handle combined analysis - extract both leaf and soil data
    useEffect(() => {
        if (combinedAnalysis) {
            console.log('🔬 Processing combined analysis:', combinedAnalysis);

            // Extract leaf analysis data
            const leafData = combinedAnalysis.leaf_analysis;
            if (leafData) {
                const leafDetection: RoboflowDetection = {
                    deficiency: leafData.detected_deficiency || 'Unknown',
                    confidence: leafData.confidence || 0,
                    severity: leafData.severity || 'Low',
                    class: leafData.detected_deficiency || 'Unknown'
                };

                console.log('🍃 Extracted leaf detection:', leafDetection);
                setDetections([leafDetection]);

                // Set recommendations if available
                if (leafData.recommendations) {
                    console.log('✅ Using leaf recommendations from combined analysis');
                    setRecommendations(leafData.recommendations as unknown as FertilizerRecommendation);
                }
            }

            // Extract soil analysis data
            const soilData = combinedAnalysis.soil_analysis;
            if (soilData) {
                console.log('🌍 Extracted soil analysis:', soilData);
                // Transform the combined analysis soil data to match the expected format
                setCombinedSoilAnalysis({
                    soil_detected: soilData.soil_type && soilData.soil_type !== 'Not detected',
                    soil_type: soilData.soil_type,
                    confidence: soilData.confidence,
                    soil_characteristics: {
                        key_properties: soilData.characteristics || []
                    },
                    soil_improvement_actions: soilData.improvement_actions || [],
                    recommendations: soilData.recommendations || {}
                });
            }
        }
    }, [combinedAnalysis]);

    useEffect(() => {
        // Skip processing roboflowAnalysis if we have combinedAnalysis
        if (combinedAnalysis) {
            return;
        }

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
                        // Filter out healthy leaves - only include actual deficiencies
                        const className = (pred.class || 'Unknown').toLowerCase();
                        const isHealthy = className.includes('healthy') || className === 'healthy';

                        if (!isHealthy) {
                            allDetections.push({
                                deficiency: pred.class || 'Unknown',
                                confidence: pred.confidence || 0,
                                severity: pred.confidence > 0.7 ? 'High' : pred.confidence > 0.4 ? 'Moderate' : 'Low',
                                class: pred.class || 'Unknown'
                            });
                        } else {
                            console.log('✅ Healthy leaf detected - skipping fertilizer recommendation');
                        }
                    });
                }
            });

            console.log('📊 Processed deficiency detections (healthy filtered):', allDetections);
            setDetections(allDetections);

            // Only fetch recommendations if there are actual deficiencies
            if (allDetections.length > 0) {
                // Use recommendations from roboflowAnalysis if available
                if (roboflowAnalysis.recommendations) {
                    console.log('✅ Using recommendations from analysis response');
                    setRecommendations(roboflowAnalysis.recommendations);
                } else if (plantAge) {
                    // Fallback: fetch recommendations if not included in response
                    fetchRecommendations(allDetections[0]);
                }
            } else {
                console.log('🌱 No deficiencies detected - leaf is healthy!');
                setRecommendations(null);
            }
        }
    }, [roboflowAnalysis, plantAge, combinedAnalysis]);

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

    // Generate intelligent comprehensive recommendations based on deficiency + age + soil type
    const generateComprehensiveRecommendations = () => {
        if (!detections.length || !plantAge || !combinedSoilAnalysis?.soil_type) {
            return recommendations; // Fallback to existing recommendations
        }

        const deficiency = detections[0].deficiency.toLowerCase();
        const soilType = combinedSoilAnalysis.soil_type.toLowerCase();
        const age = plantAge;

        // Smart NPK ratio based on deficiency and soil type
        let npkRatio = '10:10:10';
        let fertilizerName = 'Balanced NPK Fertilizer';
        let dosage = '50-75g per plant';
        let additionalNotes = '';

        // Deficiency-specific adjustments
        if (deficiency.includes('nitrogen') || deficiency.includes('n')) {
            npkRatio = '20:10:10';
            fertilizerName = 'Nitrogen-Rich Fertilizer';
            additionalNotes = 'High nitrogen is essential for leaf growth and green color restoration.';
        } else if (deficiency.includes('phosphorus') || deficiency.includes('p')) {
            npkRatio = '10:20:10';
            fertilizerName = 'Phosphorus-Rich Fertilizer';
            additionalNotes = 'Phosphorus promotes root development and energy transfer.';
        } else if (deficiency.includes('potassium') || deficiency.includes('k')) {
            npkRatio = '10:10:20';
            fertilizerName = 'Potassium-Rich Fertilizer';
            additionalNotes = 'Potassium enhances disease resistance and overall plant health.';
        } else if (deficiency.includes('iron') || deficiency.includes('fe')) {
            fertilizerName = 'Iron Chelate Supplement';
            npkRatio = '0:0:0 + Fe';
            additionalNotes = 'Iron deficiency causes yellowing of young leaves (chlorosis).';
        } else if (deficiency.includes('magnesium') || deficiency.includes('mg')) {
            fertilizerName = 'Magnesium Sulfate (Epsom Salt)';
            npkRatio = '0:0:0 + Mg';
            dosage = '1-2 tablespoons per gallon of water';
            additionalNotes = 'Magnesium is crucial for chlorophyll production.';
        }

        // Soil-type specific adjustments
        if (soilType.includes('clay')) {
            dosage = '40-60g per plant';
            additionalNotes += ' Clay soil retains nutrients well but may have drainage issues. Apply in smaller doses more frequently.';
        } else if (soilType.includes('sand')) {
            dosage = '75-100g per plant';
            additionalNotes += ' Sandy soil drains quickly and loses nutrients faster. Apply slightly higher doses with increased frequency.';
        } else if (soilType.includes('loam')) {
            dosage = '50-75g per plant';
            additionalNotes += ' Loamy soil has good nutrient retention and drainage. Standard application rates work well.';
        } else if (soilType.includes('silt')) {
            dosage = '60-80g per plant';
            additionalNotes += ' Silty soil has medium drainage. Monitor moisture levels carefully.';
        }

        // Age-based adjustments
        let frequency = 'Every 4-6 weeks';
        let applicationMethod = 'Apply around the drip line, avoiding direct contact with the trunk.';
        
        if (age <= 2) {
            dosage = dosage.replace(/\\d+-\\d+/g, (match) => {
                const [min, max] = match.split('-').map(Number);
                return `${Math.floor(min * 0.5)}-${Math.floor(max * 0.6)}`;
            });
            frequency = 'Every 6-8 weeks';
            applicationMethod = 'Apply in a circle 15-20cm from the trunk. Young plants need gentle feeding.';
        } else if (age <= 5) {
            frequency = 'Every 4-6 weeks';
            applicationMethod = 'Apply in a circle around the plant canopy edge (drip line).';
        } else {
            frequency = 'Every 3-4 weeks during growing season';
            applicationMethod = 'Broadcast evenly around the drip line extending 30-50cm outward. Mature trees benefit from broader application.';
        }

        // Create comprehensive recommendation
        return {
            ...recommendations,
            primary_fertilizer: {
                name: fertilizerName,
                npk_ratio: npkRatio,
                dosage: dosage,
                dosage_note: additionalNotes,
                frequency: frequency,
                application_method: applicationMethod
            },
            growth_stage: {
                stage: age <= 2 ? 'Young Plant (Establishment)' : age <= 5 ? 'Growing Plant (Development)' : 'Mature Plant (Production)',
                description: age <= 2 
                    ? 'Focus on establishing healthy root system and vegetative growth.' 
                    : age <= 5 
                    ? 'Active growth phase - building strong structure and leaf canopy.'
                    : 'Mature plant - focus on maintaining health and productivity.',
                age_years: age
            },
            additional_care: {
                watering: soilType.includes('sand') 
                    ? 'Water deeply 2-3 times per week. Sandy soil drains quickly.'
                    : soilType.includes('clay')
                    ? 'Water deeply once per week. Clay retains moisture longer.'
                    : 'Water deeply 1-2 times per week. Maintain consistent moisture.',
                mulching: `Apply 5-7cm organic mulch around the base. This is especially important for ${soilType} soil to regulate moisture and temperature.`,
                monitoring: `Check leaves weekly for improvement. Expected changes: ${deficiency.includes('nitrogen') ? 'greening of leaves' : deficiency.includes('iron') ? 'new leaves turning darker green' : 'overall health improvement'} within 2-3 weeks.`,
                soil_testing: `Given your ${soilType} soil type, consider soil pH testing. ${soilType.includes('clay') ? 'Clay soils may have pH issues.' : soilType.includes('sand') ? 'Sandy soils may be acidic.' : 'Regular testing ensures optimal nutrient availability.'}`
            }
        } as FertilizerRecommendation;
    };

    // Use comprehensive recommendations when available
    const displayRecommendations = useMemo(() => {
        if (analysisType === 'comprehensive' && detections.length > 0 && combinedSoilAnalysis?.soil_type) {
            return generateComprehensiveRecommendations();
        }
        return recommendations;
    }, [recommendations, analysisType, detections, combinedSoilAnalysis, plantAge]);

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
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {isHistoryView 
                                ? t('fertilizer.result.header.title_history') 
                                : analysisType === 'soil-only' 
                                    ? 'Soil Type Detection'
                                    : analysisType === 'comprehensive'
                                        ? 'Comprehensive Analysis'
                                        : 'Leaf Deficiency Detection'
                            }
                        </Text>
                    </View>
                    <Text style={styles.headerSubtitle}>
                        {isHistoryView 
                            ? t('fertilizer.result.header.subtitle_history') 
                            : analysisType === 'soil-only'
                                ? 'AI-powered soil type analysis results'
                                : analysisType === 'comprehensive'
                                    ? 'Complete leaf and soil analysis results'
                                    : 'AI-powered leaf analysis results'
                        }
                    </Text>
                </View>

                {/* Comprehensive Analysis - Detections with embedded images */}
                {analysisType === 'comprehensive' && (
                    <View style={styles.comprehensiveDetectionsContainer}>
                        <View style={styles.stackedDetections}>
                            {/* Leaf Deficiency Detection */}
                            <View style={styles.detectionSection}>
                                <View style={styles.columnHeader}>
                                    <Ionicons name="leaf" size={20} color="#4CAF50" />
                                    <Text style={styles.columnTitle}>Leaf Deficiency</Text>
                                </View>

                                {detections.length === 0 ? (
                                    <View style={styles.noDetectionsCard}>
                                        <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
                                        <Text style={styles.noDetectionsTitle}>Healthy</Text>
                                        <Text style={styles.noDetectionsText}>No deficiencies detected</Text>
                                    </View>
                                ) : (
                                    detections.map((detection, index) => (
                                        <View key={index} style={styles.compactDetectionCard}>
                                            <View style={styles.cardWithImageRow}>
                                                <View style={styles.cardContentLeft}>
                                                    <View style={styles.detectionHeader}>
                                                        <View style={styles.detectionIconContainer}>
                                                            <Ionicons name="leaf" size={20} color="#4CAF50" />
                                                        </View>
                                                        <View style={styles.detectionInfo}>
                                                            <Text style={styles.detectionTitle}>{detection.deficiency}</Text>
                                                            <View style={styles.detectionMeta}>
                                                                <View style={[styles.severityBadge, {
                                                                    backgroundColor: getSeverityColor(detection.severity)
                                                                }]}>
                                                                    <Text style={styles.severityText}>{t(`fertilizer.result.detections.severity_${detection.severity.toLowerCase()}`)}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <View style={styles.detectionDetails}>
                                                        <View style={styles.detailItem}>
                                                            <Text style={styles.detailLabel}>{t('fertilizer.result.detections.confidence')}:</Text>
                                                            <Text style={styles.detailValue}>
                                                                {(detection.confidence > 1 ? detection.confidence : detection.confidence * 100).toFixed(1)}%
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
                                                                        width: `${detection.confidence > 1 ? detection.confidence : detection.confidence * 100}%`,
                                                                        backgroundColor: getSeverityColor(detection.severity)
                                                                    }
                                                                ]}
                                                            />
                                                        </View>
                                                    </View>
                                                </View>
                                                {leafImage && (
                                                    <View style={styles.cardImageRight}>
                                                        <Image source={{ uri: leafImage }} style={styles.cardThumbnailImage} />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>

                            {/* Soil Type Detection */}
                            <View style={styles.detectionSection}>
                                <View style={styles.columnHeader}>
                                    <Ionicons name="earth" size={20} color="#8B7355" />
                                    <Text style={styles.columnTitle}>Soil Type</Text>
                                </View>

                                {(combinedSoilAnalysis || soilAnalysis) && ((combinedSoilAnalysis || soilAnalysis).soil_detected !== false) ? (
                                    <View style={styles.compactDetectionCard}>
                                        <View style={styles.cardWithImageRow}>
                                            <View style={styles.cardContentLeft}>
                                                <View style={styles.detectionHeader}>
                                                    <View style={[styles.detectionIconContainer, { backgroundColor: '#FEF7ED' }]}>
                                                        <Ionicons name="earth" size={20} color="#8B7355" />
                                                    </View>
                                                    <View style={styles.detectionInfo}>
                                                        <Text style={styles.detectionTitle}>
                                                            {(combinedSoilAnalysis || soilAnalysis).soil_type || 'Unknown'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.detectionDetails}>
                                                    <View style={styles.detailItem}>
                                                        <Text style={styles.detailLabel}>Confidence:</Text>
                                                        <Text style={styles.detailValue}>
                                                            {((combinedSoilAnalysis || soilAnalysis).confidence?.toFixed(1) || '0')}%
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
                                                                    width: `${(combinedSoilAnalysis || soilAnalysis).confidence || 0}%`,
                                                                    backgroundColor: '#8B7355'
                                                                }
                                                            ]}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            {soilImage && (
                                                <View style={styles.cardImageRight}>
                                                    <Image source={{ uri: soilImage }} style={styles.cardThumbnailImage} />
                                                </View>
                                            )}
                                        </View>

                                        {/* Soil Characteristics */}
                                        {(combinedSoilAnalysis || soilAnalysis)?.soil_characteristics?.key_properties && (
                                            <View style={styles.characteristicsSection}>
                                                <Text style={styles.characteristicsTitle}>Key Properties</Text>
                                                {(combinedSoilAnalysis || soilAnalysis)?.soil_characteristics?.key_properties?.map((prop: string, idx: number) => (
                                                    <View key={idx} style={styles.compactCareItem}>
                                                        <Ionicons name="checkmark-circle" size={14} color="#8B7355" />
                                                        <Text style={styles.compactCareText}>{prop}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {/* Lab Test Recommendation */}
                                        <View style={[styles.characteristicsSection, { backgroundColor: '#FEF7ED', borderRadius: 8, padding: 12, marginTop: 12, borderTopWidth: 0 }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                <Ionicons name="flask" size={16} color="#8B7355" />
                                                <Text style={[styles.characteristicsTitle, { marginBottom: 0, color: '#8B7355' }]}>Lab Test Recommended</Text>
                                            </View>
                                            <Text style={[styles.compactCareText, { color: '#6B7280' }]}>
                                                For accurate nutrient analysis and pH levels, conduct a professional soil lab test.
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.noDetectionsCard}>
                                        <Ionicons name="alert-circle" size={40} color="#D97706" />
                                        <Text style={styles.noDetectionsTitle}>Not Detected</Text>
                                        <Text style={styles.noDetectionsText}>Unable to detect soil type</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Soil Analysis Section - Only for non-comprehensive */}
                {analysisType !== 'comprehensive' && (soilAnalysis || combinedSoilAnalysis) && (
                    <View style={styles.soilAnalysisContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="earth" size={24} color="#8B7355" />
                            <Text style={styles.sectionTitle}>Soil Type Detection</Text>
                        </View>

                        {(combinedSoilAnalysis || soilAnalysis) && ((combinedSoilAnalysis || soilAnalysis).soil_detected !== false) ? (
                            <>
                                <View style={styles.detectionCard}>
                                    <View style={styles.cardWithImageRow}>
                                        <View style={styles.cardContentLeft}>
                                            <View style={styles.detectionHeader}>
                                                <View style={[styles.detectionIconContainer, { backgroundColor: '#FEF7ED' }]}>
                                                    <Ionicons name="earth" size={24} color="#8B7355" />
                                                </View>
                                                <View style={styles.detectionInfo}>
                                                    <Text style={styles.detectionTitle}>
                                                        {(combinedSoilAnalysis || soilAnalysis).soil_type || 'Unknown Soil Type'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.detectionDetails}>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Soil Type:</Text>
                                                    <Text style={styles.detailValue}>{(combinedSoilAnalysis || soilAnalysis).soil_type || 'Unknown'}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Confidence:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {((combinedSoilAnalysis || soilAnalysis).confidence?.toFixed(2) || '0')}%
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
                                                                width: `${(combinedSoilAnalysis || soilAnalysis).confidence || 0}%`,
                                                                backgroundColor: '#8B7355'
                                                            }
                                                        ]}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                        {soilImage && (
                                            <View style={styles.cardImageRight}>
                                                <Image source={{ uri: soilImage }} style={styles.cardThumbnailImage} />
                                            </View>
                                        )}
                                    </View>

                                    {/* Soil Characteristics */}
                                    {(combinedSoilAnalysis || soilAnalysis)?.soil_characteristics && (
                                        <View style={styles.recommendationSection}>
                                            <Text style={styles.recommendationSectionTitle}>Soil Characteristics</Text>
                                            {(combinedSoilAnalysis || soilAnalysis)?.soil_characteristics?.key_properties?.map((prop: string, idx: number) => (
                                                <View key={idx} style={styles.careItem}>
                                                    <Ionicons name="checkmark-circle" size={16} color="#8B7355" />
                                                    <Text style={styles.careText}>{prop}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Improvement Recommendations */}
                                    {(combinedSoilAnalysis || soilAnalysis)?.soil_improvement_actions && (combinedSoilAnalysis || soilAnalysis)?.soil_improvement_actions?.length > 0 && (
                                        <View style={styles.recommendationSection}>
                                            <Text style={styles.recommendationSectionTitle}>Soil Type Recommendations</Text>
                                            {(combinedSoilAnalysis || soilAnalysis)?.soil_improvement_actions?.map((action: string, idx: number) => (
                                                <View key={idx} style={styles.careItem}>
                                                    <Ionicons name="leaf" size={16} color="#4CAF50" />
                                                    <Text style={styles.careText}>{action}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Lab Test Note */}
                                    <View style={[styles.recommendationSection, { backgroundColor: '#FEF7ED', borderRadius: 12, padding: 16, marginTop: 12 }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <Ionicons name="flask" size={18} color="#8B7355" />
                                            <Text style={[styles.recommendationSectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Important Note</Text>
                                        </View>
                                        <Text style={[styles.careText, { color: '#6B7280' }]}>
                                            For accurate soil analysis and tailored recommendations, we highly recommend conducting a professional soil laboratory test. This will provide detailed insights into nutrient levels, pH balance, and specific amendments needed for optimal plant growth.
                                        </Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.noDetectionsCard}>
                                <Ionicons name="alert-circle" size={48} color="#D97706" />
                                <Text style={styles.noDetectionsTitle}>Soil Type Not Detected</Text>
                                <Text style={styles.noDetectionsText}>
                                    {(combinedSoilAnalysis || soilAnalysis)?.recommendations?.message || 'Unable to detect soil type from the image'}
                                </Text>
                                {(combinedSoilAnalysis || soilAnalysis)?.recommendations?.suggestions && (
                                    <View style={styles.suggestionsSection}>
                                        <Text style={styles.subSectionTitle}>Suggestions:</Text>
                                        {(combinedSoilAnalysis || soilAnalysis)?.recommendations?.suggestions?.map((suggestion: string, idx: number) => (
                                            <View key={idx} style={styles.bulletPoint}>
                                                <Text style={styles.bulletText}>• {suggestion}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Detections Section - Only show for non-comprehensive leaf analysis */}
                {analysisType !== 'soil-only' && analysisType !== 'comprehensive' && (
                    <View style={styles.detectionsContainer}>
                        <View style={styles.detectionsHeader}>
                            <Ionicons name="scan" size={24} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>{t('fertilizer.result.detections.title')}</Text>
                        </View>

                        {detections.length === 0 ? (
                            <View style={styles.noDetectionsCard}>
                                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                                <Text style={styles.noDetectionsTitle}>{t('fertilizer.result.detections.no_deficiencies_title')}</Text>
                                <Text style={styles.noDetectionsText}>
                                    {t('fertilizer.result.detections.no_deficiencies_text')}
                                </Text>
                            </View>
                        ) : (
                            detections.map((detection, index) => (
                                <View key={index} style={styles.detectionCard}>
                                    <View style={styles.cardWithImageRow}>
                                        <View style={styles.cardContentLeft}>
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
                                                            <Text style={styles.severityText}>{t(`fertilizer.result.detections.severity_${detection.severity.toLowerCase()}`)}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={styles.detectionDetails}>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>{t('fertilizer.result.detections.class')}:</Text>
                                                    <Text style={styles.detailValue}>{detection.class}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>{t('fertilizer.result.detections.confidence')}:</Text>
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
                                        {leafImage && (
                                            <View style={styles.cardImageRight}>
                                                <Image source={{ uri: leafImage }} style={styles.cardThumbnailImage} />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* Fertilizer Recommendations Section - Only show if deficiencies detected */}
                {plantAge && detections.length > 0 && (
                    <View style={styles.recommendationsContainer}>
                        <View style={styles.recommendationsHeader}>
                            <Ionicons name="leaf-outline" size={24} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>{t('fertilizer.result.recommendations.title')}</Text>
                            {plantAge && (
                                <View style={styles.plantAgeBadge}>
                                    <Ionicons name="calendar-outline" size={14} color="#4CAF50" />
                                    <Text style={styles.plantAgeText}>{plantAge} {plantAge === 1 ? t('fertilizer.result.recommendations.year') : t('fertilizer.result.recommendations.years')}</Text>
                                </View>
                            )}
                        </View>

                        {loadingRecommendations ? (
                            <View style={styles.loadingCard}>
                                <ActivityIndicator size="large" color="#4CAF50" />
                                <Text style={styles.loadingText}>{t('fertilizer.result.recommendations.loading')}</Text>
                            </View>
                        ) : displayRecommendations ? (
                            <>
                                {/* Comprehensive Analysis Notice */}
                                {analysisType === 'comprehensive' && combinedSoilAnalysis?.soil_type && (
                                    <View style={[styles.recommendationCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                                        <View style={styles.cardHeader}>
                                            <Ionicons name="analytics" size={20} color="#16A34A" />
                                            <Text style={[styles.cardTitle, { color: '#16A34A' }]}>Smart Comprehensive Analysis</Text>
                                        </View>
                                        <Text style={styles.stageDescription}>
                                            These recommendations are intelligently tailored based on your detected {detections[0]?.deficiency} deficiency, 
                                            {plantAge}-year-old plant age, and {combinedSoilAnalysis.soil_type} soil type for maximum effectiveness.
                                        </Text>
                                    </View>
                                )}

                                {/* Tabs Navigation */}
                                <View style={styles.tabsContainer}>
                                    <TouchableOpacity 
                                        style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                                        onPress={() => setActiveTab('overview')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name="flask-outline" 
                                            size={18} 
                                            color={activeTab === 'overview' ? '#4CAF50' : '#9CA3AF'} 
                                        />
                                        <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                                            Overview
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
                                        onPress={() => setActiveTab('schedule')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name="calendar-outline" 
                                            size={18} 
                                            color={activeTab === 'schedule' ? '#4CAF50' : '#9CA3AF'} 
                                        />
                                        <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
                                            Schedule
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                                        onPress={() => setActiveTab('details')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name="information-circle-outline" 
                                            size={18} 
                                            color={activeTab === 'details' ? '#4CAF50' : '#9CA3AF'} 
                                        />
                                        <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
                                            Details
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Overview Tab Content */}
                                {activeTab === 'overview' && (
                                    <>
                                        {/* Growth Stage */}
                                        <View style={styles.recommendationCard}>
                                            <View style={styles.cardHeader}>
                                                <Ionicons name="git-branch-outline" size={20} color="#4CAF50" />
                                                <Text style={styles.cardTitle}>{t('fertilizer.result.recommendations.growth_stage.title')}</Text>
                                            </View>
                                            <Text style={styles.stageDescription}>{displayRecommendations.growth_stage.description}</Text>
                                        </View>

                                        {/* Primary Fertilizer */}
                                        <View style={styles.recommendationCard}>
                                            <View style={styles.cardHeader}>
                                                <Ionicons name="flask-outline" size={20} color="#4CAF50" />
                                                <Text style={styles.cardTitle}>{t('fertilizer.result.recommendations.primary_fertilizer.title')}</Text>
                                            </View>
                                            <View style={styles.fertilizerDetails}>
                                                <Text style={styles.fertilizerName}>{displayRecommendations.primary_fertilizer.name}</Text>
                                                <View style={styles.npkBadge}>
                                                    <Text style={styles.npkText}>{t('fertilizer.result.recommendations.primary_fertilizer.npk')}: {displayRecommendations.primary_fertilizer.npk_ratio}</Text>
                                                </View>
                                                {displayRecommendations.primary_fertilizer.dosage_note && (
                                                    <View style={[styles.applicationMethodBox, { backgroundColor: '#FEF3C7', marginBottom: 12 }]}>
                                                        <Ionicons name="information-circle" size={16} color="#D97706" />
                                                        <Text style={[styles.applicationMethodText, { color: '#92400E', marginLeft: 8 }]}>
                                                            {displayRecommendations.primary_fertilizer.dosage_note}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="scale-outline" size={16} color="#6B7280" />
                                                    <Text style={styles.detailText}>
                                                        <Text style={styles.detailBold}>{t('fertilizer.result.recommendations.primary_fertilizer.dosage')}: </Text>
                                                        {displayRecommendations.primary_fertilizer.dosage}
                                                    </Text>
                                                </View>
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                                                    <Text style={styles.detailText}>
                                                        <Text style={styles.detailBold}>{t('fertilizer.result.recommendations.primary_fertilizer.frequency')}: </Text>
                                                        {displayRecommendations.primary_fertilizer.frequency}
                                                    </Text>
                                                </View>
                                                <View style={styles.applicationMethodBox}>
                                                    <Text style={styles.applicationMethodTitle}>{t('fertilizer.result.recommendations.primary_fertilizer.application_method')}:</Text>
                                                    <Text style={styles.applicationMethodText}>
                                                        {displayRecommendations.primary_fertilizer.application_method}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {/* Schedule Tab Content */}
                                {activeTab === 'schedule' && (
                                    <>
                                        {/* Urgent Action */}
                                        {displayRecommendations.application_schedule?.immediate_action_required && (
                                            <View style={[styles.recommendationCard, styles.urgentCard]}>
                                                <View style={styles.urgentHeader}>
                                                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                                                    <Text style={styles.urgentTitle}>{t('fertilizer.result.recommendations.schedule.urgent_title')}</Text>
                                                </View>
                                                <Text style={styles.urgentText}>
                                                    {t('fertilizer.result.recommendations.schedule.urgent_text')} {displayRecommendations.application_schedule.first_application.toLowerCase()}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Application Schedule */}
                                        {displayRecommendations.application_schedule && (
                                            <View style={styles.recommendationCard}>
                                                <View style={styles.cardHeader}>
                                                    <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                                                    <Text style={styles.cardTitle}>{t('fertilizer.result.recommendations.schedule.title')}</Text>
                                                </View>
                                                <View style={styles.scheduleDetails}>
                                                    {displayRecommendations.application_schedule.first_application && (
                                                        <View style={styles.scheduleItem}>
                                                            <Text style={styles.scheduleLabel}>{t('fertilizer.result.recommendations.schedule.first_application')}:</Text>
                                                            <Text style={styles.scheduleValue}>
                                                                {displayRecommendations.application_schedule.first_application}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {displayRecommendations.application_schedule.best_time && (
                                                        <View style={styles.scheduleItem}>
                                                            <Text style={styles.scheduleLabel}>{t('fertilizer.result.recommendations.schedule.best_time')}:</Text>
                                                            <Text style={styles.scheduleValue}>
                                                                {displayRecommendations.application_schedule.best_time}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {displayRecommendations.application_schedule.weather_conditions && (
                                                        <View style={styles.scheduleItem}>
                                                            <Text style={styles.scheduleLabel}>{t('fertilizer.result.recommendations.schedule.weather')}:</Text>
                                                            <Text style={styles.scheduleValue}>
                                                                {displayRecommendations.application_schedule.weather_conditions}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        )}

                                        {/* Additional Care Tips */}
                                        <View style={styles.recommendationCard}>
                                            <View style={styles.cardHeader}>
                                                <Ionicons name="water-outline" size={20} color="#4CAF50" />
                                                <Text style={styles.cardTitle}>{t('fertilizer.result.recommendations.additional_care.title')}</Text>
                                            </View>
                                            <View style={styles.careItem}>
                                                <Ionicons name="water" size={16} color="#3B82F6" />
                                                <Text style={styles.careText}>{displayRecommendations.additional_care.watering}</Text>
                                            </View>
                                            <View style={styles.careItem}>
                                                <Ionicons name="layers" size={16} color="#8B7355" />
                                                <Text style={styles.careText}>{displayRecommendations.additional_care.mulching}</Text>
                                            </View>
                                            <View style={styles.careItem}>
                                                <Ionicons name="eye" size={16} color="#4CAF50" />
                                                <Text style={styles.careText}>{displayRecommendations.additional_care.monitoring}</Text>
                                            </View>
                                            {displayRecommendations.additional_care.soil_testing && (
                                                <View style={styles.careItem}>
                                                    <Ionicons name="flask" size={16} color="#8B7355" />
                                                    <Text style={styles.careText}>{displayRecommendations.additional_care.soil_testing}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </>
                                )}

                                {/* Details Tab Content */}
                                {activeTab === 'details' && (
                                    <>
                                        {/* Expected Results */}
                                        {displayRecommendations.expected_results && (
                                            <View style={styles.recommendationCard}>
                                                <View style={styles.cardHeader}>
                                                    <Ionicons name="trending-up-outline" size={20} color="#4CAF50" />
                                                    <Text style={styles.cardTitle}>{t('fertilizer.result.recommendations.expected_results.title')}</Text>
                                                </View>
                                                {displayRecommendations.expected_results.improvement_timeline && (
                                                    <View style={styles.resultItem}>
                                                        <Text style={styles.resultLabel}>{t('fertilizer.result.recommendations.expected_results.improvement_timeline')}:</Text>
                                                        <Text style={styles.resultValue}>
                                                            {displayRecommendations.expected_results.improvement_timeline}
                                                        </Text>
                                                    </View>
                                                )}
                                                {displayRecommendations.expected_results.full_recovery && (
                                                    <View style={styles.resultItem}>
                                                        <Text style={styles.resultLabel}>{t('fertilizer.result.recommendations.expected_results.full_recovery')}:</Text>
                                                        <Text style={styles.resultValue}>
                                                            {displayRecommendations.expected_results.full_recovery}
                                                        </Text>
                                                    </View>
                                                )}
                                                {displayRecommendations.expected_results.monitoring_points && (
                                                    <View style={styles.monitoringPoints}>
                                                        <Text style={styles.monitoringTitle}>{t('fertilizer.result.recommendations.expected_results.monitor_points')}:</Text>
                                                        {displayRecommendations.expected_results.monitoring_points.map((point, idx) => (
                                                            <View key={idx} style={styles.monitoringPoint}>
                                                                <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                                                                <Text style={styles.monitoringText}>{point}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {/* Organic Alternative */}
                                        {displayRecommendations.organic_alternative && (
                                            <View style={styles.recommendationCard}>
                                                <View style={styles.cardHeader}>
                                                    <Ionicons name="leaf" size={20} color="#16A34A" />
                                                    <Text style={styles.cardTitle}>{t('fertilizer.result.recommendations.organic.title')}</Text>
                                                </View>
                                                <Text style={styles.organicDescription}>
                                                    {displayRecommendations.organic_alternative.description}
                                                </Text>
                                                {displayRecommendations.organic_alternative.note && (
                                                    <Text style={styles.organicNote}>
                                                        {displayRecommendations.organic_alternative.note}
                                                    </Text>
                                                )}
                                            </View>
                                        )}

                                        {/* Warnings */}
                                        {displayRecommendations.warnings && displayRecommendations.warnings.length > 0 && (
                                            <View style={[styles.recommendationCard, styles.warningCard]}>
                                                <View style={styles.cardHeader}>
                                                    <Ionicons name="warning-outline" size={20} color="#D97706" />
                                                    <Text style={styles.cardTitle}>{t('fertilizer.result.recommendations.warnings.title')}</Text>
                                                </View>
                                                {displayRecommendations.warnings.map((warning, idx) => (
                                                    <View key={idx} style={styles.warningItem}>
                                                        <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                                                        <Text style={styles.warningText}>{warning}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}
                            </>
                        ) : null}
                    </View>
                )}


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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 22,
    },
    imageContainer: {
        marginBottom: 24,
    },
    dualImageContainer: {
        marginBottom: 24,
    },
    dualImagesRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    singleImageWrapper: {
        flex: 1,
    },
    imageLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    imageLabelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    dualImage: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        marginTop: 16,
        borderWidth: 1.5,
        borderColor: '#4CAF50',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    retakeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4CAF50',
    },
    instructionsCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#EFF6FF',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginTop: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    instructionsText: {
        flex: 1,
        fontSize: 14,
        color: '#1E40AF',
        lineHeight: 20,
        fontWeight: '500',
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
    comprehensiveDetectionsContainer: {
        marginBottom: 32,
    },
    sideBySideDetections: {
        flexDirection: 'row',
        gap: 12,
    },
    stackedDetections: {
        flexDirection: 'column',
        gap: 16,
    },
    detectionColumn: {
        flex: 1,
    },
    detectionSection: {
        width: '100%',
    },
    columnHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    columnTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    compactDetectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardWithImageRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    cardContentLeft: {
        flex: 1,
    },
    cardImageRight: {
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardThumbnailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    characteristicsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    characteristicsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    compactCareItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 6,
    },
    compactCareText: {
        flex: 1,
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 16,
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
        marginBottom: 32,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
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
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    activeTabText: {
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
        lineHeight: 20,
        fontWeight: '500',
        backgroundColor: '#ECFDF5',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
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
    recommendationSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    recommendationSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    soilAnalysisContainer: {
        marginTop: 24,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    subSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 6,
        paddingLeft: 8,
    },
    bulletText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        flex: 1,
    },
    suggestionsSection: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
    },
});

export default FertilizerResultScreen;
