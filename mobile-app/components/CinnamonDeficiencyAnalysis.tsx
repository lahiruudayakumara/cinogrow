/**
 * Enhanced Cinnamon Leaf Deficiency Detection with AI Training Integration
 * 
 * This file provides a comprehensive UI for cinnamon deficiency analysis including:
 * - Advanced ML model integration
 * - Intelligent fertilizer recommendations
 * - User feedback collection for continuous learning
 * - Performance monitoring and analytics
 * 
 * Flow: PhotoPreview -> Enhanced Analysis -> Intelligent Recommendations -> Feedback Collection
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Linking,
    StyleSheet,
    ScrollView,
    Modal,
    TextInput,
    Switch,
    ProgressBarAndroid,
    Platform
} from 'react-native';
import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced TypeScript interfaces for comprehensive analysis
interface EnhancedAnalysisResults {
    success: boolean;
    analysis_id: number;
    detection_results: {
        detected_deficiency: string;
        severity: string;
        confidence: number;
        expert_consultation_needed: boolean;
    };
    intelligent_recommendation: {
        primary_fertilizer: {
            name: string;
            composition: Record<string, number>;
            application_rate: number;
            cost_per_kg: number;
            organic: boolean;
        };
        application_schedule: Array<{
            application_number: number;
            application_date: string;
            month: string;
            fertilizer_amount_kg: number;
            method: string;
            weather_requirements: string;
            special_notes: string;
        }>;
        cost_analysis: {
            fertilizer_cost_usd: number;
            labor_cost_usd: number;
            transport_cost_usd: number;
            total_cost_usd: number;
            cost_per_hectare: number;
        };
        roi_projection: {
            yield_increase_kg: number;
            net_profit_usd: number;
            roi_percentage: number;
            payback_period_months: number | string;
            profitability_assessment: string;
        };
        seasonal_timing: {
            optimal_months: string[];
            avoid_months: string[];
            monsoon_dependent: boolean;
        };
        expected_improvement_days: number;
    };
    alternatives: {
        inorganic_options: Array<{
            name: string;
            composition: Record<string, number>;
            cost_per_kg: number;
        }>;
        organic_options: Array<{
            name: string;
            composition: Record<string, number>;
            cost_per_kg: number;
        }>;
    };
    application_guidance: {
        instructions: string;
        monitoring_guidelines: string;
        warning_notes: string[];
        preventive_measures: string[];
    };
    follow_up: {
        next_analysis_date: string;
        feedback_collection_enabled: boolean;
        improvement_tracking: boolean;
    };
    model_info: {
        model_version: string;
        prediction_method: string;
    };
    error_message?: string;
}

interface FeedbackSubmission {
    accuracy_rating?: number;
    actual_deficiency?: string;
    recommendation_followed?: boolean;
    effectiveness_rating?: number;
    improvement_observed?: boolean;
    days_to_improvement?: number;
    feedback_text?: string;
    before_image?: string;
    after_image?: string;
}

interface UserPreferences {
    farm_location: string;
    farm_size_hectares: number;
    organic_preference: boolean;
    budget_range: number;
    auto_collect_training_data: boolean;
    receive_improvement_tips: boolean;
}

interface EnhancedCinnamonDeficiencyAnalysisProps {
    capturedImageUri: string;
    farmId?: number | null;
    plotId?: number | null;
    userId?: number;
    navigation: any;
    userPreferences?: UserPreferences;
}

interface EnhancedResultsPreviewProps {
    results: EnhancedAnalysisResults;
    onFeedbackPress: () => void;
    onAlternativePress: (alternative: string) => void;
}

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (feedback: FeedbackSubmission) => void;
    analysisId: number;
}

// Enhanced Cinnamon Deficiency Analysis Component
const EnhancedCinnamonDeficiencyAnalysis: React.FC<EnhancedCinnamonDeficiencyAnalysisProps> = ({
    capturedImageUri,
    farmId = null,
    plotId = null,
    userId = 1,
    navigation,
    userPreferences
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisResults, setAnalysisResults] = useState<EnhancedAnalysisResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
    const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences>({
        farm_location: 'matale',
        farm_size_hectares: 1.0,
        organic_preference: false,
        budget_range: 500,
        auto_collect_training_data: true,
        receive_improvement_tips: true,
        ...userPreferences
    });

    // Load user preferences from storage
    useEffect(() => {
        loadUserPreferences();
    }, []);

    const loadUserPreferences = async () => {
        try {
            const storedPreferences = await AsyncStorage.getItem('userPreferences');
            if (storedPreferences) {
                setPreferences({ ...preferences, ...JSON.parse(storedPreferences) });
            }
        } catch (error) {
            console.log('Failed to load preferences:', error);
        }
    };

    const saveUserPreferences = async (newPreferences: UserPreferences) => {
        try {
            await AsyncStorage.setItem('userPreferences', JSON.stringify(newPreferences));
            setPreferences(newPreferences);
        } catch (error) {
            console.log('Failed to save preferences:', error);
        }
    };

    // Enhanced analysis function with comprehensive data collection
    const runEnhancedAnalysis = async (): Promise<EnhancedAnalysisResults> => {
        try {
            setIsAnalyzing(true);
            setError(null);

            // Prepare enhanced form data
            const formData = new FormData();
            formData.append('image', {
                uri: capturedImageUri,
                type: 'image/jpeg',
                name: 'enhanced_cinnamon_leaf.jpg',
            } as any);

            // Add farm metadata
            if (farmId) formData.append('farm_id', farmId.toString());
            if (plotId) formData.append('plot_id', plotId.toString());
            formData.append('user_id', userId.toString());

            // Add user preferences for intelligent recommendations
            formData.append('farm_location', preferences.farm_location);
            formData.append('farm_size_hectares', preferences.farm_size_hectares.toString());
            formData.append('farmer_budget', preferences.budget_range.toString());
            formData.append('organic_preference', preferences.organic_preference.toString());
            formData.append('collect_training_data', preferences.auto_collect_training_data.toString());

            // Call enhanced analysis API
            const response = await fetch(${ api.API_BASE_URL } / fertilizer / cinnamon / enhanced / analyze -with-feedback, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const results = await response.json();

            if (!response.ok) {
                throw new Error(results.detail || 'Enhanced analysis failed');
            }

            return results;
        } catch (error) {
            console.error('Enhanced analysis failed:', error);
            throw error;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const confirmImageAndAnalyze = async () => {
        try {
            const results = await runEnhancedAnalysis();

            if (results.success) {
                setAnalysisResults(results);

                // Navigate to enhanced results screen
                navigation.navigate('EnhancedFertilizerResultScreen', {
                    analysisResults: results,
                    userPreferences: preferences,
                    onFeedbackRequest: () => setShowFeedbackModal(true)
                });
            } else {
                setError(results.error_message || 'Analysis failed');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const submitFeedback = async (feedback: FeedbackSubmission) => {
        if (!analysisResults) return;

        try {
            const response = await fetch(${ api.API_BASE_URL } / fertilizer / cinnamon / enhanced / submit - feedback, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    analysis_id: analysisResults.analysis_id,
                    feedback_type: 'accuracy_rating',
                    ...feedback
                })
            });

            const result = await response.json();

            if (result.success) {
                Alert.alert(
                    'Feedback Submitted',
                    'Thank you! Your feedback helps improve our AI models.',
                    [{ text: 'OK' }]
                );
                setShowFeedbackModal(false);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to submit feedback');
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Image Preview Section */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: capturedImageUri }} style={styles.previewImage} />

                {/* AI Analysis Overlay */}
                {analysisResults && (
                    <View style={styles.aiOverlay}>
                        <View style={styles.aiIndicator}>
                            <Text style={styles.aiText}>AI Analysis Complete</Text>
                            <Text style={styles.confidenceText}>
                                {(analysisResults.detection_results.confidence * 100).toFixed(1)}% Confidence
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Analysis Status Section */}
            <View style={styles.statusContainer}>
                {isAnalyzing ? (
                    <AnalyzingComponent />
                ) : error ? (
                    <ErrorComponent error={error} onRetry={confirmImageAndAnalyze} />
                ) : analysisResults ? (
                    <EnhancedResultsPreview
                        results={analysisResults}
                        onFeedbackPress={() => setShowFeedbackModal(true)}
                        onAlternativePress={setSelectedAlternative}
                    />
                ) : (
                    <ReadyForAnalysisComponent />
                )}
            </View>

            {/* User Preferences Panel */}
            <PreferencesPanel
                preferences={preferences}
                onPreferencesChange={saveUserPreferences}
            />

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.analyzeButton]}
                    onPress={confirmImageAndAnalyze}
                    disabled={isAnalyzing}
                >
                    <Text style={styles.analyzeButtonText}>
                        {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Leaf with AI'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.retakeButton]}
                    onPress={() => navigation.goBack()}
                    disabled={isAnalyzing}
                >
                    <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
            </View>

            {/* Feedback Modal */}
            <FeedbackModal
                visible={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                onSubmit={submitFeedback}
                analysisId={analysisResults?.analysis_id || 0}
            />
        </ScrollView>
    );
};

