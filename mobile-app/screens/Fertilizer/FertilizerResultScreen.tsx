import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    SafeAreaView,
    Share,
} from 'react-native';
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

const FertilizerResultScreen: React.FC<FertilizerResultScreenProps> = ({
    navigation,
    route,
}) => {
    const { leafImage, soilImage } = route.params;

    const handleBackToHome = () => {
        navigation.navigate('FertilizerHome', {});
    };

    const handleShareResults = async () => {
        try {
            await Share.share({
                message: 'Agricultural Analysis Results:\n\nDetected Issues:\n• Nitrogen deficiency\n• Early leaf spot\n\nFertilizer Recommendations:\nNPK 20-10-10 at 200kg/ha + Urea 46% at 100kg/ha + TSP at 150kg/ha',
                title: 'Complete Agricultural Analysis',
            });
        } catch (error) {
            console.error('Error sharing results:', error);
        }
    };

    const WarningIcon = () => (
        <View style={styles.warningIcon}>
            <Text style={styles.warningText}>!</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Text style={styles.headerTitle}>Complete Agricultural Analysis</Text>

                {/* Sample Images */}
                <View style={styles.imagesContainer}>
                    <View style={styles.imageCard}>
                        <View style={styles.leafImageFrame}>
                            <Image
                                source={{ uri: leafImage }}
                                style={styles.sampleImage}
                                defaultSource={require('../../assets/images/icon.png')} // Add placeholder
                            />
                        </View>
                    </View>

                    <View style={styles.imageCard}>
                        <View style={styles.soilImageFrame}>
                            <Image
                                source={{ uri: soilImage }}
                                style={styles.sampleImage}
                                defaultSource={require('../../assets/images/icon.png')} // Add placeholder
                            />
                        </View>
                    </View>
                </View>

                {/* Detected Issues Card */}
                <View style={styles.issuesCard}>
                    <View style={styles.issuesHeader}>
                        <Text style={styles.issuesTitle}>Detected Issues</Text>
                        <WarningIcon />
                    </View>
                    <View style={styles.issuesList}>
                        <Text style={styles.issueItem}>Nitrogen deficiency</Text>
                        <Text style={styles.issueItem}>Early leaf spot</Text>
                    </View>
                </View>

                {/* Separator Line */}
                <View style={styles.separator} />

                {/* Fertilizer Recommendations */}
                <Text style={styles.sectionTitle}>Fertilizer Recommendations</Text>

                {/* Inorganic Fertilizers */}
                <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationType}>Inorganic Fertilizers</Text>
                    <Text style={styles.recommendationText}>
                        NPK 20-10-10 at 200kg/ha + Urea 46% at 100kg/ha + TSP at 150kg/ha
                    </Text>
                </View>

                {/* Organic Fertilizers */}
                <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationType}>Organic Fertilizers</Text>
                    <Text style={styles.recommendationText}>
                        Compost 3 tonnes/ha + Poultry manure 2 tonnes/ha + Neem cake 500kg/ha
                    </Text>
                </View>

                {/* Application Method */}
                <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationType}>Application Method</Text>
                    <Text style={styles.recommendationText}>
                        Split in quarter: 50% at planting, 25% at flowering, 25% at fruit development stage
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShareResults}>
                        <Text style={styles.shareButtonText}>Share Results</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.homeButton} onPress={handleBackToHome}>
                        <Text style={styles.homeButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: 30,
        textAlign: 'left',
    },
    imagesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        gap: 15,
    },
    imageCard: {
        flex: 1,
    },
    leafImageFrame: {
        backgroundColor: '#e8f5e8',
        borderRadius: 20,
        padding: 10,
        borderWidth: 3,
        borderColor: '#4CAF50',
    },
    soilImageFrame: {
        backgroundColor: '#f5f0e8',
        borderRadius: 20,
        padding: 10,
        borderWidth: 3,
        borderColor: '#8D6E63',
    },
    sampleImage: {
        width: '100%',
        height: 120,
        borderRadius: 15,
        resizeMode: 'cover',
    },
    issuesCard: {
        backgroundColor: '#fff8e1',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#FFC107',
    },
    issuesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    issuesTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8D6E63',
    },
    warningIcon: {
        width: 32,
        height: 32,
        backgroundColor: '#FFC107',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    issuesList: {
        gap: 5,
    },
    issueItem: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    separator: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: 20,
    },
    recommendationSection: {
        marginBottom: 25,
    },
    recommendationType: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8D6E63',
        marginBottom: 8,
    },
    recommendationText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    buttonContainer: {
        marginTop: 30,
        gap: 15,
    },
    shareButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    homeButton: {
        backgroundColor: 'white',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    homeButtonText: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default FertilizerResultScreen;