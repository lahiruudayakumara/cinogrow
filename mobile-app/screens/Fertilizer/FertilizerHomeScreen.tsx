import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// 1. UPDATED INTERFACE: More explicit and real-world navigation parameters
export type FertilizerStackParamList = {
    // FertilizerHome now accepts optional parameters for image updates
    FertilizerHome: {
        leafImage?: string; // Optional path/URI of the uploaded leaf image
        soilImage?: string; // Optional path/URI of the uploaded soil image
    } | undefined;
    FertilizerUploadLeaf: {
        soilImage?: string; // Optionally pass soil image if leaf is uploaded second
    } | undefined;
    FertilizerUploadSoil: {
        leafImage?: string; // Optionally pass leaf image if soil is uploaded second
    } | undefined;
    // New screen parameter to pass analysis results
    FertilizerResult: {
        leafImage: string;
        soilImage: string;
        analysisId?: string; // ID to fetch full report if results are saved on a server
    };
    FertilizerRecommendationDetail: {
        recommendationId: string; // ID to fetch and display the full historical recommendation report
    };
};

type FertilizerHomeScreenNavigationProp = StackNavigationProp<
    FertilizerStackParamList,
    'FertilizerHome'
>;

type FertilizerHomeScreenRouteProp = RouteProp<FertilizerStackParamList, 'FertilizerHome'>;

interface FertilizerHomeScreenProps {
    navigation: FertilizerHomeScreenNavigationProp;
    route: FertilizerHomeScreenRouteProp;
}

// 2. UPDATED INTERFACE: More detailed data for a recommendation item
interface RecommendationItem {
    id: string; // Unique ID for the historical record
    analysisId: string; // ID linking this to a full analysis report
    type: 'Leaf Analysis' | 'Soil Analysis' | 'Combined Analysis'; // The type of analysis performed
    date: string; // Date of the analysis (e.g., 'YYYY-MM-DD')
    severity: 'Low' | 'Moderate' | 'High' | 'Critical'; // Severity of the main issue
    description: string; // Short summary for the home screen list
    recommendedAction: string; // Key takeaway/immediate step (e.g., 'Apply Urea')
}