// Analyzing Component with Progress Indicator
const AnalyzingComponent: React.FC = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>AI Analysis in Progress</Text>
        <Text style={styles.loadingSubtext}>
            Using advanced machine learning to detect nutrient deficiencies...
        </Text>
        {Platform.OS === 'android' && (
            <ProgressBarAndroid styleAttr="Horizontal" color="#4CAF50" />
        )}
        <View style={styles.analysisSteps}>
            <Text style={styles.stepText}>• Extracting color features</Text>
            <Text style={styles.stepText}>• Analyzing texture patterns</Text>
            <Text style={styles.stepText}>• Generating recommendations</Text>
        </View>
    </View>
);

// Error Component with Retry Option
const ErrorComponent: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
    <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Analysis Failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry Analysis</Text>
        </TouchableOpacity>
    </View>
);

// Ready for Analysis Component
const ReadyForAnalysisComponent: React.FC = () => (
    <View style={styles.readyContainer}>
        <Text style={styles.readyText}>Ready for AI Analysis</Text>
        <Text style={styles.readySubtext}>
            Our enhanced AI will analyze your leaf for nutrient deficiencies and provide intelligent fertilizer recommendations
        </Text>
        <View style={styles.featuresContainer}>
            <Text style={styles.featureText}>✓ Advanced ML deficiency detection</Text>
            <Text style={styles.featureText}>✓ Intelligent fertilizer recommendations</Text>
            <Text style={styles.featureText}>✓ Cost optimization</Text>
            <Text style={styles.featureText}>✓ Seasonal timing guidance</Text>
        </View>
    </View>
);

