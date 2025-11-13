/**
 * Metadata Extraction Progress Component
 * Shows progress feedback during ML metadata extraction
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MetadataProgressProps {
    isVisible: boolean;
    stage?: 'analyzing' | 'extracting' | 'storing' | 'complete';
    sampleType?: 'leaf' | 'soil';
}

const MetadataProgress: React.FC<MetadataProgressProps> = ({
    isVisible,
    stage = 'analyzing',
    sampleType = 'leaf'
}) => {
    if (!isVisible) return null;

    const getStageText = () => {
        switch (stage) {
            case 'analyzing':
                return `Analyzing ${sampleType} sample...`;
            case 'extracting':
                return 'Extracting features...';
            case 'storing':
                return 'Saving analysis data...';
            case 'complete':
                return 'Analysis complete!';
            default:
                return 'Processing...';
        }
    };

    const getIcon = () => {
        switch (stage) {
            case 'analyzing':
                return sampleType === 'leaf' ? 'leaf-outline' : 'earth-outline';
            case 'extracting':
                return 'analytics-outline';
            case 'storing':
                return 'save-outline';
            case 'complete':
                return 'checkmark-circle-outline';
            default:
                return 'hourglass-outline';
        }
    };

    return (
        <View style={styles.overlay}>
            <View style={styles.progressCard}>
                <View style={styles.iconContainer}>
                    {stage === 'complete' ? (
                        <Ionicons
                            name={getIcon() as any}
                            size={24}
                            color="#4CAF50"
                        />
                    ) : (
                        <>
                            <ActivityIndicator
                                size="small"
                                color="#2E7D32"
                                style={styles.spinner}
                            />
                            <Ionicons
                                name={getIcon() as any}
                                size={20}
                                color="#2E7D32"
                                style={styles.icon}
                            />
                        </>
                    )}
                </View>

                <Text style={styles.stageText}>
                    {getStageText()}
                </Text>

                <Text style={styles.subtitleText}>
                    {stage === 'complete'
                        ? 'Data ready for ML training'
                        : 'Preparing data for machine learning'
                    }
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    progressCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        marginHorizontal: 40,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    spinner: {
        marginRight: 8,
    },
    icon: {
        marginLeft: 4,
    },
    stageText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitleText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default MetadataProgress;
