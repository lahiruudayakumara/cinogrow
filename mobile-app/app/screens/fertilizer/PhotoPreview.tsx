import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fertilizerAPI, RoboflowAnalysisResponse } from '../../../services/fertilizerAPI';
import PlantAgeSelector from '../../../components/PlantAgeSelector';
import { deserializePhotoPreviewParams, serializeResultParams } from '../../fertilizer/types';

const PhotoPreview: React.FC = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const rawParams = useLocalSearchParams();
    const { imageUri, imageType, leafImage, soilImage, leafMetadata } = deserializePhotoPreviewParams(rawParams as any);
    const insets = useSafeAreaInsets();

    // State for ML analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState('');
    const [showAgeSelectorModal, setShowAgeSelectorModal] = useState(false);
    const [selectedPlantAge, setSelectedPlantAge] = useState<number>(1);

    // Animation for loading spinner
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isAnalyzing) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.setValue(0);
        }
    }, [isAnalyzing]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleRetakePhoto = () => {
        router.back();
    };

    const handleContinue = async () => {
        if (imageType === 'leaf') {
            // Show age selector first, then perform analysis after age is selected
            setShowAgeSelectorModal(true);
        } else if (imageType === 'soil') {
            // If there's a leaf image, show age selector for combined analysis
            // Otherwise, perform soil-only analysis
            if (leafImage) {
                setShowAgeSelectorModal(true);
            } else {
                performSoilAnalysis();
            }
        }
    };

    const performLeafAnalysis = async (plantAge: number) => {
        try {
            setIsAnalyzing(true);
            setAnalysisProgress(t('fertilizer.photo_preview.analysis.progress_detecting'));

            // If we have both leaf and soil images, perform combined analysis
            if (soilImage) {
                console.log('🔬 Performing combined leaf + soil analysis...');
                console.log(`🍃 Leaf Image: ${imageUri}`);
                console.log(`🌍 Soil Image: ${soilImage}`);
                console.log(`🌱 Plant Age: ${plantAge} years`);

                const combinedResult = await fertilizerAPI.analyzeCombined(imageUri, soilImage, plantAge);

                console.log('✅ Combined analysis completed:', combinedResult);

                setIsAnalyzing(false);

                // Navigate to results with combined analysis data
                router.push({
                    pathname: '/fertilizer/result',
                    params: serializeResultParams({
                        leafImage: imageUri,
                        soilImage: soilImage,
                        analysisType: 'comprehensive',
                        combinedAnalysis: combinedResult,
                        plantAge: plantAge
                    })
                });
            } else {
                // Leaf-only analysis
                console.log('🚀 Starting leaf-only analysis with Roboflow via backend...');
                console.log(`🖼️ Image URI: ${imageUri}`);
                console.log(`🌱 Plant Age: ${plantAge} years`);

                // Step 1: Use backend API to call Roboflow with plant age
                console.log('🤖 Step 1: Calling backend Roboflow API...');
                const roboflowResult = await fertilizerAPI.analyzeLeafWithRoboflow(imageUri, plantAge);

                console.log('✅ Roboflow detection completed:', roboflowResult);

                setIsAnalyzing(false);

                // Navigate directly to results with the analysis data
                router.push({
                    pathname: '/fertilizer/result',
                    params: serializeResultParams({
                        leafImage: imageUri,
                        analysisType: 'leaf-only' as const,
                        roboflowAnalysis: roboflowResult,
                        plantAge: plantAge
                    })
                });
            }

        } catch (error) {
            console.error('❌ Leaf analysis error:', error);
            setIsAnalyzing(false);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            console.error('🚨 Analysis failed with details:', {
                error: errorMessage,
                imageUri: imageUri,
                timestamp: new Date().toISOString()
            });

            Alert.alert(
                t('fertilizer.photo_preview.alerts.analysis_failed'),
                t('fertilizer.photo_preview.alerts.failed_message', { error: errorMessage }),
                [
                    {
                        text: t('fertilizer.photo_preview.alerts.try_again'),
                        onPress: () => performLeafAnalysis(plantAge)
                    },
                    {
                        text: t('fertilizer.photo_preview.alerts.basic_analysis'),
                        onPress: () => {
                            console.log('👤 User chose basic analysis fallback');
                            // Continue with basic analysis if ML fails
                            router.push({
                                pathname: '/fertilizer/result',
                                params: serializeResultParams({
                                    leafImage: imageUri,
                                    soilImage: soilImage,
                                    analysisType: soilImage ? 'comprehensive' : 'leaf-only'
                                })
                            });
                        }
                    }
                ]
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    const performSoilAnalysis = async (plantAge?: number) => {
        try {
            setIsAnalyzing(true);
            setAnalysisProgress(t('fertilizer.photo_preview.analysis.progress_detecting'));

            console.log('🚀 Starting soil analysis with Roboflow via backend...');
            console.log(`🖼️ Image URI: ${imageUri}`);

            // If we have both leaf and soil images, perform combined analysis
            if (leafImage && plantAge) {
                console.log('🔬 Performing combined leaf + soil analysis...');
                console.log(`🍃 Leaf Image: ${leafImage}`);
                console.log(`🌍 Soil Image: ${imageUri}`);
                console.log(`🌱 Plant Age: ${plantAge} years`);

                const combinedResult = await fertilizerAPI.analyzeCombined(leafImage, imageUri, plantAge);

                console.log('✅ Combined analysis completed:', combinedResult);

                setIsAnalyzing(false);

                // Navigate to results with combined analysis data
                router.push({
                    pathname: '/fertilizer/result',
                    params: serializeResultParams({
                        leafImage: leafImage,
                        soilImage: imageUri,
                        analysisType: 'comprehensive',
                        combinedAnalysis: combinedResult,
                        plantAge: plantAge
                    })
                });
            } else {
                // Soil-only analysis
                console.log('🤖 Step 1: Calling backend Roboflow Soil API...');
                const soilResult = await fertilizerAPI.analyzeSoilWithRoboflow(imageUri);

                console.log('✅ Soil detection completed:', soilResult);

                setIsAnalyzing(false);

                // Navigate to results with soil analysis data
                router.push({
                    pathname: '/fertilizer/result',
                    params: serializeResultParams({
                        leafImage: leafImage,
                        soilImage: imageUri,
                        analysisType: leafImage ? 'comprehensive' : 'soil-only',
                        soilAnalysis: soilResult
                    })
                });
            }

        } catch (error) {
            console.error('❌ Soil analysis error:', error);
            setIsAnalyzing(false);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            console.error('🚨 Soil analysis failed with details:', {
                error: errorMessage,
                imageUri: imageUri,
                timestamp: new Date().toISOString()
            });

            Alert.alert(
                t('fertilizer.photo_preview.alerts.analysis_failed'),
                t('fertilizer.photo_preview.alerts.failed_message', { error: errorMessage }),
                [
                    {
                        text: t('fertilizer.photo_preview.alerts.try_again'),
                        onPress: () => performSoilAnalysis(plantAge)
                    },
                    {
                        text: t('fertilizer.photo_preview.alerts.basic_analysis'),
                        onPress: () => {
                            console.log('👤 User chose basic analysis fallback');
                            // Continue without ML analysis if it fails
                            router.push({
                                pathname: '/fertilizer/result',
                                params: serializeResultParams({
                                    leafImage: leafImage,
                                    soilImage: imageUri,
                                    analysisType: 'comprehensive'
                                })
                            });
                        }
                    }
                ]
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAgeConfirm = (plantAge: number) => {
        console.log(`🌱 Plant age selected: ${plantAge} years`);
        setShowAgeSelectorModal(false);
        setSelectedPlantAge(plantAge);

        // Perform analysis based on image type
        if (imageType === 'leaf') {
            performLeafAnalysis(plantAge);
        } else if (imageType === 'soil') {
            performSoilAnalysis(plantAge);
        }
    };

    const handleAddSoilAnalysis = () => {
        // Navigate to soil upload to enhance the analysis
        router.push({
            pathname: '/fertilizer/upload-soil',
            params: {
                fromLeaf: 'true',
                leafImage: imageUri
            }
        });
    };

    const handleAddLeafAnalysis = () => {
        // Navigate to leaf upload to enhance the analysis
        router.push({
            pathname: '/fertilizer/upload-leaf',
            params: {
                fromSoil: 'true',
                soilImage: imageUri
            }
        });
    };

    const renderProcessFlowCard = () => {
        return (
            <View style={styles.processFlowCard}>
                <Text style={styles.processFlowTitle}>{t('fertilizer.photo_preview.process_flow.title')}</Text>
                <View style={styles.processStepsContainer}>
                    <View style={styles.processStep}>
                        <View style={styles.processStepIcon}>
                            <Ionicons name="cloud-upload" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.processStepContent}>
                            <Text style={styles.processStepLabel}>{t('fertilizer.photo_preview.process_flow.upload')}</Text>
                    
                        </View>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={styles.processArrow} />
                    
                    <View style={styles.processStep}>
                        <View style={styles.processStepIcon}>
                            <Ionicons name="analytics" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.processStepContent}>
                            <Text style={styles.processStepLabel}>{t('fertilizer.photo_preview.process_flow.analyze')}</Text>
                        
                        </View>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={styles.processArrow} />
                    
                    <View style={styles.processStep}>
                        <View style={styles.processStepIcon}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.processStepContent}>
                            <Text style={styles.processStepLabel}>{t('fertilizer.photo_preview.process_flow.results')}</Text>
                            
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
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
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {imageType === 'leaf' ? t('fertilizer.photo_preview.header.title_leaf') : t('fertilizer.photo_preview.header.title_soil')}
                        </Text>
                    </View>
                    <Text style={styles.headerSubtitle}>
                        {t('fertilizer.photo_preview.header.subtitle', { type: imageType })}
                    </Text>
                </View>

                {/* Processing Note */}
                {renderProcessFlowCard()}

                {/* Photo Preview Card */}
                {leafImage && soilImage ? (
                    <View style={styles.dualPhotoCard}>
                        <View style={styles.dualPhotoHeader}>
                            <Text style={styles.dualPhotoTitle}>{t('fertilizer.photo_preview.dual_photo.title')}</Text>
                            <Text style={styles.dualPhotoSubtitle}>{t('fertilizer.photo_preview.dual_photo.subtitle')}</Text>
                        </View>
                        
                        <View style={styles.dualImagesContainer}>
                            {/* Leaf Image */}
                            <View style={styles.singleImageWrapper}>
                                <View style={styles.singleImageHeader}>
                                    <Ionicons name="leaf" size={16} color="#4CAF50" />
                                    <Text style={styles.singleImageLabel}>{t('fertilizer.photo_preview.dual_photo.leaf_sample')}</Text>
                                </View>
                                <Image
                                    source={{ uri: leafImage }}
                                    style={styles.dualPreviewImage}
                                    resizeMode="cover"
                                />
                            </View>
                            
                            {/* Soil Image */}
                            <View style={styles.singleImageWrapper}>
                                <View style={styles.singleImageHeader}>
                                    <Ionicons name="earth" size={16} color="#8B7355" />
                                    <Text style={styles.singleImageLabel}>{t('fertilizer.photo_preview.dual_photo.soil_sample')}</Text>
                                </View>
                                <Image
                                    source={{ uri: soilImage }}
                                    style={styles.dualPreviewImage}
                                    resizeMode="cover"
                                />
                            </View>
                        </View>
                        
                        {/* Retake Button */}
                        <TouchableOpacity
                            style={styles.retakeButtonBelowImage}
                            onPress={handleRetakePhoto}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="camera-reverse-outline" size={20} color="#6B7280" />
                            <Text style={styles.retakeBelowImageText}>{t('fertilizer.photo_preview.dual_photo.retake_images')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.photoCard}>
                        <View style={styles.photoHeader}>
                            <View style={[styles.photoIconContainer, {
                                backgroundColor: imageType === 'leaf' ? '#4CAF5020' : '#8B735520',
                            }]}>
                                <Ionicons
                                    name={imageType === 'leaf' ? 'leaf' : 'earth'}
                                    size={24}
                                    color={imageType === 'leaf' ? '#4CAF50' : '#8B7355'}
                                />
                            </View>
                            <Text style={styles.photoTitle}>
                                {imageType === 'leaf' ? t('fertilizer.photo_preview.sample.leaf') : t('fertilizer.photo_preview.sample.soil')}
                            </Text>
                        </View>

                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                            <View style={styles.imageOverlay}>
                                <View style={styles.imageQualityBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                    <Text style={styles.imageQualityText}>{t('fertilizer.photo_preview.sample.quality_good')}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Retake Button - Right below image */}
                        <TouchableOpacity
                            style={styles.retakeButtonBelowImage}
                            onPress={handleRetakePhoto}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="camera-reverse-outline" size={20} color="#4CAF50" />
                            <Text style={styles.retakeBelowImageText}>{t('fertilizer.photo_preview.buttons.retake')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Clear Instructions */}
                {!isAnalyzing && (
                    <View style={styles.instructionsCard}>
                        <View style={styles.instructionIconContainer}>
                            <Ionicons name="bulb-outline" size={24} color="#3B82F6" />
                        </View>
                        <View style={styles.instructionContent}>
                            <Text style={styles.instructionTitle}>{t('fertilizer.photo_preview.instructions.title')}</Text>
                            <Text style={styles.instructionText}>
                                {leafImage && soilImage
                                    ? t('fertilizer.photo_preview.instructions.both_samples')
                                    : imageType === 'leaf' 
                                    ? t('fertilizer.photo_preview.instructions.leaf_only')
                                    : t('fertilizer.photo_preview.instructions.soil_only')}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Modern Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    {leafImage && soilImage ? (
                        // Both images present - show comprehensive analysis button
                        <TouchableOpacity
                            style={[styles.primaryActionButton, isAnalyzing && styles.analyzingButton]}
                            onPress={handleContinue}
                            activeOpacity={0.8}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? (
                                <View style={styles.actionButtonContent}>
                                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                        <Ionicons name={imageType === 'leaf' ? 'leaf' : 'earth'} size={24} color="#4CAF50" />
                                    </Animated.View>
                                    <Text style={styles.analyzingText}>{t('fertilizer.photo_preview.action_buttons.analyzing_both')}</Text>
                                </View>
                            ) : (
                                <LinearGradient
                                    colors={['#4CAF50', '#45A049']}
                                    style={styles.primaryActionGradient}
                                >
                                    <View style={styles.actionButtonContent}>
                                        <Ionicons name="fitness" size={22} color="#FFFFFF" />
                                        <View style={styles.actionTextContainer}>
                                            <Text style={styles.primaryActionText}>{t('fertilizer.photo_preview.action_buttons.comprehensive_analysis')}</Text>
                                            <Text style={styles.actionSubtext}>{t('fertilizer.photo_preview.action_buttons.comprehensive_subtitle')}</Text>
                                        </View>
                                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                                    </View>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>
                    ) : imageType === 'leaf' ? (
                        <>
                            {/* Secondary Soil Button */}
                            <TouchableOpacity
                                style={styles.secondaryActionButton}
                                onPress={handleAddSoilAnalysis}
                                activeOpacity={0.7}
                            >
                                <View style={styles.actionButtonContent}>
                                    <Ionicons name="earth-outline" size={22} color="#8B7355" />
                                    <View style={styles.actionTextContainer}>
                                        <Text style={styles.secondaryActionText}>{t('fertilizer.photo_preview.action_buttons.add_soil_image')}</Text>
                                        <Text style={styles.secondarySubtext}>{t('fertilizer.photo_preview.action_buttons.recommended_accuracy')}</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#8B7355" />
                                </View>
                            </TouchableOpacity>

                            {/* Primary Analysis Button */}
                            <TouchableOpacity
                                style={[styles.primaryActionButton, isAnalyzing && styles.analyzingButton]}
                                onPress={handleContinue}
                                activeOpacity={0.8}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <View style={styles.actionButtonContent}>
                                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                            <Ionicons name="leaf" size={24} color="#4CAF50" />
                                        </Animated.View>
                                        <Text style={styles.analyzingText}>{t('fertilizer.photo_preview.action_buttons.analyzing')}</Text>
                                    </View>
                                ) : (
                                    <LinearGradient
                                        colors={['#4CAF50', '#45A049']}
                                        style={styles.primaryActionGradient}
                                    >
                                        <View style={styles.actionButtonContent}>
                                            <Ionicons name="leaf-outline" size={22} color="#FFFFFF" />
                                            <View style={styles.actionTextContainer}>
                                                <Text style={styles.primaryActionText}>{t('fertilizer.photo_preview.action_buttons.leaf_analysis_only')}</Text>
                                                <Text style={styles.actionSubtext}>{t('fertilizer.photo_preview.action_buttons.quick_recommendations')}</Text>
                                            </View>
                                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                                        </View>
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {/* Secondary Leaf Button */}
                            <TouchableOpacity
                                style={styles.secondaryActionButtonLeaf}
                                onPress={handleAddLeafAnalysis}
                                activeOpacity={0.7}
                            >
                                <View style={styles.actionButtonContent}>
                                    <Ionicons name="leaf-outline" size={22} color="#4CAF50" />
                                    <View style={styles.actionTextContainer}>
                                        <Text style={styles.secondaryActionTextLeaf}>{t('fertilizer.photo_preview.action_buttons.add_leaf_image')}</Text>
                                        <Text style={styles.secondarySubtextLeaf}>{t('fertilizer.photo_preview.action_buttons.recommended_accuracy')}</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#4CAF50" />
                                </View>
                            </TouchableOpacity>

                            {/* Primary Soil Analysis Button */}
                            <TouchableOpacity
                                style={[styles.primaryActionButton, isAnalyzing && styles.brownAnalyzingButton]}
                                onPress={handleContinue}
                                activeOpacity={0.8}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <View style={styles.actionButtonContent}>
                                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                            <Ionicons name="earth" size={24} color="#8B7355" />
                                        </Animated.View>
                                        <Text style={styles.brownAnalyzingText}>{t('fertilizer.photo_preview.action_buttons.analyzing')}</Text>
                                    </View>
                                ) : (
                                    <LinearGradient
                                        colors={['#8B7355', '#7A5F47']}
                                        style={styles.primaryActionGradient}
                                    >
                                        <View style={styles.actionButtonContent}>
                                            <Ionicons name="earth-outline" size={22} color="#FFFFFF" />
                                            <View style={styles.actionTextContainer}>
                                                <Text style={styles.primaryActionText}>{t('fertilizer.photo_preview.action_buttons.soil_analysis_only')}</Text>
                                                <Text style={styles.actionSubtext}>{t('fertilizer.photo_preview.action_buttons.quick_recommendations')}</Text>
                                            </View>
                                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                                        </View>
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Plant Age Selector Modal */}
                <PlantAgeSelector
                    visible={showAgeSelectorModal}
                    onClose={() => setShowAgeSelectorModal(false)}
                    onConfirm={handleAgeConfirm}
                />
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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    processFlowCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    processFlowTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
        textAlign: 'center',
    },
    processStepsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    processStep: {
        flex: 1,
        alignItems: 'center',
    },
    processStepIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    processStepContent: {
        alignItems: 'center',
    },
    processStepLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },

    processArrow: {
        marginHorizontal: 4,
    },
    photoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 32,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    photoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    photoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    photoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    imageContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    imageOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    imageQualityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    imageQualityText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
    },
    retakeButtonBelowImage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    retakeBelowImageText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4CAF50',
    },
    // Dual image styles
    dualPhotoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dualPhotoHeader: {
        marginBottom: 20,
        alignItems: 'center',
    },
    dualPhotoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    dualPhotoSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    dualImagesContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    singleImageWrapper: {
        flex: 1,
    },
    singleImageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    singleImageLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    dualPreviewImage: {
        width: '100%',
        height: 140,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    instructionsCard: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    instructionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionContent: {
        flex: 1,
    },
    instructionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E40AF',
        marginBottom: 4,
    },
    instructionText: {
        fontSize: 13,
        color: '#1E40AF',
        lineHeight: 18,
        fontWeight: '500',
    },
    actionButtonsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    primaryActionButton: {
        borderRadius: 16,
    },
    analyzingButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    analyzingText: {
        color: '#4CAF50',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
        marginLeft: 12,
    },
    brownAnalyzingButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#8B7355',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    brownAnalyzingText: {
        color: '#8B7355',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
        marginLeft: 12,
    },
    primaryActionGradient: {
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    actionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionTextContainer: {
        flex: 1,
    },
    primaryActionText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    actionSubtext: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.9,
        marginTop: 2,
    },
    secondaryActionButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#8B7355',
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    secondaryActionText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B7355',
        letterSpacing: 0.2,
    },
    secondarySubtext: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8B7355',
        opacity: 0.7,
        marginTop: 2,
    },
    secondaryActionButtonLeaf: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#4CAF50',
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    secondaryActionTextLeaf: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4CAF50',
        letterSpacing: 0.2,
    },
    secondarySubtextLeaf: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4CAF50',
        opacity: 0.7,
        marginTop: 2,
    },
});

export default PhotoPreview;
