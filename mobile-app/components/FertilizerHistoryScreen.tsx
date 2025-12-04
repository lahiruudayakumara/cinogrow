/**
 * Fertilizer History Screen Component
 * Displays historical fertilizer analysis results with filtering options
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import {
    fetchFertilizerHistory,
    deleteFertilizerRecord,
    formatAnalysisDate,
    getSeverityColor,
    formatConfidence,
    FertilizerHistoryRecord,
} from '../../services/fertilizerHistoryService';

export const FertilizerHistoryScreen = () => {
    const [history, setHistory] = useState<FertilizerHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const ITEMS_PER_PAGE = 10;

    // Load history data
    const loadHistory = async (pageNum: number = 0, append: boolean = false) => {
        try {
            if (!append) setLoading(true);

            const data = await fetchFertilizerHistory(
                pageNum * ITEMS_PER_PAGE,
                ITEMS_PER_PAGE
            );

            if (data.length < ITEMS_PER_PAGE) {
                setHasMore(false);
            }

            if (append) {
                setHistory(prev => [...prev, ...data]);
            } else {
                setHistory(data);
            }
        } catch (error) {
            console.error('Error loading history:', error);
            Alert.alert('Error', 'Failed to load history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadHistory(0);
    }, []);

    // Refresh handler
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        loadHistory(0);
    }, []);

    // Load more handler
    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadHistory(nextPage, true);
        }
    };

    // Delete handler
    const handleDelete = (id: number, filename: string) => {
        Alert.alert(
            'Delete Analysis',
            `Are you sure you want to delete "${filename}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteFertilizerRecord(id);
                            setHistory(prev => prev.filter(item => item.id !== id));
                            Alert.alert('Success', 'Analysis deleted');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete analysis');
                        }
                    },
                },
            ]
        );
    };

    // Render item
    const renderItem = ({ item }: { item: FertilizerHistoryRecord }) => {
        const severityColor = getSeverityColor(item.severity);
        const confidence = formatConfidence(item.max_confidence);
        const date = formatAnalysisDate(item.analyzed_at);

        return (
            <TouchableOpacity
                style={styles.card}
                onLongPress={() => handleDelete(item.id, item.image_filename)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.deficiencyContainer}>
                        <Text style={styles.deficiencyText}>
                            {item.primary_deficiency || 'Unknown Deficiency'}
                        </Text>
                        <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                            <Text style={styles.severityText}>{item.severity || 'N/A'}</Text>
                        </View>
                    </View>
                    <Text style={styles.dateText}>{date}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Confidence:</Text>
                        <Text style={styles.infoValue}>{confidence}</Text>
                    </View>

                    {item.plant_age && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Plant Age:</Text>
                            <Text style={styles.infoValue}>{item.plant_age} year{item.plant_age !== 1 ? 's' : ''}</Text>
                        </View>
                    )}

                    {item.recommendations && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Recommendations:</Text>
                            <View style={[styles.severityBadge, { backgroundColor: '#16A34A' }]}>
                                <Text style={styles.severityText}>Available</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Image:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>
                            {item.image_filename}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Dimensions:</Text>
                        <Text style={styles.infoValue}>{item.image_dimensions}</Text>
                    </View>

                    {item.detections && item.detections.length > 0 && (
                        <View style={styles.detectionsContainer}>
                            <Text style={styles.detectionsLabel}>
                                All Detections ({item.detections.length}):
                            </Text>
                            {item.detections.map((detection, idx) => (
                                <View key={idx} style={styles.detectionItem}>
                                    <Text style={styles.detectionText}>
                                        • {detection.deficiency} ({formatConfidence(detection.confidence)})
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // Empty state
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No analysis history yet</Text>
            <Text style={styles.emptySubtext}>
                Start by analyzing a leaf image
            </Text>
        </View>
    );

    // Footer (loading indicator)
    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color="#22C55E" />
            </View>
        );
    };

    if (loading && history.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={styles.loadingText}>Loading history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={history}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#22C55E']}
                    />
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        marginBottom: 12,
    },
    deficiencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    deficiencyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
    },
    severityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    severityText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
    },
    cardBody: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        color: '#6B7280',
        width: 100,
    },
    infoValue: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        flex: 1,
    },
    detectionsContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    detectionsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    detectionItem: {
        marginLeft: 8,
        marginTop: 2,
    },
    detectionText: {
        fontSize: 13,
        color: '#4B5563',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default FertilizerHistoryScreen;