// Enhanced Results Preview Component
const EnhancedResultsPreview: React.FC<EnhancedResultsPreviewProps> = ({
    results,
    onFeedbackPress,
    onAlternativePress
}) => (
    <View style={styles.enhancedResultsContainer}>
        {/* Detection Results Card */}
        <View style={styles.detectionCard}>
            <Text style={styles.cardTitle}>AI Detection Results</Text>
            <View style={styles.detectionResults}>
                <Text style={styles.deficiencyText}>
                    {results.detection_results.detected_deficiency}
                </Text>
                <Text style={styles.severityText}>
                    Severity: {results.detection_results.severity}
                </Text>
                <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>AI Confidence:</Text>
                    <View style={styles.confidenceBar}>
                        <View
                            style={[
                                styles.confidenceFill,
                                { width: ${ results.detection_results.confidence * 100 } % }
              ]}
            />
                    </View>
                    <Text style={styles.confidencePercentage}>
                        {(results.detection_results.confidence * 100).toFixed(1)}%
                    </Text>
                </View>
            </View>
        </View>

        {/* Intelligent Recommendation Card */}
        <View style={styles.recommendationCard}>
            <Text style={styles.cardTitle}>Smart Recommendation</Text>
            <View style={styles.fertilizerInfo}>
                <Text style={styles.fertilizerName}>
                    {results.intelligent_recommendation.primary_fertilizer.name}
                </Text>
                <Text style={styles.fertilizerDetails}>
                    Application: {results.intelligent_recommendation.primary_fertilizer.application_rate}g per plant
                </Text>
                <Text style={styles.costInfo}>
                    Cost: ${results.intelligent_recommendation.cost_analysis.total_cost_usd.toFixed(2)}
                </Text>
            </View>

            {/* ROI Projection */}
            <View style={styles.roiContainer}>
                <Text style={styles.roiTitle}>Expected Return</Text>
                <Text style={styles.roiValue}>
                    {results.intelligent_recommendation.roi_projection.roi_percentage.toFixed(1)}% ROI
                </Text>
                <Text style={styles.roiDescription}>
                    {results.intelligent_recommendation.roi_projection.profitability_assessment}
                </Text>
            </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onFeedbackPress}>
                <Text style={styles.actionButtonText}>Provide Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onAlternativePress('alternatives')}
            >
                <Text style={styles.actionButtonText}>View Alternatives</Text>
            </TouchableOpacity>
        </View>
    </View>
);

