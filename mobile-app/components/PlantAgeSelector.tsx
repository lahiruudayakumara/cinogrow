import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface PlantAgeSelectorProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (plantAge: number) => void;
}

const PlantAgeSelector: React.FC<PlantAgeSelectorProps> = ({
    visible,
    onClose,
    onConfirm,
}) => {
    const { t } = useTranslation();
    const [selectedAge, setSelectedAge] = useState<number | null>(null);
    const [customAge, setCustomAge] = useState<string>('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Age ranges with descriptions
    const ageOptions = [
        { years: 1, labelKey: 'year_0_1', icon: 'leaf-outline' },
        { years: 2, labelKey: 'year_1_2', icon: 'flower-outline' },
        { years: 3, labelKey: 'year_2_3', icon: 'git-branch-outline' },
        { years: 4, labelKey: 'year_3_5', icon: 'fitness-outline' },
        { years: 7, labelKey: 'year_5_10', icon: 'ribbon-outline' },
        { years: 12, labelKey: 'year_10_plus', icon: 'trophy-outline' },
    ];

    const handleAgeSelect = (years: number) => {
        setSelectedAge(years);
        setShowCustomInput(false);
        setCustomAge('');
    };

    const handleCustomAgeSelect = () => {
        setShowCustomInput(true);
        setSelectedAge(null);
    };

    const handleConfirm = () => {
        const finalAge = showCustomInput && customAge ? parseInt(customAge) : selectedAge;

        if (!finalAge || finalAge <= 0) {
            return;
        }

        onConfirm(finalAge);
        // Reset state
        setSelectedAge(null);
        setCustomAge('');
        setShowCustomInput(false);
    };

    const handleCancel = () => {
        setSelectedAge(null);
        setCustomAge('');
        setShowCustomInput(false);
        onClose();
    };

    const isConfirmDisabled = !selectedAge && (!showCustomInput || !customAge || parseInt(customAge) <= 0);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <Ionicons name="calendar-outline" size={24} color="#4CAF50" />
                            <Text style={styles.headerTitle}>{t('fertilizer.plant_age_selector.title')}</Text>
                        </View>
                        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Description */}
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>
                            {t('fertilizer.plant_age_selector.description')}
                        </Text>
                    </View>

                    {/* Age Options */}
                    <ScrollView
                        style={styles.optionsContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {ageOptions.map((option) => (
                            <TouchableOpacity
                                key={option.years}
                                style={[
                                    styles.optionCard,
                                    selectedAge === option.years && styles.optionCardSelected,
                                ]}
                                onPress={() => handleAgeSelect(option.years)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionContent}>
                                    <View style={[
                                        styles.iconContainer,
                                        selectedAge === option.years && styles.iconContainerSelected
                                    ]}>
                                        <Ionicons
                                            name={option.icon as any}
                                            size={24}
                                            color={selectedAge === option.years ? '#FFFFFF' : '#4CAF50'}
                                        />
                                    </View>
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[
                                            styles.optionLabel,
                                            selectedAge === option.years && styles.optionLabelSelected
                                        ]}>
                                            {t(`fertilizer.plant_age_selector.age_options.${option.labelKey}.label`)}
                                        </Text>
                                        <Text style={styles.optionDescription}>
                                            {t(`fertilizer.plant_age_selector.age_options.${option.labelKey}.description`)}
                                        </Text>
                                    </View>
                                </View>
                                {selectedAge === option.years && (
                                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                )}
                            </TouchableOpacity>
                        ))}

                        {/* Custom Age Option */}
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                showCustomInput && styles.optionCardSelected,
                            ]}
                            onPress={handleCustomAgeSelect}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionContent}>
                                <View style={[
                                    styles.iconContainer,
                                    showCustomInput && styles.iconContainerSelected
                                ]}>
                                    <Ionicons
                                        name="create-outline"
                                        size={24}
                                        color={showCustomInput ? '#FFFFFF' : '#4CAF50'}
                                    />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={[
                                        styles.optionLabel,
                                        showCustomInput && styles.optionLabelSelected
                                    ]}>
                                        {t('fertilizer.plant_age_selector.custom_age.label')}
                                    </Text>
                                    <Text style={styles.optionDescription}>
                                        {t('fertilizer.plant_age_selector.custom_age.description')}
                                    </Text>
                                </View>
                            </View>
                            {showCustomInput && (
                                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                            )}
                        </TouchableOpacity>

                        {showCustomInput && (
                            <View style={styles.customInputContainer}>
                                <Text style={styles.inputLabel}>{t('fertilizer.plant_age_selector.custom_age.input_label')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('fertilizer.plant_age_selector.custom_age.placeholder')}
                                    keyboardType="numeric"
                                    value={customAge}
                                    onChangeText={setCustomAge}
                                    maxLength={3}
                                />
                            </View>
                        )}
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>{t('fertilizer.plant_age_selector.buttons.cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                isConfirmDisabled && styles.confirmButtonDisabled
                            ]}
                            onPress={handleConfirm}
                            disabled={isConfirmDisabled}
                        >
                            <LinearGradient
                                colors={isConfirmDisabled ? ['#D1D5DB', '#D1D5DB'] : ['#4CAF50', '#45A049']}
                                style={styles.confirmButtonGradient}
                            >
                                <Text style={[
                                    styles.confirmButtonText,
                                    isConfirmDisabled && styles.confirmButtonTextDisabled
                                ]}>
                                    {t('fertilizer.plant_age_selector.buttons.confirm')}
                                </Text>
                                <Ionicons
                                    name="arrow-forward"
                                    size={20}
                                    color={isConfirmDisabled ? '#9CA3AF' : '#FFFFFF'}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    descriptionContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#F0F9FF',
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 8,
    },
    description: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    optionsContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        maxHeight: 400,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    optionCardSelected: {
        borderColor: '#4CAF50',
        backgroundColor: '#F0F9FF',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerSelected: {
        backgroundColor: '#4CAF50',
    },
    optionTextContainer: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    optionLabelSelected: {
        color: '#4CAF50',
    },
    optionDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    customInputContainer: {
        marginTop: 8,
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    actionContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmButton: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    confirmButtonTextDisabled: {
        color: '#9CA3AF',
    },
});

export default PlantAgeSelector;
