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
import { RouteProp } from '@react-navigation/native';
import { FertilizerStackParamList } from '../../navigation/FertilizerNavigator';
import { Ionicons } from '@expo/vector-icons';

type UploadSoilScreenNavigationProp = StackNavigationProp<
    FertilizerStackParamList,
    'FertilizerUploadSoil'
>;

type UploadSoilScreenRouteProp = RouteProp<FertilizerStackParamList, 'FertilizerUploadSoil'>;

interface UploadSoilScreenProps {
    navigation: UploadSoilScreenNavigationProp;
    route: UploadSoilScreenRouteProp;
}

const UploadSoilScreen: React.FC<UploadSoilScreenProps> = ({ navigation, route }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const { fromLeaf, leafImage } = route.params || {};

    const handleGoBack = () => {
        navigation.goBack();
    };

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is required to take photos.');
            return false;
        }
        return true;
    };

    const requestMediaLibraryPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Photo library permission is required to select images.');
            return false;
        }
        return true;
    };

    const handleChooseFile = async () => {
        Alert.alert(
            'Select Image',
            'Choose how you want to select your image',
            [
                {
                    text: 'Camera',
                    onPress: openCamera,
                },
                {
                    text: 'Photo Library',
                    onPress: openImageLibrary,
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const openCamera = async () => {
        try {
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) return;

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const openImageLibrary = async () => {
        try {
            const hasPermission = await requestMediaLibraryPermission();
            if (!hasPermission) return;

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

    const handleUploadSoilSample = () => {
        if (!selectedImage) {
            Alert.alert('No Image Selected', 'Please select a soil image first.');
            return;
        }

        // Navigate to PhotoPreview for soil image, passing both images
        navigation.navigate('FertilizerPhotoPreview', {
            imageUri: selectedImage,
            imageType: 'soil',
            leafImage: leafImage,
            soilImage: selectedImage,
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
               

                {/* Guidelines Card */}
                <View style={styles.guidelinesCard}>
                    <View style={styles.guidelinesHeader}>
                        <CameraIcon />
                        <Text style={styles.guidelinesTitle}>Soil Sample Guidelines</Text>
                    </View>
                    <View style={styles.guidelinesList}>
                        <Text style={styles.guidelineItem}>• Take a close-up of the topsoil in daylight</Text>
                        <Text style={styles.guidelineItem}>• Clear away debris and vegetation</Text>
                        <Text style={styles.guidelineItem}>• Ensure soil is moist but not waterlogged</Text>
                        <Text style={styles.guidelineItem}>• Include a 6-inch depth view if possible</Text>
                    </View>
                </View>

                {/* Upload Area (Main Focus) */}
                <TouchableOpacity
                    style={[styles.uploadArea, selectedImage && styles.uploadAreaActive]}
                    onPress={handleChooseFile}
                >
                    {selectedImage ? (
                        <>
                            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                            <TouchableOpacity style={styles.changePhotoButton} onPress={handleChooseFile}>
                                <Ionicons name="camera-reverse-outline" size={16} color="white" />
                                <Text style={styles.changePhotoText}>Change/Retake Photo</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={60} color="#795548" style={styles.uploadIcon} />
                            <Text style={styles.uploadTitle}>Tap to Upload Soil Photo</Text>
                            <Text style={styles.uploadSubtitle}>
                                Camera or Gallery - We recommend taking a new photo.
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Upload Button */}
                <TouchableOpacity
                    style={[styles.uploadButton, !selectedImage && styles.uploadButtonDisabled]}
                    onPress={handleUploadSoilSample}
                    disabled={!selectedImage}
                >
                    <Text style={styles.uploadButtonText}>Upload Soil Sample →</Text>
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
    uploadAreaActive: {
        borderColor: '#FF9800',
        borderStyle: 'solid',
        backgroundColor: '#FFF3E0',
    },
    uploadIcon: {
        marginBottom: 20,
        opacity: 0.5,
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
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        width: '100%',
    },
    cameraButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        flex: 1,
    },
    galleryButton: {
        backgroundColor: '#2196F3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        flex: 1,
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    changePhotoButton: {
        backgroundColor: '#FF9800',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 10,
    },
    changePhotoText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default UploadSoilScreen;