// User Preferences Panel Component
const PreferencesPanel: React.FC<{
    preferences: UserPreferences;
    onPreferencesChange: (preferences: UserPreferences) => void;
}> = ({ preferences, onPreferencesChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <View style={styles.preferencesPanel}>
            <TouchableOpacity
                style={styles.preferencesHeader}
                onPress={() => setIsExpanded(!isExpanded)}
            >
                <Text style={styles.preferencesTitle}>Analysis Preferences</Text>
                <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.preferencesContent}>
                    <View style={styles.preferenceRow}>
                        <Text style={styles.preferenceLabel}>Organic Preference</Text>
                        <Switch
                            value={preferences.organic_preference}
                            onValueChange={(value) =>
                                onPreferencesChange({ ...preferences, organic_preference: value })
                            }
                        />
                    </View>

                    <View style={styles.preferenceRow}>
                        <Text style={styles.preferenceLabel}>Farm Size (hectares)</Text>
                        <TextInput
                            style={styles.preferenceInput}
                            value={preferences.farm_size_hectares.toString()}
                            onChangeText={(text) =>
                                onPreferencesChange({
                                    ...preferences,
                                    farm_size_hectares: parseFloat(text) || 1.0
                                })
                            }
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.preferenceRow}>
                        <Text style={styles.preferenceLabel}>Auto-collect Training Data</Text>
                        <Switch
                            value={preferences.auto_collect_training_data}
                            onValueChange={(value) =>
                                onPreferencesChange({ ...preferences, auto_collect_training_data: value })
                            }
                        />
                    </View>
                </View>
            )}
        </View>
    );
};

// Feedback Modal Component
const FeedbackModal: React.FC<FeedbackModalProps> = ({
    visible,
    onClose,
    onSubmit,
    analysisId
}) => {
    const [accuracyRating, setAccuracyRating] = useState<number>(5);
    const [recommendationFollowed, setRecommendationFollowed] = useState<boolean>(false);
    const [effectivenessRating, setEffectivenessRating] = useState<number>(3);
    const [feedbackText, setFeedbackText] = useState<string>('');
    const [improvementObserved, setImprovementObserved] = useState<boolean>(false);

    const handleSubmit = () => {
        const feedback: FeedbackSubmission = {
            accuracy_rating: accuracyRating,
            recommendation_followed: recommendationFollowed,
            effectiveness_rating: effectivenessRating,
            feedback_text: feedbackText,
            improvement_observed: improvementObserved
        };

        onSubmit(feedback);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
                <ScrollView style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Help Improve Our AI</Text>
                    <Text style={styles.modalSubtitle}>
                        Your feedback helps train better models for all farmers
                    </Text>

                    {/* Accuracy Rating */}
                    <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackLabel}>How accurate was the diagnosis?</Text>
                        <View style={styles.ratingContainer}>
                            {[1, 2, 3, 4, 5].map((rating) => (
                                <TouchableOpacity
                                    key={rating}
                                    style={[
                                        styles.ratingButton,
                                        accuracyRating >= rating && styles.ratingButtonSelected
                                    ]}
                                    onPress={() => setAccuracyRating(rating)}
                                >
                                    <Text style={[
                                        styles.ratingText,
                                        accuracyRating >= rating && styles.ratingTextSelected
                                    ]}>
                                        {rating}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Recommendation Follow-up */}
                    <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackLabel}>Did you follow the fertilizer recommendation?</Text>
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleButton, !recommendationFollowed && styles.toggleSelected]}
                                onPress={() => setRecommendationFollowed(false)}
                            >
                                <Text style={styles.toggleText}>No</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleButton, recommendationFollowed && styles.toggleSelected]}
                                onPress={() => setRecommendationFollowed(true)}
                            >
                                <Text style={styles.toggleText}>Yes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Effectiveness Rating (shown only if recommendation was followed) */}
                    {recommendationFollowed && (
                        <View style={styles.feedbackSection}>
                            <Text style={styles.feedbackLabel}>How effective was the treatment?</Text>
                            <View style={styles.ratingContainer}>
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <TouchableOpacity
                                        key={rating}
                                        style={[
                                            styles.ratingButton,
                                            effectivenessRating >= rating && styles.ratingButtonSelected
                                        ]}
                                        onPress={() => setEffectivenessRating(rating)}
                                    >
                                        <Text style={[
                                            styles.ratingText,
                                            effectivenessRating >= rating && styles.ratingTextSelected
                                        ]}>
                                            {rating}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Additional Feedback */}
                    <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackLabel}>Additional comments (optional)</Text>
                        <TextInput
                            style={styles.feedbackTextInput}
                            multiline
                            numberOfLines={4}
                            value={feedbackText}
                            onChangeText={setFeedbackText}
                            placeholder="Share your experience, suggestions, or any issues you encountered..."
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* Submit Buttons */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                            <Text style={styles.submitButtonText}>Submit Feedback</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