const Fertilizer: React.FC<FertilizerHomeScreenProps> = ({ navigation, route }) => {
    const [leafImage, setLeafImage] = useState<string | null>(null);
    const [soilImage, setSoilImage] = useState<string | null>(null);

    // Update state when returning from other screens
    useEffect(() => {
        if (route.params?.leafImage) {
            setLeafImage(route.params.leafImage);
        }
        if (route.params?.soilImage) {
            setSoilImage(route.params.soilImage);
        }
    }, [route.params]);

    // UPDATED: Sample data to match the new RecommendationItem interface
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
        // Navigate to upload leaf screen
        navigation.navigate('FertilizerUploadLeaf');
    };

    const handleUploadSoilSample = () => {
        // Navigate to upload soil screen, passing leafImage for continuity
        navigation.navigate('FertilizerUploadSoil', {
            leafImage: leafImage || undefined
        });
    };

    const handleGetRecommendations = () => {
        // Navigate to fertilizer result screen if both images are uploaded
        if (leafImage && soilImage) {
            navigation.navigate('FertilizerResult', {
                leafImage,
                soilImage,
                // In a real app, you'd trigger the API call here and navigate to a loading screen
            });
        } else {
            // Navigate to upload the missing sample
            if (!leafImage && !soilImage) {
                navigation.navigate('FertilizerUploadLeaf');
            } else if (!leafImage) {
                navigation.navigate('FertilizerUploadLeaf');
            } else if (!soilImage) {
                // Pass the existing leaf image to the soil upload screen
                navigation.navigate('FertilizerUploadSoil', { leafImage: leafImage || undefined });
            }
        }
    };

    const handleRecommendationPress = (item: RecommendationItem) => {
        // Navigate to a detail screen using the unique ID
        navigation.navigate('FertilizerRecommendationDetail', {
            recommendationId: item.analysisId
        });
    };

    const renderUploadCard = (
        icon: string,
        title: string,
        subtitle: string,
        onPress: () => void,
        backgroundColor: string,
        iconColor: string,
        isCompleted: boolean, // Added a property to show status
    ) => (
        <TouchableOpacity
            style={[styles.uploadCard, { backgroundColor }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
                <Ionicons
                    name={isCompleted ? 'checkmark-circle' as any : icon as any}
                    size={isCompleted ? 40 : 32}
                    color="white"
                />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>
                {isCompleted ? 'Sample Uploaded ✔️' : subtitle}
            </Text>
        </TouchableOpacity>
    );

    const renderRecommendationCard = (item: RecommendationItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.recommendationCard}
            onPress={() => handleRecommendationPress(item)}
            activeOpacity={0.7}
        >
            <View style={[
                styles.severityIndicator,
                item.severity === 'High' && { backgroundColor: '#FF6F61' }, // Red for High
                item.severity === 'Moderate' && { backgroundColor: '#FFB74D' }, // Orange for Moderate
                item.severity === 'Critical' && { backgroundColor: '#D32F2F' }, // Dark Red for Critical
                item.severity === 'Low' && { backgroundColor: '#81C784' }, // Green for Low
            ]} />
            <View style={styles.recommendationContent}>
                <Text style={styles.recommendationType}>{item.type}</Text>
                <Text style={styles.recommendationDate}>
                    {item.date} | Action: {item.recommendedAction}
                </Text>
                <Text style={styles.recommendationDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#8B7355" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Text style={styles.header}>Fertilizer Recommendations</Text>

                {/* Upload Cards */}
                <View style={styles.uploadSection}>
                    <View style={styles.uploadRow}>
                        {renderUploadCard(
                            'leaf-outline',
                            'Upload Leaf Sample',
                            'Analyze plant health',
                            handleUploadLeafSample,
                            leafImage ? '#DCEAD8' : '#E8F5E8', // Different color when completed
                            leafImage ? '#2E7D32' : '#4CAF50', // Different icon color when completed
                            !!leafImage // Pass completion status
                        )}
                        {renderUploadCard(
                            'earth-outline',
                            'Upload Soil Sample',
                            'Test soil conditions',
                            handleUploadSoilSample,
                            soilImage ? '#F0EAD6' : '#F0E6D6', // Different color when completed
                            soilImage ? '#6D4C41' : '#8B7355', // Different icon color when completed
                            !!soilImage // Pass completion status
                        )}
                    </View>

                    {/* Get Recommendations Button */}
                    <TouchableOpacity
                        style={[
                            styles.recommendationsButton,
                            (leafImage && soilImage) ? styles.recommendationsButtonActive : styles.recommendationsButtonInactive
                        ]}
                        onPress={handleGetRecommendations}
                        activeOpacity={0.8}
                        disabled={!leafImage || !soilImage} // Disable if samples are missing
                    >
                        <Text style={styles.recommendationsButtonText}>
                            {leafImage && soilImage
                                ? 'Get Complete Fertilizer Recommendations'
                                : !leafImage && !soilImage
                                    ? 'Start with Leaf Sample'
                                    : !leafImage
                                        ? 'Upload Leaf Sample to Continue'
                                        : 'Upload Soil Sample to Continue'
                            }
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Recommendations */}
                <View style={styles.recentSection}>
                    <Text style={styles.sectionHeader}>Recent Recommendations</Text>

                    {recentRecommendations.map((item) => renderRecommendationCard(item))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        fontSize: 28,
        fontWeight: '600',
        color: '#4CAF50',
        marginTop: 20,
        marginBottom: 30,
    },
    uploadSection: {
        marginBottom: 40,
    },
    uploadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    uploadCard: {
        flex: 1,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginHorizontal: 5,
        minHeight: 140,
        justifyContent: 'center',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        textAlign: 'center',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
    },
    recommendationsButton: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    recommendationsButtonActive: {
        backgroundColor: '#2E7D32', // Darker green when active
    },
    recommendationsButtonInactive: {
        backgroundColor: '#A5D6A7', // Lighter green/grey when inactive
    },
    recommendationsButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    recentSection: {
        marginBottom: 40,
    },
    sectionHeader: {
        fontSize: 24,
        fontWeight: '600',
        color: '#4CAF50',
        marginBottom: 20,
    },
    recommendationCard: {
        backgroundColor: '#FEFEFE',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    severityIndicator: {
        width: 8,
        height: '100%',
        borderRadius: 4,
        marginRight: 10,
    },
    recommendationContent: {
        flex: 1,
    },
    recommendationType: {
        fontSize: 17,
        fontWeight: '700', // Made bold for impact
        color: '#4CAF50', // Changed type color to primary green
        marginBottom: 4,
    },
    recommendationDate: {
        fontSize: 13,
        color: '#8B7355', // Used the soil color for action line
        fontWeight: '600',
        marginBottom: 6,
    },
    recommendationDescription: {
        fontSize: 14,
        color: '#333333',
        lineHeight: 18,
    },
});

export default Fertilizer;