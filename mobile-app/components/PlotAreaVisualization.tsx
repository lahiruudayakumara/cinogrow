import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Plot } from '../services/yield_weather/farmAPI';

interface PlotAreaVisualizationProps {
  plots: Plot[];
  farmTotalArea: number;
  compact?: boolean;
}

export const PlotAreaVisualization: React.FC<PlotAreaVisualizationProps> = ({
  plots,
  farmTotalArea,
  compact = false,
}) => {
  const getPlotPercentage = (plotArea: number) => {
    return farmTotalArea > 0 ? (plotArea / farmTotalArea) * 100 : 0;
  };

  const getTotalUsedArea = () => {
    return plots.reduce((total, plot) => total + plot.area, 0);
  };

  const getRemainingPercentage = () => {
    const usedArea = getTotalUsedArea();
    return farmTotalArea > 0 ? ((farmTotalArea - usedArea) / farmTotalArea) * 100 : 0;
  };

  const colors = [
    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
    '#00BCD4', '#8BC34A', '#FFEB3B', '#795548', '#607D8B'
  ];

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.title}>Plot Distribution</Text>
        <View style={styles.compactBarContainer}>
          {plots.map((plot, index) => (
            <View
              key={plot.id || index}
              style={[
                styles.compactSegment,
                {
                  width: `${getPlotPercentage(plot.area)}%`,
                  backgroundColor: colors[index % colors.length],
                },
              ]}
            />
          ))}
          {getRemainingPercentage() > 0 && (
            <View
              style={[
                styles.compactSegment,
                {
                  width: `${getRemainingPercentage()}%`,
                  backgroundColor: '#E5E7EB',
                },
              ]}
            />
          )}
        </View>
        <Text style={styles.summaryText}>
          {getTotalUsedArea().toFixed(1)} / {farmTotalArea} ha allocated
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Farm Area Distribution</Text>
      
      {/* Visual bar representation */}
      <View style={styles.barContainer}>
        {plots.map((plot, index) => (
          <View
            key={plot.id || index}
            style={[
              styles.plotSegment,
              {
                flex: getPlotPercentage(plot.area),
                backgroundColor: colors[index % colors.length],
              },
            ]}
          />
        ))}
        {getRemainingPercentage() > 0 && (
          <View
            style={[
              styles.plotSegment,
              {
                flex: getRemainingPercentage(),
                backgroundColor: '#E5E7EB',
              },
            ]}
          />
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {plots.map((plot, index) => (
          <View key={plot.id || index} style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: colors[index % colors.length] },
              ]}
            />
            <Text style={styles.legendText}>
              {plot.name}: {plot.area} ha ({getPlotPercentage(plot.area).toFixed(1)}%)
            </Text>
          </View>
        ))}
        {getRemainingPercentage() > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#E5E7EB' }]} />
            <Text style={styles.legendText}>
              Unallocated: {(farmTotalArea - getTotalUsedArea()).toFixed(1)} ha ({getRemainingPercentage().toFixed(1)}%)
            </Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text style={styles.summaryText}>
          Total Farm Area: {farmTotalArea} hectares
        </Text>
        <Text style={styles.summaryText}>
          Allocated Area: {getTotalUsedArea().toFixed(1)} hectares
        </Text>
        <Text style={styles.summaryText}>
          Remaining Area: {(farmTotalArea - getTotalUsedArea()).toFixed(1)} hectares
        </Text>
        <Text style={styles.summaryText}>
          Utilization: {farmTotalArea > 0 ? ((getTotalUsedArea() / farmTotalArea) * 100).toFixed(1) : 0}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    height: 30,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  compactBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  plotSegment: {
    minWidth: 1,
  },
  compactSegment: {
    height: '100%',
    minWidth: 1,
  },
  legend: {
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  summary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    textAlign: 'center',
  },
});