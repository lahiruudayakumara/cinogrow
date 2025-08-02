import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface RecommendationItem {
    id: string;
    type: string;
    date: string;
    description: string;
}

const Fertilizer: React.FC = () => {
    const recentRecommendations: RecommendationItem[] = [
        {
            id: '1',
            type: 'Combined Analysis',
            date: '2025-01-10',
            description: 'Moderate nitrogen deficiency detected with early signs of leaf spot disease',
        },
        {
            id: '2',
            type: 'Combined Analysis',
            date: '2025-01-10',
            description: 'Moderate nitrogen deficiency detected with early signs of leaf spot disease',
        },
    ];

    const handleUploadLeafSample = () => {
        // Navigate to upload soil screen
        router.push('/upload-soil');
    };

    const handleUploadSoilSample = () => {
        // Handle soil sample upload
        console.log('Upload soil sample');
    };

    const handleGetRecommendations = () => {
        // Handle getting complete recommendations
        console.log('Get complete fertilizer recommendations');
    };

    const handleRecommendationPress = (item: RecommendationItem) => {
        // Handle recommendation item press
        console.log('Recommendation pressed:', item.id);
    };

    const renderUploadCard = (
        icon: string,
        title: string,
        subtitle: string,
        onPress: () => void,
        backgroundColor: string,
        iconColor: string,
    ) => (
        <TouchableOpacity
            style={[styles.uploadCard, { backgroundColor }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
                <Ionicons name={icon as any} size={32} color="white" />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </TouchableOpacity>
    );

    const renderRecommendationCard = (item: RecommendationItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.recommendationCard}
            onPress={() => handleRecommendationPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.recommendationContent}>
                <Text style={styles.recommendationType}>{item.type}</Text>
                <Text style={styles.recommendationDate}>{item.date}</Text>
                <Text style={styles.recommendationDescription}>{item.description}</Text>
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
                            '#E8F5E8',
                            '#4CAF50',
                        )}
                        {renderUploadCard(
                            'earth-outline',
                            'Upload Soil Sample',
                            'Test soil conditions',
                            handleUploadSoilSample,
                            '#F0E6D6',
                            '#8B7355',
                        )}
                    </View>

                    {/* Get Recommendations Button */}
                    <TouchableOpacity
                        style={styles.recommendationsButton}
                        onPress={handleGetRecommendations}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.recommendationsButtonText}>
                            Get Complete Fertilizer Recommendations
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
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
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
        padding: 20,
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
    recommendationContent: {
        flex: 1,
    },
    recommendationType: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8B7355',
        marginBottom: 4,
    },
    recommendationDate: {
        fontSize: 14,
        color: '#999999',
        marginBottom: 8,
    },
    recommendationDescription: {
        fontSize: 15,
        color: '#333333',
        lineHeight: 20,
    },
});

export default Fertilizer;