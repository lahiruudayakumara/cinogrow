import { currentConfig } from '../config/api';

const BASE = currentConfig.baseUrl;

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

function rowToYieldPrediction(row: any): OilYieldPrediction {
  return {
    batchId: row.batch_id,
    predictedYieldMl: row.predicted_yield_ml,
    predictedYieldLiters: row.predicted_yield_liters,
    inputSummary: {
      dried_mass_kg: row.dried_mass_kg,
      species_variety: row.species_variety,
      plant_part: row.plant_part,
      age_years: row.age_years,
      harvesting_season: row.harvesting_season,
    },
    recommendation: {
      primary: row.recommendation_primary,
      tips: JSON.parse(row.recommendation_tips ?? '[]'),
      quality: row.recommendation_quality,
    },
    predictedAt: row.predicted_at,
  };
}

export async function savePrediction(prediction: OilYieldPrediction): Promise<void> {
  const res = await fetch(`${BASE}/oil_yield/predictions/yield`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_id: prediction.batchId,
      predicted_yield_ml: prediction.predictedYieldMl,
      predicted_yield_liters: prediction.predictedYieldLiters,
      input_summary: prediction.inputSummary,
      recommendation: prediction.recommendation,
      predicted_at: prediction.predictedAt,
    }),
  });
  if (!res.ok) throw new Error(`savePrediction failed: ${res.status}`);
}

export async function loadPredictions(): Promise<PredictionsMap> {
  const res = await fetch(`${BASE}/oil_yield/predictions/yield`);
  if (!res.ok) throw new Error(`loadPredictions failed: ${res.status}`);
  const rows: any[] = await res.json();
  const map: PredictionsMap = {};
  for (const row of rows) {
    const p = rowToYieldPrediction(row);
    map[p.batchId] = p;
  }
  return map;
}

export async function clearPrediction(batchId: number): Promise<void> {
  const res = await fetch(`${BASE}/oil_yield/predictions/yield/${batchId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`clearPrediction failed: ${res.status}`);
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

function rowToDistillationPrediction(row: any): DistillationPrediction {
  return {
    batchId: row.batch_id,
    predictedTimeHours: row.predicted_time_hours,
    distillationCapacityLiters: row.distillation_capacity_liters,
    plantPart: row.plant_part,
    cinnamonType: row.cinnamon_type,
    predictedAt: row.predicted_at,
  };
}

export async function saveDistillationPrediction(prediction: DistillationPrediction): Promise<void> {
  const res = await fetch(`${BASE}/oil_yield/predictions/distillation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_id: prediction.batchId,
      predicted_time_hours: prediction.predictedTimeHours,
      distillation_capacity_liters: prediction.distillationCapacityLiters,
      plant_part: prediction.plantPart,
      cinnamon_type: prediction.cinnamonType,
      predicted_at: prediction.predictedAt,
    }),
  });
  if (!res.ok) throw new Error(`saveDistillationPrediction failed: ${res.status}`);
}

export async function loadDistillationPredictions(): Promise<DistillationPredictionsMap> {
  const res = await fetch(`${BASE}/oil_yield/predictions/distillation`);
  if (!res.ok) throw new Error(`loadDistillationPredictions failed: ${res.status}`);
  const rows: any[] = await res.json();
  const map: DistillationPredictionsMap = {};
  for (const row of rows) {
    const p = rowToDistillationPrediction(row);
    map[p.batchId] = p;
  }
  return map;
}

export async function clearDistillationPrediction(batchId: number): Promise<void> {
  const res = await fetch(`${BASE}/oil_yield/predictions/distillation/${batchId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`clearDistillationPrediction failed: ${res.status}`);
}

// ─── Oil-quality prediction ───────────────────────────────────────────────────

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

function rowToQualityPrediction(row: any): QualityPrediction {
  return {
    batchId: row.batch_id,
    score: row.score,
    label: row.label,
    priceRange: row.price_range,
    recommendations: JSON.parse(row.recommendations ?? '[]'),
    labAdvice: row.lab_advice,
    color: row.color,
    clarity: row.clarity,
    aroma: row.aroma,
    cinnamonType: row.cinnamon_type,
    plantPart: row.plant_part,
    predictedAt: row.predicted_at,
  };
}

export async function saveQualityPrediction(prediction: QualityPrediction): Promise<void> {
  const res = await fetch(`${BASE}/oil_yield/predictions/quality`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch_id: prediction.batchId,
      score: prediction.score,
      label: prediction.label,
      price_range: prediction.priceRange,
      recommendations: prediction.recommendations,
      lab_advice: prediction.labAdvice,
      color: prediction.color,
      clarity: prediction.clarity,
      aroma: prediction.aroma,
      cinnamon_type: prediction.cinnamonType,
      plant_part: prediction.plantPart,
      predicted_at: prediction.predictedAt,
    }),
  });
  if (!res.ok) throw new Error(`saveQualityPrediction failed: ${res.status}`);
}

export async function loadQualityPredictions(): Promise<QualityPredictionsMap> {
  const res = await fetch(`${BASE}/oil_yield/predictions/quality`);
  if (!res.ok) throw new Error(`loadQualityPredictions failed: ${res.status}`);
  const rows: any[] = await res.json();
  const map: QualityPredictionsMap = {};
  for (const row of rows) {
    const p = rowToQualityPrediction(row);
    map[p.batchId] = p;
  }
  return map;
}

export async function clearQualityPrediction(batchId: number): Promise<void> {
  const res = await fetch(`${BASE}/oil_yield/predictions/quality/${batchId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`clearQualityPrediction failed: ${res.status}`);
}

