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
import { FertilizerAnalysisResponse } from '../../services/fertilizerAPI';

type FertilizerResultScreenNavigationProp = StackNavigationProp<
    FertilizerStackParamList,
    'FertilizerResult'
>;

type FertilizerResultScreenRouteProp = RouteProp<FertilizerStackParamList, 'FertilizerResult'>;

interface FertilizerResultScreenProps {
    navigation: FertilizerResultScreenNavigationProp;
    route: FertilizerResultScreenRouteProp;
}

interface DetectedIssue {
    id: string;
    type: 'leaf' | 'soil';
    issue: string;
    severity: 'Low' | 'Moderate' | 'High' | 'Critical';
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}

interface Recommendation {
    id: string;
    category: string;
    title: string;
    items: string[];
    application: string;
    timing: string;
    priority: 'High' | 'Medium' | 'Low';
}

const FertilizerResultScreen: React.FC<FertilizerResultScreenProps> = ({
    navigation,
    route,
}) => {
    const { leafImage, soilImage, analysisType = 'leaf-only', mlAnalysis } = route.params;
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'issues' | 'recommendations' | 'schedule'>('issues');
    const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    // Use ML analysis data if available, otherwise fallback to hardcoded data
    useEffect(() => {
        console.log('🎯 FertilizerResultScreen: Received route params:', {
            hasLeafImage: !!leafImage,
            hasSoilImage: !!soilImage,
            analysisType,
            hasMlAnalysis: !!mlAnalysis,
            mlAnalysisKeys: mlAnalysis ? Object.keys(mlAnalysis) : [],
            detectedIssuesCount: mlAnalysis?.detected_issues?.length || 0,
            recommendationsCount: mlAnalysis?.recommendations?.length || 0
        });

        if (mlAnalysis) {
            console.log('📊 Using real ML analysis data:', mlAnalysis);
            console.log('📊 Detailed ML analysis structure:', {
                predicted_deficiency: mlAnalysis.predicted_deficiency,
                confidence: mlAnalysis.confidence,
                severity: mlAnalysis.severity,
                detected_issues: mlAnalysis.detected_issues,
                recommendations: mlAnalysis.recommendations
            });

            // Convert ML analysis issues to display format
            const mlIssues: DetectedIssue[] = mlAnalysis.detected_issues.map((issue, index) => ({
                id: (index + 1).toString(),
                type: issue.type,
                issue: issue.issue,
                severity: issue.severity,
                description: issue.description,
                icon: issue.icon as keyof typeof Ionicons.glyphMap
            }));

            console.log('📊 Converted ML issues for display:', mlIssues);

            setDetectedIssues(mlIssues);
            setRecommendations(mlAnalysis.recommendations);
        } else {
            // Fallback to hardcoded data
            console.log('📝 Using fallback hardcoded data');
            setDetectedIssues(getHardcodedIssues());
            setRecommendations(getHardcodedRecommendations());
        }
    }, [mlAnalysis, analysisType]);

    const getHardcodedIssues = (): DetectedIssue[] => {
        const hardcodedIssues: DetectedIssue[] = [
            {
                id: '1',
                type: 'leaf',
                issue: 'Nitrogen Deficiency',
                severity: 'Moderate',
                description: 'Yellowing of older leaves, reduced growth rate, and pale green coloration.',
                icon: 'leaf-outline'
            },
            {
                id: '2',
                type: 'leaf',
                issue: 'Early Leaf Spot',
                severity: 'Low',
                description: 'Small brown spots on leaf surface, fungal infection in early stage.',
                icon: 'warning-outline'
            },
            {
                id: '3',
                type: 'soil',
                issue: 'Low Soil pH',
                severity: 'High',
                description: 'Acidic soil conditions (pH 4.5) affecting nutrient availability.',
                icon: 'flask-outline'
            }
        ];

        // Filter issues based on analysis type
        return analysisType === 'leaf-only'
            ? hardcodedIssues.filter(issue => issue.type === 'leaf')
            : hardcodedIssues;
    };

    const getHardcodedRecommendations = (): Recommendation[] => {
        return [
            {
                id: '1',
                category: 'Basic NPK Treatment',
                title: 'Leaf-based NPK Recommendation',
                items: [
                    'NPK 15-15-15 at 150kg/ha',
                    'Foliar spray NPK 19-19-19 at 2g/L',
                    'Potassium sulphate 50kg/ha'
                ],
                application: 'Apply around base of plants and foliar spray on leaves',
                timing: 'Monthly application for 3 months',
                priority: 'High'
            },
            {
                id: '2',
                category: 'Organic Support',
                title: 'Natural Fertilizer Enhancement',
                items: [
                    'Compost 2-3 kg per plant',
                    'Bone meal 100g per plant',
                    'Vermicompost 1kg per plant'
                ],
                application: 'Mix into soil around the root zone',
                timing: 'Apply every 2 months',
                priority: 'Medium'
            }
        ];
    };

    // Helper functions for rendering



    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Critical': return '#DC2626';
            case 'High': return '#EA580C';
            case 'Moderate': return '#D97706';
            case 'Low': return '#16A34A';
            default: return '#6B7280';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return '#DC2626';
            case 'Medium': return '#D97706';
            case 'Low': return '#16A34A';
            default: return '#6B7280';
        }
    };

    const renderTabButton = (tab: typeof activeTab, title: string, icon: keyof typeof Ionicons.glyphMap) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
        >
            <Ionicons
                name={icon}
                size={20}
                color={activeTab === tab ? '#FFFFFF' : '#6B7280'}
            />
            <Text style={[
                styles.tabButtonText,
                activeTab === tab && styles.tabButtonTextActive
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    const renderIssuesTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.summaryCard}>
                <LinearGradient
                    colors={['#FEF3C7', '#FDE68A']}
                    style={styles.summaryGradient}
                >
                    <View style={styles.summaryHeader}>
                        <Ionicons name="warning" size={24} color="#D97706" />
                        <Text style={styles.summaryTitle}>Analysis Summary</Text>
                    </View>
                    <Text style={styles.summaryText}>
                        {analysisType === 'leaf-only'
                            ? `Found ${detectedIssues.length} leaf issues. Basic recommendations provided. Add soil analysis for comprehensive results.`
                            : `Found ${detectedIssues.length} issues requiring attention. Comprehensive analysis with soil pH correction included.`
                        }
                    </Text>
                </LinearGradient>
            </View>

            {detectedIssues.map((issue: DetectedIssue) => (
                <View key={issue.id} style={styles.issueCard}>
                    <View style={styles.issueHeader}>
                        <View style={styles.issueTypeContainer}>
                            <LinearGradient
                                colors={issue.type === 'leaf' ? ['#4CAF50', '#45A049'] : ['#8B7355', '#7A5F47']}
                                style={styles.issueTypeGradient}
                            >
                                <Ionicons
                                    name={issue.type === 'leaf' ? 'leaf' : 'earth'}
                                    size={16}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.issueTypeText}>
                                    {issue.type === 'leaf' ? 'Leaf' : 'Soil'} Analysis
                                </Text>
                            </LinearGradient>
                        </View>
                        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(issue.severity) }]}>
                            <Text style={styles.severityText}>{issue.severity}</Text>
                        </View>
                    </View>

                    <View style={styles.issueContent}>
                        <View style={styles.issueIconContainer}>
                            <Ionicons name={issue.icon} size={20} color={getSeverityColor(issue.severity)} />
                        </View>
                        <View style={styles.issueTextContainer}>
                            <Text style={styles.issueTitle}>{issue.issue}</Text>
                            <Text style={styles.issueDescription}>{issue.description}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderRecommendationsTab = () => (
        <View style={styles.tabContent}>
            {recommendations.map(rec => (
                <View key={rec.id} style={styles.recommendationCard}>
                    <View style={styles.recommendationHeader}>
                        <Text style={styles.recommendationCategory}>{rec.category}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                            <Text style={styles.priorityText}>{rec.priority} Priority</Text>
                        </View>
                    </View>

                    <Text style={styles.recommendationTitle}>{rec.title}</Text>

                    <View style={styles.recommendationItems}>
                        {rec.items.map((item, index) => (
                            <View key={index} style={styles.recommendationItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                <Text style={styles.recommendationItemText}>{item}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.recommendationDetails}>
                        <View style={styles.detailRow}>
                            <Ionicons name="settings-outline" size={16} color="#6B7280" />
                            <Text style={styles.detailLabel}>Application:</Text>
                            <Text style={styles.detailText}>{rec.application}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="time-outline" size={16} color="#6B7280" />
                            <Text style={styles.detailLabel}>Timing:</Text>
                            <Text style={styles.detailText}>{rec.timing}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderScheduleTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.scheduleCard}>
                <LinearGradient
                    colors={['#F0F9FF', '#E0F2FE']}
                    style={styles.scheduleGradient}
                >
                    <View style={styles.scheduleHeader}>
                        <Ionicons name="calendar" size={24} color="#0284C7" />
                        <Text style={styles.scheduleTitle}>Implementation Schedule</Text>
                    </View>

                    <View style={styles.scheduleTimeline}>
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineMarker}>
                                <Text style={styles.timelineNumber}>1</Text>
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Week 1: Soil pH Correction</Text>
                                <Text style={styles.timelineDescription}>Apply dolomitic lime and incorporate into soil</Text>
                            </View>
                        </View>

                        <View style={styles.timelineItem}>
                            <View style={styles.timelineMarker}>
                                <Text style={styles.timelineNumber}>2</Text>
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Week 3: Organic Amendment</Text>
                                <Text style={styles.timelineDescription}>Apply compost and organic matter</Text>
                            </View>
                        </View>

                        <View style={styles.timelineItem}>
                            <View style={styles.timelineMarker}>
                                <Text style={styles.timelineNumber}>3</Text>
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Week 5: Fertilizer Application</Text>
                                <Text style={styles.timelineDescription}>Apply NPK and specialized fertilizers</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </View>
    );

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
                    <Text style={styles.headerTitle}>Analysis Results</Text>
                    <Text style={styles.headerSubtitle}>
                        {analysisType === 'leaf-only'
                            ? 'AI analysis based on leaf sample. Add soil sample for enhanced results.'
                            : 'Comprehensive AI analysis of your cinnamon crop samples'
                        }
                    </Text>

                    {/* ML Analysis Status */}
                    <View style={styles.analysisStatusContainer}>
                        <View style={[styles.analysisStatusBadge, {
                            backgroundColor: mlAnalysis ? '#E7F5E7' : '#FEF3C7'
                        }]}>
                            <Ionicons
                                name={mlAnalysis ? 'checkmark-circle' : 'information-circle'}
                                size={16}
                                color={mlAnalysis ? '#4CAF50' : '#D97706'}
                            />
                            <Text style={[styles.analysisStatusText, {
                                color: mlAnalysis ? '#4CAF50' : '#D97706'
                            }]}>
                                {mlAnalysis
                                    ? mlAnalysis.confidence
                                        ? `Real ML Analysis • ${mlAnalysis.confidence.toFixed(1)}% confidence`
                                        : 'Quick Analysis • No confidence score'
                                    : 'Using fallback recommendations'
                                }
                            </Text>
                        </View>
                        {mlAnalysis && (
                            <Text style={styles.modelVersionText}>
                                Model: {mlAnalysis.model_version} • Processed in {mlAnalysis.processing_time.toFixed(2)}s
                            </Text>
                        )}
                    </View>
                </View>

                {/* Sample Images */}
                <View style={styles.samplesContainer}>
                    <Text style={styles.samplesTitle}>Analyzed Samples</Text>
                    <View style={styles.samplesRow}>
                        <View style={styles.sampleCard}>
                            <LinearGradient
                                colors={['#F0F9FF', '#E0F2FE']}
                                style={styles.sampleGradient}
                            >
                                <Text style={styles.sampleLabel}>Leaf Sample</Text>
                                <Image source={{ uri: leafImage }} style={styles.sampleImage} />
                            </LinearGradient>
                        </View>

                        {analysisType === 'comprehensive' && soilImage ? (
                            <View style={styles.sampleCard}>
                                <LinearGradient
                                    colors={['#FEF7ED', '#FED7AA']}
                                    style={styles.sampleGradient}
                                >
                                    <Text style={styles.sampleLabel}>Soil Sample</Text>
                                    <Image source={{ uri: soilImage }} style={styles.sampleImage} />
                                </LinearGradient>
                            </View>
                        ) : (
                            <View style={styles.sampleCard}>
                                <LinearGradient
                                    colors={['#FEF7ED', '#FED7AA']}
                                    style={styles.sampleGradient}
                                >
                                    <Text style={styles.sampleLabel}>Add Soil Sample</Text>
                                    <TouchableOpacity
                                        style={styles.addSoilImageArea}
                                        onPress={() => navigation.navigate('FertilizerUploadSoil', {
                                            leafImage,
                                            fromLeaf: true
                                        })}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="add" size={32} color="#8B7355" />
                                        <Text style={styles.addSoilText}>Tap to Upload</Text>
                                    </TouchableOpacity>
                                </LinearGradient>
                            </View>
                        )}
                    </View>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    {renderTabButton('issues', 'Issues', 'warning-outline')}
                    {renderTabButton('recommendations', 'Solutions', 'flask-outline')}
                    {renderTabButton('schedule', 'Schedule', 'calendar-outline')}
                </View>

                {/* Tab Content */}
                {activeTab === 'issues' && renderIssuesTab()}
                {activeTab === 'recommendations' && renderRecommendationsTab()}
                {activeTab === 'schedule' && renderScheduleTab()}
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
    samplesContainer: {
        marginBottom: 32,
    },
    samplesTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
        marginLeft: 4,
    },
    samplesRow: {
        flexDirection: 'row',
        gap: 16,
    },
    sampleCard: {
        flex: 1,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    sampleGradient: {
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    sampleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    sampleImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    addSoilImageArea: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 115, 85, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#8B7355',
        borderStyle: 'dashed',
    },
    addSoilText: {
        fontSize: 10,
        color: '#8B7355',
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 6,
    },
    tabButtonActive: {
        backgroundColor: '#4CAF50',
    },
    tabButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    tabButtonTextActive: {
        color: '#FFFFFF',
    },
    tabContent: {
        gap: 16,
        marginBottom: 32,
    },
    summaryCard: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryGradient: {
        borderRadius: 16,
        padding: 20,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    summaryText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    issueCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    issueTypeContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    issueTypeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    issueTypeText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    severityText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    issueContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    issueIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    issueTextContainer: {
        flex: 1,
    },
    issueTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    issueDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    recommendationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    recommendationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    recommendationCategory: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    recommendationTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    recommendationItems: {
        gap: 8,
        marginBottom: 16,
    },
    recommendationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recommendationItemText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    recommendationDetails: {
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    detailLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        minWidth: 80,
    },
    detailText: {
        fontSize: 13,
        color: '#374151',
        flex: 1,
        lineHeight: 18,
    },
    scheduleCard: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    scheduleGradient: {
        borderRadius: 16,
        padding: 20,
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
    },
    scheduleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    scheduleTimeline: {
        gap: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    timelineMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    timelineNumber: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    timelineContent: {
        flex: 1,
    },
    timelineTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    timelineDescription: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    enhanceAnalysisCard: {
        backgroundColor: '#FEFBF7',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#8B7355',
        borderStyle: 'solid',
        height: 100,
        shadowColor: '#8B7355',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    enhanceTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#8B7355',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    enhanceSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    enhanceButton: {
        backgroundColor: '#8B7355',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        width: 120,
        height: 50,
        alignSelf: 'center',
    },
    enhanceButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    enhanceButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    benefitsContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#8B735530',
    },
    benefitsText: {
        fontSize: 12,
        color: '#8B7355',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 16,
    },
    // ML Analysis Status styles
    analysisStatusContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    analysisStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        gap: 8,
        marginBottom: 8,
    },
    analysisStatusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modelVersionText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
});

export default FertilizerResultScreen;
