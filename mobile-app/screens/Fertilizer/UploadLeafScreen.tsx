import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { FertilizerStackParamList } from '../../navigation/FertilizerNavigator';

type UploadLeafScreenNavigationProp = StackNavigationProp<
    FertilizerStackParamList,
    'FertilizerUploadLeaf'
>;

interface UploadLeafScreenProps {
    navigation: UploadLeafScreenNavigationProp;
}

const UploadLeafScreen: React.FC<UploadLeafScreenProps> = ({ navigation }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handleChooseFile = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleUploadLeafSample = () => {
        if (!selectedImage) {
            Alert.alert('No Image Selected', 'Please select a leaf image first.');
            return;
        }

        // Navigate to PhotoPreview for leaf image
        navigation.navigate('FertilizerPhotoPreview', {
            imageUri: selectedImage,
            imageType: 'leaf',
            leafImage: selectedImage,
        });
    };

    const CameraIcon = () => (
        <View style={styles.cameraIcon}>
            <View style={styles.cameraBody}>
                <View style={styles.cameraLens} />
            </View>
        </View>
    );

    const ImageIcon = () => (
        <View style={styles.imageIcon}>
            <View style={styles.imageFrame}>
                <View style={styles.imageMountain1} />
                <View style={styles.imageMountain2} />
                <View style={styles.imageSun} />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <Text style={styles.backArrow}>←</Text>
                    <Text style={styles.headerTitle}>Upload Leaf Sample</Text>
                </TouchableOpacity>

                {/* Guidelines Card */}
                <View style={styles.guidelinesCard}>
                    <View style={styles.guidelinesHeader}>
                        <CameraIcon />
                        <Text style={styles.guidelinesTitle}>Leaf Sample Guidelines</Text>
                    </View>
                    <View style={styles.guidelinesList}>
                        <Text style={styles.guidelineItem}>• Make sure the leaf is flat and well-lit</Text>
                        <Text style={styles.guidelineItem}>• Use natural daylight when possible</Text>
                        <Text style={styles.guidelineItem}>• Include the entire leaf in the frame</Text>
                        <Text style={styles.guidelineItem}>• Avoid shadows and reflections</Text>
                    </View>
                </View>

                {/* Upload Area */}
                <View style={styles.uploadArea}>
                    {selectedImage ? (
                        <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                    ) : (
                        <>
                            <View style={styles.uploadIconContainer}>
                                <CameraIcon />
                            </View>
                            <Text style={styles.uploadTitle}>Upload Leaf Photo</Text>
                            <Text style={styles.uploadSubtitle}>
                                Drag and drop your leaf image here,{'\n'}or click to browse
                            </Text>
                        </>
                    )}

                    <TouchableOpacity style={styles.chooseFileButton} onPress={handleChooseFile}>
                        <ImageIcon />
                        <Text style={styles.chooseFileText}>Choose File</Text>
                    </TouchableOpacity>
                </View>

                {/* Upload Button */}
                <TouchableOpacity
                    style={[styles.uploadButton, !selectedImage && styles.uploadButtonDisabled]}
                    onPress={handleUploadLeafSample}
                    disabled={!selectedImage}
                >
                    <Text style={styles.uploadButtonText}>Upload Leaf Sample →</Text>
                </TouchableOpacity>
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
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backArrow: {
        fontSize: 24,
        color: '#4CAF50',
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#4CAF50',
    },
    guidelinesCard: {
        backgroundColor: '#e8f5e8',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    guidelinesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    guidelinesTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2e7d32',
        marginLeft: 15,
    },
    guidelinesList: {
        marginLeft: 60,
    },
    guidelineItem: {
        fontSize: 14,
        color: '#2e7d32',
        marginBottom: 5,
        lineHeight: 20,
    },
    cameraIcon: {
        width: 40,
        height: 40,
        backgroundColor: '#4CAF50',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBody: {
        width: 24,
        height: 18,
        backgroundColor: 'white',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraLens: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderStyle: 'dashed',
        borderRadius: 15,
        padding: 40,
        alignItems: 'center',
        backgroundColor: 'white',
        marginBottom: 30,
        minHeight: 200,
        justifyContent: 'center',
    },
    uploadIconContainer: {
        marginBottom: 20,
        opacity: 0.5,
    },
    uploadTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    uploadSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 20,
    },
    selectedImage: {
        width: 200,
        height: 200,
        borderRadius: 10,
        marginBottom: 20,
        resizeMode: 'cover',
    },
    chooseFileButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
    },
    chooseFileText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    imageIcon: {
        marginRight: 5,
    },
    imageFrame: {
        width: 20,
        height: 16,
        backgroundColor: 'white',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    imageMountain1: {
        position: 'absolute',
        bottom: 0,
        left: 2,
        width: 6,
        height: 6,
        backgroundColor: '#4CAF50',
        transform: [{ rotate: '45deg' }],
    },
    imageMountain2: {
        position: 'absolute',
        bottom: 0,
        right: 4,
        width: 4,
        height: 4,
        backgroundColor: '#4CAF50',
        transform: [{ rotate: '45deg' }],
    },
    imageSun: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 3,
        height: 3,
        backgroundColor: '#FFD700',
        borderRadius: 1.5,
    },
    uploadButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 'auto',
    },
    uploadButtonDisabled: {
        backgroundColor: '#a5d6a7',
        opacity: 0.6,
    },
    uploadButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default UploadLeafScreen;