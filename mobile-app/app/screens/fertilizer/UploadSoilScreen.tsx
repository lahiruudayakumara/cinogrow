import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ScrollView,
    SafeAreaView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';

const UploadSoilScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const leafImage = params.leafImage as string | undefined;
    const insets = useSafeAreaInsets();

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
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                setSelectedImage(imageUri);

                // Auto-navigate to PhotoPreview
                router.push({
                    pathname: '/screens/fertilizer/PhotoPreview',
                    params: {
                        imageUri: imageUri,
                        imageType: 'soil',
                        soilImage: imageUri,
                        leafImage: leafImage, // Pass the leaf image from route params
                    }
                });
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
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                setSelectedImage(imageUri);

                // Auto-navigate to PhotoPreview
                router.push({
                    pathname: '/screens/fertilizer/PhotoPreview',
                    params: {
                        imageUri: imageUri,
                        imageType: 'soil',
                        soilImage: imageUri,
                        leafImage: leafImage, // Pass the leaf image from route params
                    }
                });
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
        router.push({
            pathname: '/screens/fertilizer/PhotoPreview',
            params: {
                imageUri: selectedImage,
                imageType: 'soil',
                leafImage: leafImage,
                soilImage: selectedImage,
            }
        });
    };

    const renderGuidelineItem = (iconName: keyof typeof Ionicons.glyphMap, text: string) => (
        <View style={styles.guidelineItem}>
            <Ionicons name={iconName} size={16} color="#8B7355" style={styles.guidelineIcon} />
            <Text style={styles.guidelineText}>{text}</Text>
        </View>
    );

    const renderActionButton = (
        iconName: keyof typeof Ionicons.glyphMap,
        title: string,
        subtitle: string,
        onPress: () => void,
        gradientColors: [string, string]
    ) => (
        <TouchableOpacity
            style={styles.actionButton}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={gradientColors}
                style={styles.actionButtonGradient}
            >
                <View style={styles.actionIconContainer}>
                    <Ionicons name={iconName} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>{title}</Text>
                    <Text style={styles.actionSubtitle}>{subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderProgressCard = () => {
        if (!leafImage) return null;

        return (
            <View style={styles.progressCard}>
                <LinearGradient
                    colors={['#F0F9FF', '#E0F2FE']}
                    style={styles.progressGradient}
                >
                    <View style={styles.progressHeader}>
                        <View style={styles.progressIconContainer}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.progressTitle}>Leaf Sample Complete</Text>
                    </View>
                    <Text style={styles.progressSubtitle}>
                        Great! Now upload your soil sample to complete the analysis.
                    </Text>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={['#4CAF50', '#45A049']}
                            style={[styles.progressFill, { width: '50%' }]}
                        />
                    </View>
                    <Text style={styles.progressText}>Step 2 of 2</Text>
                </LinearGradient>
            </View>
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
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Upload Soil Sample</Text>
                    <Text style={styles.headerSubtitle}>
                        Optional Step 2: Add soil photo to enhance your fertilizer recommendations
                    </Text>
                </View>

                {/* Progress Card */}
                {renderProgressCard()}

                {/* Guidelines Card */}
                <View style={styles.guidelinesCard}>
                    <View style={styles.guidelinesHeader}>
                        <View style={styles.guidelinesIconContainer}>
                            <Ionicons name="earth" size={24} color="#8B7355" />
                        </View>
                        <Text style={styles.guidelinesTitle}>Soil Photography Guidelines</Text>
                    </View>

                    <View style={styles.guidelinesList}>
                        {renderGuidelineItem('sunny', 'Take photo in natural daylight')}
                        {renderGuidelineItem('earth-outline', 'Show topsoil surface clearly')}
                        {renderGuidelineItem('leaf-outline', 'Clear away debris and vegetation')}
                        {renderGuidelineItem('water-outline', 'Ensure soil is moist, not waterlogged')}
                    </View>
                </View>

                {/* Upload Section */}
                <View style={styles.uploadSection}>
                    <Text style={styles.sectionTitle}>Select Image Source</Text>

                    <View style={styles.actionButtonsContainer}>
                        {renderActionButton(
                            'camera',
                            'Take Photo',
                            'Use your camera to capture soil',
                            openCamera,
                            ['#8B7355', '#7A5F47']
                        )}

                        {renderActionButton(
                            'images',
                            'Photo Library',
                            'Choose from your gallery',
                            openImageLibrary,
                            ['#2196F3', '#1976D2']
                        )}
                    </View>
                </View>

                {/* Image Preview */}
                {selectedImage && (
                    <View style={styles.previewSection}>
                        <Text style={styles.sectionTitle}>Image Preview</Text>
                        <View style={styles.imagePreviewCard}>
                            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                            <View style={styles.imageActions}>
                                <TouchableOpacity
                                    style={styles.changeImageButton}
                                    onPress={handleChooseFile}
                                >
                                    <Ionicons name="refresh" size={16} color="#8B7355" />
                                    <Text style={styles.changeImageText}>Change Image</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
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
    progressCard: {
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    progressGradient: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    progressSubtitle: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 16,
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
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    guidelinesCard: {
        backgroundColor: '#FEF7ED',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 3,
        borderLeftColor: '#8B7355',
    },
    guidelinesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    guidelinesIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FED7AA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    guidelinesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#92400E',
    },
    guidelinesList: {
        gap: 12,
    },
    guidelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    guidelineIcon: {
        marginRight: 12,
        width: 20,
    },
    guidelineText: {
        fontSize: 13,
        color: '#92400E',
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
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
    actionButtonsContainer: {
        gap: 16,
    },
    actionButton: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionButtonGradient: {
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    actionSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    previewSection: {
        marginBottom: 32,
    },
    imagePreviewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        alignItems: 'center',
    },
    selectedImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
        resizeMode: 'cover',
    },
    imageActions: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    changeImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF7ED',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FED7AA',
        gap: 6,
    },
    changeImageText: {
        fontSize: 14,
        color: '#8B7355',
        fontWeight: '600',
    },
});

export default UploadSoilScreen;
