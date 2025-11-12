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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { FertilizerStackParamList } from '../../navigation/FertilizerNavigator';

type FertilizerHomeScreenNavigationProp = StackNavigationProp<
    FertilizerStackParamList,
    'FertilizerHome'
>;

type FertilizerHomeScreenRouteProp = RouteProp<FertilizerStackParamList, 'FertilizerHome'>;

interface FertilizerHomeScreenProps {
    navigation: FertilizerHomeScreenNavigationProp;
    route: FertilizerHomeScreenRouteProp;
}

interface RecommendationItem {
    id: string;
    analysisId: string;
    type: 'Leaf Analysis' | 'Soil Analysis' | 'Combined Analysis';
    date: string;
    severity: 'Low' | 'Moderate' | 'High' | 'Critical';
    description: string;
    recommendedAction: string;
}

const Fertilizer: React.FC<FertilizerHomeScreenProps> = ({ navigation, route }) => {
    const [leafImage, setLeafImage] = useState<string | null>(null);
    const [soilImage, setSoilImage] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);

    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (route.params?.leafImage) {
            setLeafImage(route.params.leafImage);
        }
        if (route.params?.soilImage) {
            setSoilImage(route.params.soilImage);
        }
    }, [route.params]);

    const recentRecommendations: RecommendationItem[] = [
        {
            id: '1',
            analysisId: 'A-20250110-001',
            type: 'Combined Analysis',
            date: '2025-01-10',
            severity: 'Moderate',
            recommendedAction: 'Apply 15-5-10 NPK mix.',
            description: 'Moderate nitrogen deficiency detected with early signs of leaf spot disease.',
        },
        {
            id: '2',
            analysisId: 'A-20241225-002',
            type: 'Soil Analysis',
            date: '2024-12-25',
            severity: 'High',
            recommendedAction: 'Lime application required.',
            description: 'High soil acidity (pH 4.5) with low phosphorus levels.',
        },
    ];

    const handleUploadLeafSample = () => {
        navigation.navigate('FertilizerUploadLeaf');
    };

    const handleUploadSoilSample = () => {
        navigation.navigate('FertilizerUploadSoil', {
            leafImage: leafImage || undefined
        });
    };

    const handleGetRecommendations = () => {
        if (leafImage && soilImage) {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
                setLoading(false);
                navigation.navigate('FertilizerResult', {
                    leafImage,
                    soilImage,
                });
            }, 1500);
        } else {
            if (!leafImage && !soilImage) {
                navigation.navigate('FertilizerUploadLeaf');
            } else if (!leafImage) {
                navigation.navigate('FertilizerUploadLeaf');
            } else if (!soilImage) {
                navigation.navigate('FertilizerUploadSoil', {
                    leafImage: leafImage || undefined
                });
            }
        }
    };

    const handleRecommendationPress = (item: RecommendationItem) => {
        console.log('Recommendation pressed:', item.id);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
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
                            <Text style={styles.completedText}>Uploaded</Text>
                        </View>
                    </View>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderRecommendationCard = (item: RecommendationItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.recommendationCard}
            onPress={() => handleRecommendationPress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.recommendationHeader}>
                <View style={styles.recommendationTitleRow}>
                    <Text style={styles.recommendationType}>{item.type}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                        <Text style={styles.severityText}>{item.severity}</Text>
                    </View>
                </View>
                <Text style={styles.recommendationDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>

            <Text style={styles.recommendationDescription} numberOfLines={2}>
                {item.description}
            </Text>

            <View style={styles.actionRow}>
                <View style={styles.actionContent}>
                    <Ionicons name="flash" size={16} color="#4CAF50" style={styles.actionIcon} />
                    <Text style={styles.actionText}>{item.recommendedAction}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
    );

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
                        <Text style={styles.title}>Fertilizer Analysis</Text>
                        <Text style={styles.subtitle}>
                            Get AI-powered fertilizer recommendations for your cinnamon crops
                        </Text>
                    </View>

                    {/* Quick Start Instructions */}
                    {!leafImage && !soilImage && (
                        <View style={styles.instructionCard}>
                            <View style={styles.instructionHeader}>
                                <Ionicons name="information-circle" size={20} color="#4CAF50" />
                                <Text style={styles.instructionTitle}>Quick Start Guide</Text>
                            </View>
                            <Text style={styles.instructionText}>
                                1. Start with a <Text style={styles.highlightText}>leaf sample</Text> for instant recommendations{'\n'}
                                2. Optionally add a <Text style={styles.highlightText}>soil sample</Text> for enhanced results{'\n'}
                                3. Get personalized fertilizer advice in seconds
                            </Text>
                        </View>
                    )}
                </View>

                {/* Upload Section */}
                <View style={styles.uploadSection}>
                    <Text style={styles.sectionTitle}>Sample Analysis</Text>

                    <View style={styles.uploadRow}>
                        {renderUploadCard(
                            'leaf-outline',
                            'Leaf Sample',
                            'Detect nutrient deficiencies',
                            handleUploadLeafSample,
                            ['#4CAF50', '#45A049'],
                            !!leafImage
                        )}
                        {renderUploadCard(
                            'earth-outline',
                            'Soil Sample',
                            'Analyze soil conditions',
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
                            {leafImage && soilImage ? 'Ready for Analysis' :
                                leafImage || soilImage ? '1 of 2 samples uploaded' : 'Upload samples to begin analysis'}
                        </Text>
                    </View>
                </View>

                {/* Recent Analysis Section */}
                <View style={styles.recentSection}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons name="time-outline" size={20} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>Recent Analysis</Text>
                        </View>
                        <TouchableOpacity style={styles.viewAllButton}>
                            <Text style={styles.viewAllText}>View All</Text>
                            <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
                        </TouchableOpacity>
                    </View>

                    {recentRecommendations.length > 0 && (
                        recentRecommendations.map((item) => renderRecommendationCard(item))
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
});

export default Fertilizer;
