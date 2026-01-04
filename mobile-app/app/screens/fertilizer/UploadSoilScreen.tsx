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
import { useTranslation } from 'react-i18next';
import { imageAnalysisService } from '../../../services/imageAnalysisService';
import { metadataStorageService } from '../../../services/metadataStorageService';
import { SoilAnalysisMetadata } from '../../../services/imageAnalysisService';
import { UploadSoilParams, serializePhotoPreviewParams } from '../../fertilizer/types';

const UploadSoilScreen: React.FC = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const params = useLocalSearchParams<UploadSoilParams>();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fromLeaf = params?.fromLeaf === 'true';
    const { leafImage } = params || {};
    const insets = useSafeAreaInsets();

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('fertilizer.upload_soil.alerts.permission_camera_title'), t('fertilizer.upload_soil.alerts.permission_camera_message'));
            return false;
        }
        return true;
    };

    const requestMediaLibraryPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('fertilizer.upload_soil.alerts.permission_library_title'), t('fertilizer.upload_soil.alerts.permission_library_message'));
            return false;
        }
        return true;
    };

    const handleChooseFile = async () => {
        Alert.alert(
            t('fertilizer.upload_soil.alerts.select_image'),
            t('fertilizer.upload_soil.alerts.select_image_message'),
            [
                {
                    text: t('fertilizer.upload_soil.alerts.camera'),
                    onPress: openCamera,
                },
                {
                    text: t('fertilizer.upload_soil.alerts.photo_library'),
                    onPress: openImageLibrary,
                },
                {
                    text: t('fertilizer.upload_soil.alerts.cancel'),
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
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                setSelectedImage(imageUri);

                // Extract metadata for ML analysis
                try {
                    // Create new analysis session
                    const sessionId = await metadataStorageService.createSession();

                    // Extract soil-specific metadata
                    const soilMetadata = await imageAnalysisService.extractImageMetadata(
                        imageUri,
                        'soil',
                        'camera'
                    ) as SoilAnalysisMetadata;

                    // Store metadata for future ML training
                    await metadataStorageService.storeSoilMetadata(sessionId, soilMetadata);
                } catch (metadataError) {
                    console.log('Metadata extraction failed:', metadataError);
                    // Continue with navigation even if metadata fails
                }

                // Auto-navigate to PhotoPreview
                router.push({
                    pathname: '/fertilizer/photo-preview',
                    params: serializePhotoPreviewParams({
                        imageUri: imageUri,
                        imageType: 'soil',
                        soilImage: imageUri,
                        leafImage: leafImage, // Pass the leaf image from route params
                    })
                });
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert(t('fertilizer.upload_soil.alerts.error'), t('fertilizer.upload_soil.alerts.failed_take_photo'));
        }
    };

    const openImageLibrary = async () => {
        try {
            const hasPermission = await requestMediaLibraryPermission();
            if (!hasPermission) return;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                setSelectedImage(imageUri);

                // Extract metadata for ML analysis
                try {
                    // Create new analysis session
                    const sessionId = await metadataStorageService.createSession();

                    // Extract soil-specific metadata
                    const soilMetadata = await imageAnalysisService.extractImageMetadata(
                        imageUri,
                        'soil',
                        'library'
                    ) as SoilAnalysisMetadata;

                    // Store metadata for future ML training
                    await metadataStorageService.storeSoilMetadata(sessionId, soilMetadata);
                } catch (metadataError) {
                    console.log('Metadata extraction failed:', metadataError);
                    // Continue with navigation even if metadata fails
                }

                // Auto-navigate to PhotoPreview
                router.push({
                    pathname: '/fertilizer/photo-preview',
                    params: serializePhotoPreviewParams({
                        imageUri: imageUri,
                        imageType: 'soil',
                        soilImage: imageUri,
                        leafImage: leafImage, // Pass the leaf image from route params
                    })
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert(t('fertilizer.upload_soil.alerts.error'), t('fertilizer.upload_soil.alerts.failed_pick_image'));
        }
    };

    const handleUploadSoilSample = () => {
        if (!selectedImage) {
            Alert.alert(t('fertilizer.upload_soil.alerts.no_image_title'), t('fertilizer.upload_soil.alerts.no_image_message'));
            return;
        }

        // Navigate to PhotoPreview for soil image, passing both images
        router.push({
            pathname: '/fertilizer/photo-preview',
            params: serializePhotoPreviewParams({
                imageUri: selectedImage,
                imageType: 'soil',
                leafImage: leafImage,
                soilImage: selectedImage,
            })
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
                        <Text style={styles.progressTitle}>{t('fertilizer.upload_soil.progress.title')}</Text>
                    </View>
                    <Text style={styles.progressSubtitle}>
                        {t('fertilizer.upload_soil.progress.subtitle')}
                    </Text>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={['#4CAF50', '#45A049']}
                            style={[styles.progressFill, { width: '50%' }]}
                        />
                    </View>
                    <Text style={styles.progressText}>{t('fertilizer.upload_soil.progress.step')}</Text>
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
                    <Text style={styles.headerTitle}>{t('fertilizer.upload_soil.header.title')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t('fertilizer.upload_soil.header.subtitle')}
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
                        <Text style={styles.guidelinesTitle}>{t('fertilizer.upload_soil.guidelines.title')}</Text>
                    </View>

                    <View style={styles.guidelinesList}>
                        {renderGuidelineItem('sunny', t('fertilizer.upload_soil.guidelines.natural_daylight'))}
                        {renderGuidelineItem('earth-outline', t('fertilizer.upload_soil.guidelines.show_topsoil'))}
                        {renderGuidelineItem('leaf-outline', t('fertilizer.upload_soil.guidelines.clear_debris'))}
                        {renderGuidelineItem('water-outline', t('fertilizer.upload_soil.guidelines.moist_soil'))}
                    </View>
                </View>

                {/* Upload Section */}
                <View style={styles.uploadSection}>
                    <Text style={styles.sectionTitle}>{t('fertilizer.upload_soil.upload.title')}</Text>

                    <View style={styles.actionButtonsContainer}>
                        {renderActionButton(
                            'camera',
                            t('fertilizer.upload_soil.upload.take_photo'),
                            t('fertilizer.upload_soil.upload.take_photo_subtitle'),
                            openCamera,
                            ['#8B7355', '#7A5F47']
                        )}

                        {renderActionButton(
                            'images',
                            t('fertilizer.upload_soil.upload.photo_library'),
                            t('fertilizer.upload_soil.upload.photo_library_subtitle'),
                            openImageLibrary,
                            ['#2196F3', '#1976D2']
                        )}
                    </View>
                </View>

                {/* Image Preview */}
                {selectedImage && (
                    <View style={styles.previewSection}>
                        <Text style={styles.sectionTitle}>{t('fertilizer.upload_soil.preview.title')}</Text>
                        <View style={styles.imagePreviewCard}>
                            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                            <View style={styles.imageActions}>
                                <TouchableOpacity
                                    style={styles.changeImageButton}
                                    onPress={handleChooseFile}
                                >
                                    <Ionicons name="refresh" size={16} color="#8B7355" />
                                    <Text style={styles.changeImageText}>{t('fertilizer.upload_soil.preview.change_image')}</Text>
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
        minHeight: 88,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        flexShrink: 0,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    actionSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        flexWrap: 'wrap',
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
