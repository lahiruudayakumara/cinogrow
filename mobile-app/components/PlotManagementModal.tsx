import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { farmAPI, type Plot } from '../services/yield_weather/farmAPI';
import { CinnamonVarietyPicker } from './CinnamonVarietyPicker';
import { DEFAULT_CINNAMON_VARIETY } from '../constants/CinnamonVarieties';

interface PlotManagementModalProps {
  visible: boolean;
  onClose: () => void;
  plots: Plot[];
  farmId: number;
  farmTotalArea: number;
  onPlotsUpdate: (plots: Plot[]) => void;
}

interface PlotEditData {
  id?: number;
  farm_id: number;
  name: string;
  area: number;
  tempArea: string;
  status: 'PREPARING' | 'PLANTED' | 'GROWING' | 'MATURE' | 'HARVESTING' | 'HARVESTED' | 'RESTING';
  crop_type?: string;
  planting_date?: string;
  expected_harvest_date?: string;
  age_months?: number;
  progress_percentage: number;
}

export const PlotManagementModal: React.FC<PlotManagementModalProps> = ({
  visible,
  onClose,
  plots,
  farmId,
  farmTotalArea,
  onPlotsUpdate,
}) => {
  const { t } = useTranslation();
  const [editedPlots, setEditedPlots] = useState<PlotEditData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && plots.length > 0) {
      // Initialize edited plots with current data
      const initialEditedPlots = plots.map(plot => ({
        ...plot,
        tempArea: plot.area.toString(),
      }));
      setEditedPlots(initialEditedPlots);
    }
  }, [visible, plots]);

  const calculateTotalArea = () => {
    return editedPlots.reduce((total, plot) => {
      const area = parseFloat(plot.tempArea) || 0;
      return total + area;
    }, 0);
  };

  const getRemainingArea = () => {
    return farmTotalArea - calculateTotalArea();
  };

  const getAreaPercentage = (area: number) => {
    return farmTotalArea > 0 ? (area / farmTotalArea) * 100 : 0;
  };

  const isValidArea = (areaStr: string) => {
    const area = parseFloat(areaStr);
    return !isNaN(area) && area >= 0.1 && area <= farmTotalArea;
  };

  const isValidTotalArea = () => {
    const total = calculateTotalArea();
    return total <= farmTotalArea && total >= 0;
  };

  const updatePlotArea = (index: number, newArea: string) => {
    const updated = [...editedPlots];
    updated[index].tempArea = newArea;
    setEditedPlots(updated);
  };

  const updatePlotName = (index: number, newName: string) => {
    const updated = [...editedPlots];
    updated[index].name = newName;
    setEditedPlots(updated);
  };

  const updatePlotVariety = (index: number, newVariety: string) => {
    const updated = [...editedPlots];
    updated[index].crop_type = newVariety;
    setEditedPlots(updated);
  };

  const addPlot = () => {
    const remainingArea = getRemainingArea();
    const defaultArea = Math.max(0.1, remainingArea > 1 ? 1 : remainingArea);
    
    const plotNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    const usedNames = editedPlots.map(p => p.name.replace('Plot ', ''));
    const availableName = plotNames.find(name => !usedNames.includes(name)) || `${editedPlots.length + 1}`;

    const newPlot: PlotEditData = {
      id: Date.now(), // Temporary ID for new plots
      farm_id: farmId,
      name: `Plot ${availableName}`,
      area: defaultArea,
      tempArea: defaultArea.toString(),
      status: 'PREPARING' as any,
      crop_type: DEFAULT_CINNAMON_VARIETY,
      progress_percentage: 0,
    };

    setEditedPlots([...editedPlots, newPlot]);
  };

  const removePlot = (index: number) => {
    if (editedPlots.length === 1) {
      Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_farm.plot_management.min_one_plot'));
      return;
    }

    Alert.alert(
      t('yield_weather.my_farm.plot_management.remove_plot'),
      t('yield_weather.my_farm.plot_management.remove_confirm', { name: editedPlots[index].name }),
      [
        { text: t('yield_weather.common.cancel'), style: 'cancel' },
        {
          text: t('yield_weather.my_farm.plot_management.remove'),
          style: 'destructive',
          onPress: () => {
            const updated = editedPlots.filter((_, i) => i !== index);
            setEditedPlots(updated);
          },
        },
      ]
    );
  };

  const distributeAreaEqually = () => {
    const plotCount = editedPlots.length;
    const areaPerPlot = farmTotalArea / plotCount;
    
    const updated = editedPlots.map((plot, index) => ({
      ...plot,
      tempArea: (index === plotCount - 1 
        ? (farmTotalArea - (areaPerPlot * (plotCount - 1))).toFixed(1) // Last plot gets remainder
        : areaPerPlot.toFixed(1)
      ),
    }));
    
    setEditedPlots(updated);
  };

  const savePlots = async () => {
    // Validate all areas
    const invalidPlots = editedPlots.filter(plot => !isValidArea(plot.tempArea));
    if (invalidPlots.length > 0) {
      Alert.alert(t('yield_weather.my_farm.plot_management.invalid_areas'), t('yield_weather.my_farm.plot_management.invalid_areas_message'));
      return;
    }

    if (!isValidTotalArea()) {
      Alert.alert(
        t('yield_weather.my_farm.plot_management.invalid_total'), 
        t('yield_weather.my_farm.plot_management.invalid_total_message', { 
          total: calculateTotalArea().toFixed(1), 
          farm: farmTotalArea 
        })
      );
      return;
    }

    try {
      setLoading(true);

      const isBackendAvailable = await farmAPI.testConnection();

      if (isBackendAvailable) {
        // Update via API
        const updatedPlots: Plot[] = [];

        for (const editedPlot of editedPlots) {
          const plotData = {
            ...editedPlot,
            area: parseFloat(editedPlot.tempArea),
          };

          if (editedPlot.id && editedPlot.id > 0 && plots.find(p => p.id === editedPlot.id)) {
            // Update existing plot
            const updated = await farmAPI.updatePlot(editedPlot.id, {
              name: plotData.name,
              area: plotData.area,
              crop_type: plotData.crop_type,
            });
            updatedPlots.push(updated);
          } else {
            // Create new plot
            const { tempArea, ...plotToCreate } = plotData;
            const created = await farmAPI.createPlot(plotToCreate);
            updatedPlots.push(created);
          }
        }

        // Delete removed plots
        const removedPlots = plots.filter(original => 
          !editedPlots.find(edited => edited.id === original.id)
        );

        for (const removedPlot of removedPlots) {
          if (removedPlot.id) {
            await farmAPI.deletePlot(removedPlot.id);
          }
        }

        onPlotsUpdate(updatedPlots);
        Alert.alert(t('yield_weather.common.success'), t('yield_weather.my_farm.plot_management.success_updated'));
      } else {
        // Update locally for offline mode
        const localUpdatedPlots = editedPlots.map(plot => ({
          ...plot,
          area: parseFloat(plot.tempArea),
        }));
        onPlotsUpdate(localUpdatedPlots);
        Alert.alert(t('yield_weather.common.success'), t('yield_weather.my_farm.plot_management.success_local'));
      }

      onClose();
    } catch (error) {
      console.error('Error saving plots:', error);
      Alert.alert(t('yield_weather.common.error'), t('yield_weather.my_farm.plot_management.failed_save'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>{t('yield_weather.my_farm.plot_management.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('yield_weather.my_farm.plot_management.title')}</Text>
          <TouchableOpacity 
            onPress={savePlots} 
            style={styles.headerButton}
            disabled={loading || !isValidTotalArea()}
          >
            <Text style={[
              styles.saveText,
              { opacity: loading || !isValidTotalArea() ? 0.5 : 1 }
            ]}>
              {t('yield_weather.my_farm.plot_management.save')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Farm Info */}
        <View style={styles.farmInfo}>
          <Text style={styles.farmInfoText}>
            {t('yield_weather.my_farm.plot_management.farm_area')}: {farmTotalArea} {t('yield_weather.common.ha')} • 
            {t('yield_weather.my_farm.plot_management.used')}: {calculateTotalArea().toFixed(1)} {t('yield_weather.common.ha')} • 
            {t('yield_weather.my_farm.plot_management.remaining')}: {getRemainingArea().toFixed(1)} {t('yield_weather.common.ha')}
          </Text>
          {!isValidTotalArea() && (
            <Text style={styles.errorText}>
              ⚠️ {t('yield_weather.my_farm.plot_management.exceeds_farm_size')}
            </Text>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={distributeAreaEqually}>
              <Ionicons name="pie-chart-outline" size={16} color="#4CAF50" />
              <Text style={styles.actionButtonText}>{t('yield_weather.my_farm.plot_management.distribute_equally')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={addPlot}>
              <Ionicons name="add-outline" size={16} color="#4CAF50" />
              <Text style={styles.actionButtonText}>{t('yield_weather.my_farm.plot_management.add_plot')}</Text>
            </TouchableOpacity>
          </View>

          {/* Plot List */}
          <View style={styles.plotsList}>
            {editedPlots.map((plot, index) => (
              <View key={plot.id || index} style={styles.plotCard}>
                <View style={styles.plotCardHeader}>
                  <TextInput
                    style={styles.plotNameInput}
                    value={plot.name}
                    onChangeText={(name) => updatePlotName(index, name)}
                    placeholder={t('yield_weather.my_farm.plot_management.plot_name')}
                  />
                  {editedPlots.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removePlot(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.areaSection}>
                  <View style={styles.areaInputContainer}>
                    <Text style={styles.areaLabel}>{t('yield_weather.my_farm.plot_management.area_ha')}</Text>
                    <TextInput
                      style={[
                        styles.areaInput,
                        { borderColor: isValidArea(plot.tempArea) ? '#D1D5DB' : '#EF4444' }
                      ]}
                      value={plot.tempArea}
                      onChangeText={(area) => updatePlotArea(index, area)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                    />
                  </View>
                  
                  {/* Visual representation */}
                  <View style={styles.areaVisualization}>
                    <View style={styles.areaBarContainer}>
                      <View
                        style={[
                          styles.areaBar,
                          {
                            width: `${Math.min(getAreaPercentage(parseFloat(plot.tempArea) || 0), 100)}%`,
                            backgroundColor: isValidArea(plot.tempArea) ? '#4CAF50' : '#EF4444',
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.percentageText}>
                      {getAreaPercentage(parseFloat(plot.tempArea) || 0).toFixed(1)}% {t('yield_weather.my_farm.plot_management.of_farm')}
                    </Text>
                  </View>
                </View>

                <CinnamonVarietyPicker
                  value={plot.crop_type}
                  onValueChange={(variety) => updatePlotVariety(index, variety)}
                  label={t('yield_weather.my_farm.plot_management.cinnamon_variety')}
                  style={styles.varietyPicker}
                />

                {!isValidArea(plot.tempArea) && (
                  <Text style={styles.plotErrorText}>
                    {t('yield_weather.my_farm.plot_management.area_range_error', { max: farmTotalArea })}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'right',
  },
  farmInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  farmInfoText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  plotsList: {
    gap: 16,
    marginBottom: 20,
  },
  plotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  plotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  plotNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
    marginRight: 12,
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  areaSection: {
    gap: 12,
  },
  areaInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  areaInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'right',
    minWidth: 80,
    backgroundColor: '#FFFFFF',
  },
  areaVisualization: {
    gap: 8,
  },
  areaBarContainer: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  areaBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  plotErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  varietyPicker: {
    marginTop: 12,
    marginBottom: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});