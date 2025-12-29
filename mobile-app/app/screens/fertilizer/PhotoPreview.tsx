import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fertilizerAPI, RoboflowAnalysisResponse } from '../../../services/fertilizerAPI';
import PlantAgeSelector from '../../../components/PlantAgeSelector';
import { deserializePhotoPreviewParams, serializeResultParams } from '../../fertilizer/types';

const PhotoPreview: React.FC = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const rawParams = useLocalSearchParams();
    const { imageUri, imageType, leafImage, soilImage, leafMetadata } = deserializePhotoPreviewParams(rawParams as any);
    const insets = useSafeAreaInsets();

    // State for ML analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState('');
    const [showAgeSelectorModal, setShowAgeSelectorModal] = useState(false);
    const [selectedPlantAge, setSelectedPlantAge] = useState<number>(1);

    const detectedIssues = [
        {
            icon: imageType === 'leaf' ? 'leaf' : 'earth',
            issue: imageType === 'leaf' ? t('fertilizer.photo_preview.analysis.leaf_condition') : t('fertilizer.photo_preview.analysis.soil_ph_issue'),
            severity: t('fertilizer.photo_preview.analysis.status_analyzing'),
            color: '#D97706'
        },
        {
            icon: imageType === 'leaf' ? 'water' : 'nutrition',
            issue: imageType === 'leaf' ? t('fertilizer.photo_preview.analysis.checking_deficiencies') : t('fertilizer.photo_preview.analysis.low_organic'),
            severity: t('fertilizer.photo_preview.analysis.status_analyzing'),
            color: '#16A34A'
        }
    ];

    const handleRetakePhoto = () => {
        router.back();
    };

    const handleContinue = async () => {
        if (imageType === 'leaf') {
            // Show age selector first, then perform analysis after age is selected
            setShowAgeSelectorModal(true);
        } else if (imageType === 'soil') {
            // For now, go to results with basic soil analysis
            // TODO: Implement soil analysis API
            router.push({
                pathname: '/fertilizer/result',
                params: serializeResultParams({
                    leafImage: leafImage,
                    soilImage: imageUri,
                    analysisType: 'comprehensive'
                })
            });
        }
    };

    const performLeafAnalysis = async (plantAge: number) => {
        try {
            setIsAnalyzing(true);
            setAnalysisProgress(t('fertilizer.photo_preview.analysis.progress_detecting'));

            console.log('🚀 Starting leaf analysis with Roboflow via backend...');
            console.log(`🖼️ Image URI: ${imageUri}`);
            console.log(`🌱 Plant Age: ${plantAge} years`);

            // Step 1: Use backend API to call Roboflow with plant age
            console.log('🤖 Step 1: Calling backend Roboflow API...');
            const roboflowResult = await fertilizerAPI.analyzeLeafWithRoboflow(imageUri, plantAge);

            console.log('✅ Roboflow detection completed:', roboflowResult);

            setIsAnalyzing(false);

            // Navigate directly to results with the analysis data
            router.push({
                pathname: '/fertilizer/result',
                params: serializeResultParams({
                    leafImage: imageUri,
                    analysisType: 'leaf-only' as const,
                    roboflowAnalysis: roboflowResult,
                    plantAge: plantAge
                })
            });

        } catch (error) {
            console.error('❌ Leaf analysis error:', error);
            setIsAnalyzing(false);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            console.error('🚨 Analysis failed with details:', {
                error: errorMessage,
                imageUri: imageUri,
                timestamp: new Date().toISOString()
            });

            Alert.alert(
                t('fertilizer.photo_preview.alerts.analysis_failed'),
                t('fertilizer.photo_preview.alerts.failed_message', { error: errorMessage }),
                [
                    {
                        text: t('fertilizer.photo_preview.alerts.try_again'),
                        onPress: () => performLeafAnalysis(plantAge)
                    },
                    {
                        text: t('fertilizer.photo_preview.alerts.basic_analysis'),
                        onPress: () => {
                            console.log('👤 User chose basic analysis fallback');
                            // Continue with basic analysis if ML fails
                            router.push({
                                pathname: '/fertilizer/result',
                                params: serializeResultParams({
                                    leafImage: imageUri,
                                    analysisType: 'leaf-only'
                                })
                            });
                        }
                    }
                ]
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAgeConfirm = (plantAge: number) => {
        console.log(`🌱 Plant age selected: ${plantAge} years`);
        setShowAgeSelectorModal(false);
        setSelectedPlantAge(plantAge);

        // Perform analysis with the selected plant age
        performLeafAnalysis(plantAge);
    };

    const handleAddSoilAnalysis = () => {
        // Navigate to soil upload to enhance the analysis
        router.push({
            pathname: '/fertilizer/upload-soil',
            params: {
                fromLeaf: 'true',
                leafImage: imageUri
            }
        });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Critical': return '#DC2626';
            case 'High': return '#EA580C';
            case 'Moderate': return '#D97706';
            case 'Low': return '#16A34A';
            default: return '#6B7280';
        }
    };

    const renderIssueCard = (issue: any, index: number) => (
        <View key={index} style={styles.issueCard}>
            <View style={styles.issueHeader}>
                <View style={[styles.issueIconContainer, { backgroundColor: `${issue.color}20` }]}>
                    <Ionicons name={issue.icon} size={20} color={issue.color} />
                </View>
                <View style={styles.issueContent}>
                    <Text style={styles.issueText}>{issue.issue}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(issue.severity) }]}>
                        <Text style={styles.severityText}>{issue.severity}</Text>
                    </View>
                </View>
            </View>
        </View >
    );

    const renderProgressIndicator = () => {
        const hasLeafImage = leafImage || imageType === 'leaf';
        const hasSoilImage = soilImage || imageType === 'soil';
        const isCompleted = hasLeafImage && hasSoilImage;

        let progress = 0;
        let progressText = '';

        if (imageType === 'leaf') {
            progress = 100; // Leaf analysis is complete for recommendations
            progressText = t('fertilizer.photo_preview.progress.ready_recommendations');
        } else if (imageType === 'soil') {
            progress = 100; // Enhanced analysis ready
            progressText = t('fertilizer.photo_preview.progress.enhanced_ready');
        }

        return (
            <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>{t('fertilizer.photo_preview.progress.title')}</Text>
                <View style={styles.progressBar}>
                    <LinearGradient
                        colors={['#4CAF50', '#45A049']}
                        style={[styles.progressFill, { width: `${progress}%` }]}
                    />
                </View>
                <Text style={styles.progressText}>{progressText}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{
                    paddingBottom: Platform.select({
                        ios: 100 + insets.bottom,
                        default: 80 + insets.bottom,
                    }),
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {imageType === 'leaf' ? t('fertilizer.photo_preview.header.title_leaf') : t('fertilizer.photo_preview.header.title_soil')}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {t('fertilizer.photo_preview.header.subtitle', { type: imageType })}
                    </Text>
                </View>

                {/* Progress Indicator */}
                {renderProgressIndicator()}

                {/* Photo Preview Card */}
                <View style={[styles.photoCard, {
                    borderLeftWidth: 4,
                    borderLeftColor: imageType === 'leaf' ? '#4CAF50' : '#8B7355',
                }]}>
                    <View style={styles.photoHeader}>
                        <View style={[styles.photoIconContainer, {
                            backgroundColor: imageType === 'leaf' ? '#4CAF5020' : '#8B735520',
                        }]}>
                            <Ionicons
                                name={imageType === 'leaf' ? 'leaf' : 'earth'}
                                size={24}
                                color={imageType === 'leaf' ? '#4CAF50' : '#8B7355'}
                            />
                        </View>
                        <Text style={styles.photoTitle}>
                            {imageType === 'leaf' ? t('fertilizer.photo_preview.sample.leaf') : t('fertilizer.photo_preview.sample.soil')}
                        </Text>
                    </View>

                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                        <View style={styles.imageOverlay}>
                            <View style={styles.imageQualityBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                <Text style={styles.imageQualityText}>{t('fertilizer.photo_preview.sample.quality_good')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* AI Analysis Preview */}
                <View style={styles.analysisSection}>
                    <View style={styles.analysisTitleContainer}>
                        <Ionicons name="analytics" size={20} color="#4CAF50" />
                        <Text style={styles.analysisTitle}>{t('fertilizer.photo_preview.analysis.title')}</Text>
                        {isAnalyzing ? (
                            <View style={styles.aiProcessingBadge}>
                                <ActivityIndicator size="small" color="#D97706" />
                                <Text style={styles.aiProcessingText}>{t('fertilizer.photo_preview.analysis.status_analyzing')}</Text>
                            </View>
                        ) : (
                            <View style={styles.aiProcessingBadge}>
                                <Text style={styles.aiProcessingText}>{t('fertilizer.photo_preview.analysis.status_ready')}</Text>
                            </View>
                        )}
                    </View>

                    {isAnalyzing && (
                        <View style={styles.mlProgressContainer}>
                            <Text style={styles.mlProgressText}>{analysisProgress}</Text>
                        </View>
                    )}

                    <View style={styles.issuesContainer}>
                        {detectedIssues.map((issue, index) => renderIssueCard(issue, index))}
                    </View>

                    <View style={styles.analysisNote}>
                        <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                        <Text style={styles.noteText}>
                            {imageType === 'leaf'
                                ? isAnalyzing
                                    ? t('fertilizer.photo_preview.notes.leaf_analyzing')
                                    : t('fertilizer.photo_preview.notes.leaf_ready')
                                : t('fertilizer.photo_preview.notes.soil_enhanced')}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={styles.retakeButton}
                        onPress={handleRetakePhoto}
                        activeOpacity={0.8}
                    >
                        <View style={styles.retakeButtonContent}>
                            <Ionicons name="refresh" size={20} color="#6B7280" />
                            <Text style={styles.retakeButtonText}>{t('fertilizer.photo_preview.buttons.retake')}</Text>
                        </View>
                    </TouchableOpacity>

                    {imageType === 'leaf' ? (
                        <View style={styles.leafAnalysisButtons}>
                            <TouchableOpacity
                                style={[styles.continueButton, isAnalyzing && styles.continueButtonDisabled]}
                                onPress={handleContinue}
                                activeOpacity={0.8}
                                disabled={isAnalyzing}
                            >
                                <LinearGradient
                                    colors={isAnalyzing ? ['#9CA3AF', '#6B7280'] : ['#4CAF50', '#45A049']}
                                    style={styles.continueButtonGradient}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                            <Text style={styles.continueButtonText}>
                                                {t('fertilizer.photo_preview.buttons.analyzing')}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.continueButtonText}>
                                                {t('fertilizer.photo_preview.buttons.get_ml_recommendations')}
                                            </Text>
                                            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.addSoilButton}
                                onPress={handleAddSoilAnalysis}
                                activeOpacity={0.8}
                            >
                                <View style={styles.addSoilButtonContent}>
                                    <Ionicons name="add-circle-outline" size={20} color="#8B7355" />
                                    <Text style={styles.addSoilButtonText}>{t('fertilizer.photo_preview.buttons.add_soil')}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={handleContinue}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#8B7355', '#7A5F47']}
                                style={styles.continueButtonGradient}
                            >
                                <Text style={styles.continueButtonText}>
                                    {t('fertilizer.photo_preview.buttons.get_enhanced')}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Plant Age Selector Modal */}
                <PlantAgeSelector
                    visible={showAgeSelectorModal}
                    onClose={() => setShowAgeSelectorModal(false)}
                    onConfirm={handleAgeConfirm}
                />
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
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    progressContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    photoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 32,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    photoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    photoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    photoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    imageContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    imageOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    imageQualityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    imageQualityText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
    },
    analysisSection: {
        marginBottom: 32,
    },
    analysisTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    analysisTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    aiProcessingBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    aiProcessingText: {
        fontSize: 12,
        color: '#D97706',
        fontWeight: '600',
    },
    mlProgressContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    mlProgressText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
        textAlign: 'center',
    },
    issuesContainer: {
        gap: 12,
        marginBottom: 16,
    },
    issueCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    issueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    issueIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    issueContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    issueText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
        flex: 1,
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 12,
    },
    severityText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    analysisNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    noteText: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
        flex: 1,
    },
    actionButtonsContainer: {
        gap: 16,
        marginBottom: 24,
    },
    retakeButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    retakeButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    retakeButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
    },
    continueButton: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonDisabled: {
        opacity: 0.7,
    },
    continueButtonGradient: {
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    leafAnalysisButtons: {
        gap: 12,
    },
    addSoilButton: {
        backgroundColor: '#8B735508', // Light soil-colored background
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#8B7355',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    addSoilButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 10,
    },
    addSoilButtonText: {
        fontSize: 15,
        color: '#8B7355',
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
    },
});

export default PhotoPreview;
