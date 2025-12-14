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
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

const UploadLeafScreen: React.FC = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

                // Navigate directly to PhotoPreview for Roboflow analysis
                console.log('📸 Photo captured, navigating to preview...');
                router.push({
                    pathname: '/screens/fertilizer/PhotoPreview',
                    params: {
                        imageUri: imageUri,
                        imageType: 'leaf',
                        leafImage: imageUri,
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

                // Navigate directly to PhotoPreview for Roboflow analysis
                console.log('🖼️ Image selected from library, navigating to preview...');
                router.push({
                    pathname: '/screens/fertilizer/PhotoPreview',
                    params: {
                        imageUri: imageUri,
                        imageType: 'leaf',
                        leafImage: imageUri,
                    }
                });
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
        router.push({
            pathname: '/screens/fertilizer/PhotoPreview',
            params: {
                imageUri: selectedImage,
                imageType: 'leaf',
                leafImage: selectedImage,
            }
        });
    };

    const renderGuidelineItem = (iconName: keyof typeof Ionicons.glyphMap, text: string) => (
        <View style={styles.guidelineItem}>
            <Ionicons name={iconName} size={16} color="#4CAF50" style={styles.guidelineIcon} />
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
                    <Text style={styles.headerTitle}>{t('fertilizer.capture_leaf')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t('fertilizer.capture_instructions')}
                    </Text>
                </View>

                {/* Guidelines Card */}
                <View style={styles.guidelinesCard}>
                    <View style={styles.guidelinesHeader}>
                        <View style={styles.guidelinesIconContainer}>
                            <Ionicons name="information-circle" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.guidelinesTitle}>Photography Guidelines</Text>
                    </View>

                    <View style={styles.guidelinesList}>
                        {renderGuidelineItem('sunny', 'Use natural daylight when possible')}
                        {renderGuidelineItem('leaf-outline', 'Include the entire leaf in frame')}
                        {renderGuidelineItem('eye-outline', 'Ensure the leaf is flat and well-lit')}
                        {renderGuidelineItem('ban-outline', 'Avoid shadows and reflections')}
                    </View>
                </View>

                {/* Upload Section */}
                <View style={styles.uploadSection}>
                    <Text style={styles.sectionTitle}>Select Image Source</Text>

                    <View style={styles.actionButtonsContainer}>
                        {renderActionButton(
                            'camera',
                            t('fertilizer.take_photo'),
                            'Use your camera to capture a leaf',
                            openCamera,
                            ['#4CAF50', '#45A049']
                        )}

                        {renderActionButton(
                            'images',
                            t('fertilizer.choose_gallery'),
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
                                    <Ionicons name="refresh" size={16} color="#4CAF50" />
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
        marginBottom: 32,
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
    guidelinesCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 3,
        borderLeftColor: '#4CAF50',
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
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    guidelinesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#166534',
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
        color: '#166534',
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
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 6,
    },
    changeImageText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
});

export default UploadLeafScreen;
