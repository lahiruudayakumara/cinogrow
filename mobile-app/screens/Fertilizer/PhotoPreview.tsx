import React from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { FertilizerStackParamList } from '../../navigation/FertilizerNavigator';

type PhotoPreviewNavigationProp = StackNavigationProp<
    FertilizerStackParamList,
    'FertilizerPhotoPreview'
>;

type PhotoPreviewRouteProp = RouteProp<FertilizerStackParamList, 'FertilizerPhotoPreview'>;

interface PhotoPreviewProps {
    navigation: PhotoPreviewNavigationProp;
    route: PhotoPreviewRouteProp;
}

const PhotoPreview: React.FC<PhotoPreviewProps> = ({ navigation, route }) => {
    const { imageUri, imageType, leafImage, soilImage } = route.params;

    const detectedIssues = ['Nitrogen deficiency', 'Early leaf spot'];

    const handleRetakePhoto = () => {
        navigation.goBack();
    };

    const handleContinue = () => {
        if (imageType === 'leaf') {
            // After leaf photo, go to soil upload with leaf image
            navigation.navigate('FertilizerUploadSoil', {
                fromLeaf: true,
                leafImage: imageUri
            });
        } else if (imageType === 'soil') {
            // After soil photo, go back to home with both images
            navigation.navigate('FertilizerHome', {
                leafImage: leafImage,
                soilImage: imageUri,
            });
        }
    }; const handleGetResults = () => {
        // If both images are available, go directly to results
        if (leafImage && soilImage) {
            navigation.navigate('FertilizerResult', {
                leafImage,
                soilImage,
            });
        }
    };
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Text style={styles.headerTitle}>
                    {imageType === 'leaf' ? 'Leaf Sample Preview' : 'Soil Sample Preview'}
                </Text>

                {/* Current Photo */}
                <View style={styles.photoContainer}>
                    <View style={styles.photoCard}>
                        <View style={imageType === 'leaf' ? styles.leafCardBorder : styles.soilCardBorder}>
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.photoImage}
                                resizeMode="cover"
                            />
                        </View>
                    </View>
                </View>

                {/* Analysis Preview */}
                <View style={styles.issuesCard}>
                    <View style={styles.issuesHeader}>
                        <Text style={styles.issuesTitle}>Preliminary Analysis</Text>
                        <View style={styles.warningIcon}>
                            <Text style={styles.warningSymbol}>!</Text>
                        </View>
                    </View>
                    {detectedIssues.map((issue, index) => (
                        <Text key={index} style={styles.issueText}>
                            {issue}
                        </Text>
                    ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleRetakePhoto}>
                        <Text style={styles.secondaryButtonText}>Retake Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
                        <Text style={styles.primaryButtonText}>
                            {imageType === 'leaf' ? 'Continue to Soil' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Show results button if both images are available */}
                {leafImage && soilImage && (
                    <TouchableOpacity style={styles.shareButton} onPress={handleGetResults}>
                        <Text style={styles.shareButtonText}>Get Complete Results</Text>
                    </TouchableOpacity>
                )}
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
        padding: 20,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 30,
    },
    photoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    photoCard: {
        flex: 1,
        marginHorizontal: 5,
    },
    leafCardBorder: {
        borderRadius: 20,
        padding: 8,
        backgroundColor: '#C8E6C9',
        borderWidth: 3,
        borderColor: '#81C784',
    },
    soilCardBorder: {
        borderRadius: 20,
        padding: 8,
        backgroundColor: '#D7CCC8',
        borderWidth: 3,
        borderColor: '#A1887F',
    },
    photoImage: {
        width: '100%',
        height: 120,
        borderRadius: 12,
    },
    issuesCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
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
        backgroundColor: '#FFC107',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningSymbol: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
    },
    issueText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 20,
    },
    recommendationSection: {
        marginBottom: 20,
    },
    subsectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8D6E63',
        marginBottom: 8,
    },
    recommendationText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        marginBottom: 15,
    },
    primaryButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    secondaryButtonText: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: '600',
    },
    shareButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        alignItems: 'center',
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PhotoPreview;