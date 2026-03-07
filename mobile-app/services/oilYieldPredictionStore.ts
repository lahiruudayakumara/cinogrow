import AsyncStorage from '@react-native-async-storage/async-storage';

const YIELD_KEY        = 'oil_yield_predictions';
const DISTILLATION_KEY = 'distillation_predictions';

// ─── Oil-yield prediction ─────────────────────────────────────────────────────

export interface OilYieldPrediction {
  batchId: number;
  predictedYieldMl: number;
  predictedYieldLiters: number;
  inputSummary: {
    dried_mass_kg: number;
    species_variety: string;
    plant_part: string;
    age_years: number;
    harvesting_season: string;
  };
  recommendation: {
    primary: string;
    tips: string[];
    quality: string;
  };
  predictedAt: string;
}

export type PredictionsMap = Record<number, OilYieldPrediction>;

export async function savePrediction(prediction: OilYieldPrediction): Promise<void> {
  const raw = await AsyncStorage.getItem(YIELD_KEY);
  const map: PredictionsMap = raw ? JSON.parse(raw) : {};
  map[prediction.batchId] = prediction;
  await AsyncStorage.setItem(YIELD_KEY, JSON.stringify(map));
}

export async function loadPredictions(): Promise<PredictionsMap> {
  const raw = await AsyncStorage.getItem(YIELD_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function clearPrediction(batchId: number): Promise<void> {
  const map = await loadPredictions();
  delete map[batchId];
  await AsyncStorage.setItem(YIELD_KEY, JSON.stringify(map));
}

// ─── Distillation-time prediction ─────────────────────────────────────────────

export interface DistillationPrediction {
  batchId: number;
  predictedTimeHours: number;
  distillationCapacityLiters: number;
  plantPart: string;
  cinnamonType: string;
  predictedAt: string;
}

export type DistillationPredictionsMap = Record<number, DistillationPrediction>;

export async function saveDistillationPrediction(prediction: DistillationPrediction): Promise<void> {
  const raw = await AsyncStorage.getItem(DISTILLATION_KEY);
  const map: DistillationPredictionsMap = raw ? JSON.parse(raw) : {};
  map[prediction.batchId] = prediction;
  await AsyncStorage.setItem(DISTILLATION_KEY, JSON.stringify(map));
}

export async function loadDistillationPredictions(): Promise<DistillationPredictionsMap> {
  const raw = await AsyncStorage.getItem(DISTILLATION_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function clearDistillationPrediction(batchId: number): Promise<void> {
  const map = await loadDistillationPredictions();
  delete map[batchId];
  await AsyncStorage.setItem(DISTILLATION_KEY, JSON.stringify(map));
}

// ─── Oil-quality prediction ───────────────────────────────────────────────────

const QUALITY_KEY = 'quality_predictions';

export interface QualityPrediction {
  batchId: number;
  score: number;
  label: string;          // 'Excellent' | 'Good' | 'Fair' | 'Poor'
  priceRange: string;
  recommendations: string[];
  labAdvice: string;
  color: string;
  clarity: string;
  aroma: string;
  cinnamonType: string;
  plantPart: string;
  predictedAt: string;
}

export type QualityPredictionsMap = Record<number, QualityPrediction>;

export async function saveQualityPrediction(prediction: QualityPrediction): Promise<void> {
  const raw = await AsyncStorage.getItem(QUALITY_KEY);
  const map: QualityPredictionsMap = raw ? JSON.parse(raw) : {};
  map[prediction.batchId] = prediction;
  await AsyncStorage.setItem(QUALITY_KEY, JSON.stringify(map));
}

export async function loadQualityPredictions(): Promise<QualityPredictionsMap> {
  const raw = await AsyncStorage.getItem(QUALITY_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function clearQualityPrediction(batchId: number): Promise<void> {
  const map = await loadQualityPredictions();
  delete map[batchId];
  await AsyncStorage.setItem(QUALITY_KEY, JSON.stringify(map));
}