// Helper functions
const getStatusColor = (detectedIssue: string) => {
    if (detectedIssue === 'Healthy Leaf') {
        return { backgroundColor: '#4CAF50' };
    } else if (detectedIssue.includes('Nitrogen')) {
        return { backgroundColor: '#FF9800' };
    } else if (detectedIssue.includes('Potassium')) {
        return { backgroundColor: '#F44336' };
    }
    return { backgroundColor: '#9E9E9E' };
};

const getStatusMessage = (detectedIssue: string) => {
    if (detectedIssue === 'Healthy Leaf') {
        return 'Leaf appears healthy';
    } else if (detectedIssue.includes('Nitrogen')) {
        return 'Nitrogen deficiency detected - Action needed';
    } else if (detectedIssue.includes('Potassium')) {
        return 'Potassium deficiency detected (brown edges) - Urgent action needed';
    }
    return 'Analysis completed';
};

const contactExpert = () => {
    // Open phone dialer or contact form
    Alert.alert(
        'Contact Expert',
        'Would you like to call the Cinnamon Research Center?',
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call Now', onPress: () => Linking.openURL('tel:+94662245463') }
        ]
    );
};

const saveResults = async (results: EnhancedAnalysisResults): Promise<void> => {
    try {
        // Save to local storage or send to backend
        // Implementation depends on your app's data management
        Alert.alert('Success', 'Analysis results saved successfully');
    } catch (error) {
        Alert.alert('Error', 'Failed to save results');
    }
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    imageContainer: {
        position: 'relative' as const,
        marginBottom: 20,
    },
    previewImage: {
        width: '100%' as const,
        height: 300,
        borderRadius: 12,
        resizeMode: 'cover' as const,
    },
    overlay: {
        position: 'absolute' as const,
        bottom: 10,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
        borderRadius: 8,
    },
    overlayText: {
        color: 'white',
        fontSize: 14,
        textAlign: 'center' as const,
    },
    statusContainer: {
        marginBottom: 20,
    },
    loadingContainer: {
        alignItems: 'center' as const,
        padding: 20,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        marginTop: 10,
        color: '#4CAF50',
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center' as const,
        marginTop: 5,
    },
    errorContainer: {
        alignItems: 'center' as const,
        padding: 20,
        backgroundColor: '#ffebee',
        borderRadius: 8,
        marginVertical: 10,
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#d32f2f',
        marginBottom: 5,
    },
    errorMessage: {
        fontSize: 14,
        color: '#d32f2f',
        textAlign: 'center' as const,
    },
    readyContainer: {
        alignItems: 'center' as const,
        padding: 20,
        backgroundColor: '#e8f5e8',
        borderRadius: 8,
        marginVertical: 10,
    },
    readyText: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#4CAF50',
        marginBottom: 5,
    },
    readySubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center' as const,
    },
    buttonContainer: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center' as const,
    },
    analyzeButton: {
        backgroundColor: '#4CAF50',
    },
    analyzeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold' as const,
    },
    retakeButton: {
        backgroundColor: '#757575',
    },
    retakeButtonText: {
        color: 'white',
        fontSize: 16,
    },
    resultsContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginVertical: 10,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: 'bold' as const,
        color: '#4CAF50',
        marginBottom: 15,
        textAlign: 'center' as const,
    },
    detectionContainer: {
        marginBottom: 15,
    },
    detectionLabel: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#333',
        marginTop: 10,
    },
    detectionValue: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: 'bold' as const,
        marginTop: 2,
    },
    confidenceLabel: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#333',
        marginTop: 10,
    },
    confidenceValue: {
        fontSize: 16,
        color: '#2196F3',
        fontWeight: 'bold' as const,
        marginTop: 2,
    },
    recommendationPreview: {
        backgroundColor: '#f0f8ff',
        padding: 12,
        borderRadius: 6,
        marginTop: 15,
    },
    recommendationTitle: {
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#1976D2',
        marginBottom: 8,
    },
    recommendationDetails: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    expertNotice: {
        backgroundColor: '#fff3e0',
        padding: 12,
        borderRadius: 6,
        marginTop: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
    },
    expertNoticeText: {
        fontSize: 14,
        color: '#F57C00',
        fontWeight: '600' as const,
        textAlign: 'center' as const,
    },
    resultScreenContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    resultHeader: {
        alignItems: 'center' as const,
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: 'bold' as const,
        color: '#2e7d32',
        marginBottom: 5,
    },
    resultSubtitle: {
        fontSize: 16,
        color: '#666',
    },
    detectionSection: {
        marginBottom: 20,
    },
    detectionCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    detectionCardTitle: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#333',
        marginBottom: 12,
    },
    detectionDetails: {
        marginBottom: 15,
    },
    detectedIssue: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    confidenceScore: {
        fontSize: 16,
        color: '#333',
    },
    statusIndicator: {
        padding: 8,
        borderRadius: 6,
        alignItems: 'center' as const,
    },
    statusText: {
        color: 'white',
        fontWeight: 'bold' as const,
        fontSize: 14,
    },
    detailedAnalysis: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#333',
        marginBottom: 12,
    },
    issuesContainer: {
        marginBottom: 15,
    },
    issuesTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#333',
        marginBottom: 8,
    },
    issueItem: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
        marginBottom: 4,
    },
    cuesContainer: {
        marginBottom: 15,
    },
    cuesTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#333',
        marginBottom: 8,
    },
    cueItem: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
        marginBottom: 4,
    },
    recommendationCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    recommendationCardTitle: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#4CAF50',
        marginBottom: 12,
    },
    recommendationContent: {
        marginBottom: 15,
    },
    fertilizerDetails: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 8,
    },
    applicationFrequency: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic' as const,
        marginBottom: 8,
    },
    organicAlternative: {
        backgroundColor: '#f0f8f0',
        padding: 12,
        borderRadius: 6,
        marginTop: 10,
    },
    organicTitle: {
        fontSize: 14,
        fontWeight: 'bold' as const,
        color: '#4CAF50',
        marginBottom: 5,
    },
    organicDetails: {
        fontSize: 13,
        color: '#333',
        lineHeight: 18,
    },
    contactNote: {
        backgroundColor: '#fff3e0',
        padding: 12,
        borderRadius: 6,
        marginTop: 10,
    },
    contactNoteText: {
        fontSize: 13,
        color: '#F57C00',
        marginBottom: 10,
        textAlign: 'center' as const,
    },
    contactButton: {
        backgroundColor: '#FF9800',
        padding: 10,
        borderRadius: 6,
        alignItems: 'center' as const,
    },
    contactButtonText: {
        color: 'white',
        fontWeight: 'bold' as const,
        fontSize: 14,
    },
    actionButtons: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        gap: 12,
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center' as const,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold' as const,
    },
    newAnalysisButton: {
        flex: 1,
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center' as const,
    },
    newAnalysisButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold' as const,
    },
    // Enhanced component styles
    aiOverlay: {
        position: 'absolute' as const,
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 8,
        borderRadius: 8,
    },
    aiIndicator: {
        alignItems: 'center' as const,
    },
    aiText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold' as const,
    },
    confidenceText: {
        color: '#4CAF50',
        fontSize: 10,
        marginTop: 2,
    },
    analysisSteps: {
        marginTop: 16,
        alignItems: 'center' as const,
    },
    stepText: {
        fontSize: 12,
        color: '#4CAF50',
        marginVertical: 2,
    },
    retryButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600' as const,
    },
    featuresContainer: {
        alignItems: 'flex-start' as const,
        marginTop: 12,
    },
    featureText: {
        fontSize: 12,
        color: '#4CAF50',
        marginVertical: 2,
        fontWeight: '500' as const,
    },
    enhancedResultsContainer: {
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#2c3e50',
        marginBottom: 12,
    },
    detectionResults: {
        marginBottom: 12,
    },
    deficiencyText: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#e74c3c',
        marginBottom: 4,
    },
    severityText: {
        fontSize: 14,
        color: '#f39c12',
        marginBottom: 8,
    },
    confidenceContainer: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginTop: 8,
    },
    confidenceBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#ecf0f1',
        borderRadius: 3,
        marginRight: 8,
    },
    confidenceFill: {
        height: '100%' as const,
        backgroundColor: '#4CAF50',
        borderRadius: 3,
    },
    confidencePercentage: {
        fontSize: 12,
        fontWeight: 'bold' as const,
        color: '#4CAF50',
    },
    fertilizerInfo: {
        marginBottom: 12,
    },
    fertilizerName: {
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#2c3e50',
        marginBottom: 4,
    },
    costInfo: {
        fontSize: 14,
        color: '#27ae60',
        fontWeight: '600' as const,
    },
    roiContainer: {
        backgroundColor: '#ecf0f1',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    roiTitle: {
        fontSize: 12,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    roiValue: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#27ae60',
        marginBottom: 4,
    },
    roiDescription: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    quickActions: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600' as const,
        textAlign: 'center' as const,
    },
    preferencesPanel: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        elevation: 2,
    },
    preferencesHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    preferencesTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#2c3e50',
    },
    expandIcon: {
        fontSize: 20,
        color: '#3498db',
        fontWeight: 'bold' as const,
    },
    preferencesContent: {
        padding: 16,
    },
    preferenceRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        marginBottom: 16,
    },
    preferenceLabel: {
        fontSize: 14,
        color: '#2c3e50',
        flex: 1,
    },
    preferenceInput: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: 100,
        textAlign: 'center' as const,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold' as const,
        color: '#2c3e50',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 24,
        lineHeight: 22,
    },
    feedbackSection: {
        marginBottom: 24,
    },
    feedbackLabel: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#2c3e50',
        marginBottom: 12,
    },
    ratingContainer: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginBottom: 8,
    },
    ratingButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#bdc3c7',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        backgroundColor: '#fff',
    },
    ratingButtonSelected: {
        borderColor: '#4CAF50',
        backgroundColor: '#4CAF50',
    },
    ratingText: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#7f8c8d',
    },
    ratingTextSelected: {
        color: '#fff',
    },
    toggleContainer: {
        flexDirection: 'row' as const,
        marginBottom: 8,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#bdc3c7',
        alignItems: 'center' as const,
        marginHorizontal: 4,
    },
    toggleSelected: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    toggleText: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    feedbackTextInput: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlignVertical: 'top' as const,
        minHeight: 100,
    },
    modalActions: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginTop: 24,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        alignItems: 'center' as const,
        marginRight: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    submitButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        alignItems: 'center' as const,
        marginLeft: 8,
    },
    submitButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600' as const,
    },
});

export { EnhancedCinnamonDeficiencyAnalysis as CinnamonDeficiencyAnalysis };
export default EnhancedCinnamonDeficiencyAnalysis;
