import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Platform,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
    fetchFertilizerHistory,
    formatAnalysisDate,
    getSeverityColor,
    formatConfidence,
    FertilizerHistoryRecord,
} from '../../../services/fertilizerHistoryService';
import { FertilizerHomeParams } from '../../fertilizer/types';

const Fertilizer: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<FertilizerHomeParams>();
    const { t } = useTranslation();
    const [leafImage, setLeafImage] = useState<string | null>(null);
    const [soilImage, setSoilImage] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [recentAnalyses, setRecentAnalyses] = useState<FertilizerHistoryRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (params?.leafImage) {
            setLeafImage(params.leafImage);
        }
        if (params?.soilImage) {
            setSoilImage(params.soilImage);
        }
    }, [params?.leafImage, params?.soilImage]);

    // Load recent fertilizer history
    useEffect(() => {
        loadRecentAnalyses();
    }, []);

    const loadRecentAnalyses = async () => {
        try {
            setLoadingHistory(true);
            const data = await fetchFertilizerHistory(0, 5); // Get 5 most recent
            setRecentAnalyses(data);
        } catch (error) {
            console.error('Failed to load recent analyses:', error);
            // Silently fail - don't show error to user
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUploadLeafSample = () => {
        router.push('/fertilizer/upload-leaf');
    };

    const handleUploadSoilSample = () => {
        router.push({
            pathname: '/fertilizer/upload-soil',
            params: { leafImage: leafImage || undefined }
        });
    };

    const handleGetRecommendations = () => {
        if (leafImage && soilImage) {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
                setLoading(false);
                router.push({
                    pathname: '/fertilizer/result',
                    params: { leafImage, soilImage }
                });
            }, 1500);
        } else {
            if (!leafImage && !soilImage) {
                router.push('/fertilizer/upload-leaf');
            } else if (!leafImage) {
                router.push('/fertilizer/upload-leaf');
            } else if (!soilImage) {
                router.push({
                    pathname: '/fertilizer/upload-soil',
                    params: { leafImage: leafImage || undefined }
                });
            }
        }
    };

    const handleHistoryPress = (item: FertilizerHistoryRecord) => {
        // Navigate to result screen with history data
        router.push({
            pathname: '/fertilizer/result',
            params: {
                roboflowAnalysis: JSON.stringify({
                    success: true,
                    primary_deficiency: item.primary_deficiency,
                    confidence: item.confidence,
                    severity: item.severity,
                    plant_age: item.plant_age,
                    recommendations: item.recommendations,
                    history_id: item.id,
                    detections: [{
                        class: item.primary_deficiency || 'Unknown',
                        confidence: item.confidence || 0,
                        deficiency: item.primary_deficiency || 'Unknown',
                        severity: item.severity || 'Low'
                    }],
                    roboflow_output: [{
                        predictions: {
                            predictions: [{
                                class: item.primary_deficiency || 'Unknown',
                                confidence: item.confidence || 0
                            }]
                        }
                    }]
                }),
                plantAge: item.plant_age || 1,
            }
        });
    };

    const handleViewAllHistory = () => {
        // Navigate to full history screen
        // navigation.navigate('FertilizerHistory');
        console.log('View all history');
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRecentAnalyses();
        setRefreshing(false);
    };

    const renderUploadCard = (
        iconName: keyof typeof Ionicons.glyphMap,
        title: string,
        subtitle: string,
        onPress: () => void,
        gradientColors: [string, string],
        isCompleted?: boolean
    ) => (
        <TouchableOpacity
            style={styles.uploadCard}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={gradientColors}
                style={styles.uploadCardGradient}
            >
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={isCompleted ? "checkmark-circle" : iconName}
                        size={32}
                        color="#FFFFFF"
                    />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
                {isCompleted && (
                    <View style={styles.completedOverlay}>
                        <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                            <Text style={styles.completedText}>{t('fertilizer.home.uploaded')}</Text>
                        </View>
                    </View>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderHistoryCard = (item: FertilizerHistoryRecord) => {
        const severityColor = getSeverityColor(item.severity);
        const confidence = formatConfidence(item.confidence);
        const date = formatAnalysisDate(item.analyzed_at);

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.recommendationCard}
                onPress={() => handleHistoryPress(item)}
                activeOpacity={0.8}
            >
                <View style={styles.recommendationHeader}>
                    <View style={styles.recommendationTitleRow}>
                        <Text style={styles.recommendationType}>
                            {item.primary_deficiency || 'Unknown Deficiency'}
                        </Text>
                        {item.severity && (
                            <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                                <Text style={styles.severityText}>{item.severity}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.recommendationDate}>{date}</Text>
                </View>

                <View style={styles.actionRow}>
                    <View style={styles.actionContent}>
                        <Ionicons name="analytics-outline" size={16} color="#4CAF50" style={styles.actionIcon} />
                        <Text style={styles.actionText}>{t('fertilizer.home.confidence')}: {confidence}</Text>
                    </View>
                    {item.plant_age && (
                        <View style={styles.actionContent}>
                            <Ionicons name="leaf-outline" size={16} color="#4CAF50" style={styles.actionIcon} />
                            <Text style={styles.actionText}>{item.plant_age}yr</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{
                    paddingBottom: Platform.select({
                        ios: 100 + insets.bottom,
                        default: 80 + insets.bottom,
                    }),
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#4CAF50"
                        colors={["#4CAF50"]}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.welcomeSection}>
                        <Text style={styles.title}>{t('fertilizer.home.title')}</Text>
                        <Text style={styles.subtitle}>
                            {t('fertilizer.home.subtitle')}
                        </Text>
                    </View>

                    {/* Quick Start Instructions */}
                    {!leafImage && !soilImage && (
                        <View style={styles.instructionCard}>
                            <View style={styles.instructionHeader}>
                                <Ionicons name="information-circle" size={20} color="#4CAF50" />
                                <Text style={styles.instructionTitle}>{t('fertilizer.home.quick_start_guide')}</Text>
                            </View>
                            <Text style={styles.instructionText}>
                                1. {t('fertilizer.home.step_1')}{'\n'}
                                2. {t('fertilizer.home.step_2')}{'\n'}
                                3. {t('fertilizer.home.step_3')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Upload Section */}
                <View style={styles.uploadSection}>
                    <Text style={styles.sectionTitle}>{t('fertilizer.home.sample_analysis')}</Text>

                    <View style={styles.uploadRow}>
                        {renderUploadCard(
                            'leaf-outline',
                            t('fertilizer.home.leaf_sample'),
                            t('fertilizer.home.leaf_sample_subtitle'),
                            handleUploadLeafSample,
                            ['#4CAF50', '#45A049'],
                            !!leafImage
                        )}
                        {renderUploadCard(
                            'earth-outline',
                            t('fertilizer.home.soil_sample'),
                            t('fertilizer.home.soil_sample_subtitle'),
                            handleUploadSoilSample,
                            ['#8B7355', '#7A5F47'],
                            !!soilImage
                        )}
                    </View>

                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <LinearGradient
                                colors={['#4CAF50', '#45A049']}
                                style={[
                                    styles.progressFill,
                                    { width: `${(leafImage ? 50 : 0) + (soilImage ? 50 : 0)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {leafImage && soilImage ? t('fertilizer.home.ready_for_analysis') :
                                leafImage || soilImage ? t('fertilizer.home.samples_uploaded') : t('fertilizer.home.upload_to_begin')}
                        </Text>
                    </View>
                </View>

                {/* Recent Analysis Section */}
                <View style={styles.recentSection}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="time-outline" size={20} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>{t('fertilizer.home.recent_analysis')}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.viewAllButton}
                            onPress={handleViewAllHistory}
                        >
                            <Text style={styles.viewAllText}>{t('fertilizer.home.view_all')}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
                        </TouchableOpacity>
                    </View>

                    {loadingHistory ? (
                        <View style={styles.historyLoadingContainer}>
                            <ActivityIndicator size="small" color="#4CAF50" />
                            <Text style={styles.historyLoadingText}>{t('fertilizer.home.loading_analyses')}</Text>
                        </View>
                    ) : recentAnalyses.length > 0 ? (
                        recentAnalyses.map((item) => renderHistoryCard(item))
                    ) : (
                        <View style={styles.emptyHistoryContainer}>
                            <Ionicons name="flask-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyHistoryText}>{t('fertilizer.home.no_history')}</Text>
                            <Text style={styles.emptyHistorySubtext}>
                                {t('fertilizer.home.start_analyzing')}
                            </Text>
                        </View>
                    )}
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
        marginTop: 40,
        marginBottom: 32,
    },
    welcomeSection: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 22,
    },
    uploadSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
        marginLeft: 4,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    uploadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
    },
    uploadCard: {
        flex: 1,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    uploadCardGradient: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        minHeight: 140,
        justifyContent: 'center',
        position: 'relative',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    completedOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    completedText: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '600',
    },
    progressContainer: {
        marginBottom: 20,
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
    recentSection: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    recommendationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    recommendationHeader: {
        marginBottom: 12,
    },
    recommendationTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    recommendationType: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
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
    recommendationDate: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    recommendationDescription: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    actionIcon: {
        marginRight: 8,
    },
    actionText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
        flex: 1,
    },
    instructionCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        marginTop: 16,
    },
    instructionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    instructionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    instructionText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    highlightText: {
        fontWeight: '600',
        color: '#4CAF50',
    },
    historyLoadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    historyLoadingText: {
        fontSize: 14,
        color: '#6B7280',
    },
    emptyHistoryContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderStyle: 'dashed',
    },
    emptyHistoryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 4,
    },
    emptyHistorySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});

export default Fertilizer;
