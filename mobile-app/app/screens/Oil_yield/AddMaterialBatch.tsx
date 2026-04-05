import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import apiConfig from '../../../config/api';

type BatchSource = 'own_farm' | 'purchased';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

interface MaterialBatch {
  id: number;
  batch_name?: string;
  cinnamon_type: string;
  mass_kg: number;
  plant_part: string;
  plant_age_years: number;
  harvest_season: string;
  created_at: string;
}

export default function AddMaterialBatchScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ source?: string }>();
  const [source, setSource] = useState<BatchSource>(
    params.source === 'purchased' ? 'purchased' : 'own_farm'
  );
  const [batchName, setBatchName] = useState('');
  const [cinnamonType, setCinnamonType] = useState('');
  const [massKg, setMassKg] = useState('');
  const [harvestSeason, setHarvestSeason] = useState('');
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<MaterialBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const isPurchased = source === 'purchased';

  // Dropdown options
  const cinnamonTypes = [
    { value: 'Sri Gemunu',        label: t('oil_yield.add_batch.options.cinnamon_types.sri_gemunu') },
    { value: 'Sri Vijaya',        label: t('oil_yield.add_batch.options.cinnamon_types.sri_vijaya') },
  ];
  const harvestSeasons = [
    { value: 'January-May',   label: t('oil_yield.add_batch.options.harvest_seasons.january_may') },
    { value: 'June-December', label: t('oil_yield.add_batch.options.harvest_seasons.june_december') },
  ];

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const response = await fetch(`${API_BASE_URL}/oil_yield/batch`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch batches: ${response.status}`);
      }

      const data = await response.json();
      setBatches(data);
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      Alert.alert(t('oil_yield.add_batch.alerts.error'), t('oil_yield.add_batch.alerts.failed_load'));
    } finally {
      setLoadingBatches(false);
    }
  };

  const submit = async () => {
    try {
      setLoading(true);
      const payload: Record<string, any> = {
        batch_name: batchName.trim() || undefined,
        cinnamon_type: cinnamonType.trim(),
        harvest_season: harvestSeason.trim(),
        source,
      };

      if (isPurchased) {
        payload.mass_kg = parseFloat(massKg);
      }

      if (
        !payload.cinnamon_type ||
        !payload.harvest_season ||
        (isPurchased && (isNaN(payload.mass_kg) || payload.mass_kg <= 0))
      ) {
        Alert.alert(t('oil_yield.add_batch.alerts.validation'), t('oil_yield.add_batch.alerts.fill_fields'));
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/oil_yield/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create batch: ${response.status}`);
      }

      const result = await response.json();
      Alert.alert(t('oil_yield.add_batch.alerts.success'), `${t('oil_yield.add_batch.alerts.batch_created')} (ID: ${result.id})`);
      
      // Reset form
      setCinnamonType('');
      setMassKg('');
      setHarvestSeason('');
      setBatchName('');
      
      // Refresh batches list
      fetchBatches();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const DropdownOption = ({ 
    label, 
    value, 
    selected, 
    onSelect, 
    icon 
  }: {
    label: string;
    value: string;
    selected: boolean;
    onSelect: () => void;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[styles.dropdownOption, selected && styles.dropdownOptionSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.dropdownContent}>
        <View style={styles.dropdownIconCircle}>
          <MaterialCommunityIcons name={icon as any} size={18} color={selected ? '#4aab4e' : '#8E8E93'} />
        </View>
        <Text style={[styles.dropdownLabel, selected && styles.dropdownLabelSelected]}>{label}</Text>
      </View>
      <View style={[styles.radioCircle, selected && { borderColor: '#4aab4e' }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: '#4aab4e' }]} />}
      </View>
    </TouchableOpacity>
  );

  const BatchCard = ({ batch }: { batch: MaterialBatch }) => (
    <View style={styles.batchCard}>
      <BlurView intensity={70} tint="light" style={styles.batchBlur}>
        <View style={styles.batchHeader}>
          <View style={styles.batchIconContainer}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#4aab4e" />
          </View>
          <View style={styles.batchHeaderText}>
            <Text style={styles.batchId}>{batch.batch_name || `Batch ${batch.id}`}</Text>
            <Text style={styles.batchDate}>
              {new Date(batch.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.batchDetails}>
          <View style={styles.batchDetailRow}>
            <View style={styles.batchDetailItem}>
              <MaterialCommunityIcons name="leaf" size={16} color="#8E8E93" />
              <Text style={styles.batchDetailLabel}>{t('oil_yield.add_batch.list.detail_labels.type')}</Text>
            </View>
            <Text style={styles.batchDetailValue}>{batch.cinnamon_type}</Text>
          </View>
          
          <View style={styles.batchDetailRow}>
            <View style={styles.batchDetailItem}>
              <MaterialCommunityIcons name="weight-kilogram" size={16} color="#8E8E93" />
              <Text style={styles.batchDetailLabel}>{t('oil_yield.add_batch.list.detail_labels.mass')}</Text>
            </View>
            <Text style={styles.batchDetailValue}>{batch.mass_kg} kg</Text>
          </View>
          
          <View style={styles.batchDetailRow}>
            <View style={styles.batchDetailItem}>
              <MaterialCommunityIcons name="sprout" size={16} color="#8E8E93" />
              <Text style={styles.batchDetailLabel}>{t('oil_yield.add_batch.list.detail_labels.part')}</Text>
            </View>
            <Text style={styles.batchDetailValue}>{batch.plant_part}</Text>
          </View>
          
          <View style={styles.batchDetailRow}>
            <View style={styles.batchDetailItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#8E8E93" />
              <Text style={styles.batchDetailLabel}>{t('oil_yield.add_batch.list.detail_labels.age')}</Text>
            </View>
            <Text style={styles.batchDetailValue}>{batch.plant_age_years} {t('oil_yield.add_batch.form.plant_age.suffix')}</Text>
          </View>
          
          <View style={styles.batchDetailRow}>
            <View style={styles.batchDetailItem}>
              <MaterialCommunityIcons name="weather-sunny" size={16} color="#8E8E93" />
              <Text style={styles.batchDetailLabel}>{t('oil_yield.add_batch.list.detail_labels.season')}</Text>
            </View>
            <Text style={styles.batchDetailValue}>{batch.harvest_season}</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButtonInline}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#4aab4e" />
          </TouchableOpacity>
          
          <Text style={styles.header}>{t('oil_yield.add_batch.header.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('oil_yield.add_batch.header.subtitle')}
          </Text>
        </View>

        {/* ── Source Toggle ── */}
        <View style={styles.sourceToggleContainer}>
          <TouchableOpacity
            style={[
              styles.sourceToggleBtn,
              !isPurchased && styles.sourceToggleBtnActiveGreen,
            ]}
            onPress={() => setSource('own_farm')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="leaf"
              size={18}
              color={!isPurchased ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[
                styles.sourceToggleBtnText,
                !isPurchased && styles.sourceToggleBtnTextActive,
              ]}
            >
              {t('oil_yield.add_batch.source.own_farm')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sourceToggleBtn,
              isPurchased && styles.sourceToggleBtnActivePurple,
            ]}
            onPress={() => setSource('purchased')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="cart"
              size={18}
              color={isPurchased ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[
                styles.sourceToggleBtnText,
                isPurchased && styles.sourceToggleBtnTextActive,
              ]}
            >
              {t('oil_yield.add_batch.source.purchased')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Source context hint */}
        <View
          style={[
            styles.sourceHint,
            isPurchased ? styles.sourceHintPurple : styles.sourceHintGreen,
          ]}
        >
          <MaterialCommunityIcons
            name={isPurchased ? 'information-outline' : 'information-outline'}
            size={15}
            color={isPurchased ? '#7C3AED' : '#15803D'}
          />
          <Text style={[styles.sourceHintText, { color: isPurchased ? '#7C3AED' : '#15803D' }]}>
            {isPurchased
              ? t('oil_yield.add_batch.source.hint_purchased')
              : t('oil_yield.add_batch.source.hint_own_farm')}
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('oil_yield.add_batch.section_new.title')}</Text>
        </View>

          {/* Batch Name */}
          <View style={styles.inputCard}>
            <BlurView intensity={70} tint="light" style={styles.cardBlur}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconCircle}>
                  <MaterialCommunityIcons name="package-variant" size={20} color="#4aab4e" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.label}>{t('oil_yield.add_batch.form.batch_name.label')}</Text>
                  <Text style={styles.labelSubtext}>{t('oil_yield.add_batch.form.batch_name.subtitle')}</Text>
                </View>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={batchName}
                  onChangeText={setBatchName}
                  placeholder={t('oil_yield.add_batch.form.batch_name.placeholder')}
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </BlurView>
          </View>

        {/* Cinnamon Type */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="leaf" size={20} color="#4aab4e" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.add_batch.form.cinnamon_type.label')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.add_batch.form.cinnamon_type.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.dropdownGroup}>
              {cinnamonTypes.map((item) => (
                <DropdownOption
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  selected={cinnamonType === item.value}
                  onSelect={() => setCinnamonType(item.value)}
                  icon="leaf"
                />
              ))}
            </View>
          </BlurView>
        </View>

        {/* Mass — only shown for purchased */}
        {isPurchased && (
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="weight-kilogram" size={20} color="#4aab4e" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.add_batch.form.mass.label')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.add_batch.form.mass.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={massKg}
                onChangeText={setMassKg}
                keyboardType="decimal-pad"
                placeholder="25.5"
                placeholderTextColor="#C7C7CC"
              />
              <View style={styles.inputSuffix}>
                <Text style={styles.inputSuffixText}>{t('oil_yield.add_batch.form.mass.suffix')}</Text>
              </View>
            </View>
          </BlurView>
        </View>
        )}

        {/* Harvest Season */}
        <View style={styles.inputCard}>
          <BlurView intensity={70} tint="light" style={styles.cardBlur}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <MaterialCommunityIcons name="weather-sunny" size={20} color="#4aab4e" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.label}>{t('oil_yield.add_batch.form.harvest_season.label')}</Text>
                <Text style={styles.labelSubtext}>{t('oil_yield.add_batch.form.harvest_season.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.dropdownGroup}>
              {harvestSeasons.map((item) => (
                <DropdownOption
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  selected={harvestSeason === item.value}
                  onSelect={() => setHarvestSeason(item.value)}
                  icon="weather-sunny"
                />
              ))}
            </View>
          </BlurView>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <BlurView intensity={100} tint="dark" style={styles.submitButtonBlur}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{t('oil_yield.add_batch.buttons.creating')}</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{t('oil_yield.add_batch.buttons.create')}</Text>
              </>
            )}
          </BlurView>
        </TouchableOpacity>

        {/* Batches List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('oil_yield.add_batch.list.title')}</Text>
          {batches.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{batches.length}</Text>
            </View>
          )}
        </View>

        {loadingBatches ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4aab4e" />
            <Text style={styles.loadingText}>{t('oil_yield.add_batch.list.loading')}</Text>
          </View>
        ) : batches.length === 0 ? (
          <View style={styles.emptyCard}>
            <BlurView intensity={70} tint="light" style={styles.emptyBlur}>
              <MaterialCommunityIcons name="package-variant" size={48} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>{t('oil_yield.add_batch.list.empty_title')}</Text>
              <Text style={styles.emptySubtext}>
                {t('oil_yield.add_batch.list.empty_subtitle')}
              </Text>
            </BlurView>
          </View>
        ) : (
          batches.map((batch) => <BatchCard key={batch.id} batch={batch} />)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerIconContainer: {
    // marginBottom: 16,
  },
  headerIconCircle: {
    // width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(55, 255, 48, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(48, 255, 55, 0.2)',
  },
  backButtonInline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#3C3C43',
    opacity: 0.6,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.35,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(48, 255, 72, 0.12)',
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4aab4e',
    letterSpacing: 0.2,
  },
  inputCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    letterSpacing: -0.41,
  },
  labelSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  dropdownGroup: {
    gap: 10,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(48, 255, 62, 0.08)',
    borderColor: 'rgba(51, 255, 48, 0.3)',
  },
  dropdownContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(66, 197, 66, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.24,
  },
  dropdownLabelSelected: {
    color: '#4aab4e',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    padding: 16,
    letterSpacing: -0.32,
  },
  inputSuffix: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  inputSuffixText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonBlur: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.41,
  },
  batchCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  batchBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  batchIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(48, 255, 72, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchHeaderText: {
    flex: 1,
  },
  batchId: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
    marginBottom: 2,
  },
  batchDate: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  batchDetails: {
    gap: 10,
  },
  batchDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: -0.24,
  },
  batchDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.24,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.24,
  },
  emptyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  emptyBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.38,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.24,
  },

  // Source Toggle
  sourceToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  sourceToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 7,
  },
  sourceToggleBtnActiveGreen: {
    backgroundColor: '#4aab4e',
    shadowColor: '#4aab4e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sourceToggleBtnActivePurple: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sourceToggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.24,
  },
  sourceToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  sourceHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  sourceHintGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  sourceHintPurple: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  sourceHintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});