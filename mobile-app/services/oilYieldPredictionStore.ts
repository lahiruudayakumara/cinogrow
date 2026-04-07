import { currentConfig } from '../config/api';

const BASE = currentConfig.baseUrl;

// ─── Oil-yield prediction ─────────────────────────────────────────────────────

export interface OilYieldPrediction {
  batchId: number;
  predictedYieldKg: number;
  inputSummary: {
    dried_mass_kg: number;
    species_variety: string;
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

// In-memory store now that backend /predictions/yield endpoints are removed
const inMemoryPredictions: PredictionsMap = {};

function rowToYieldPrediction(row: any): OilYieldPrediction {
  return {
    batchId: row.batch_id,
    predictedYieldKg: row.predicted_yield_kg,
    inputSummary: {
      dried_mass_kg: row.dried_mass_kg,
      species_variety: row.species_variety,
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
  inMemoryPredictions[prediction.batchId] = prediction;
}

export async function loadPredictions(): Promise<PredictionsMap> {
  // Return a shallow copy so callers can't mutate internal state directly
  return { ...inMemoryPredictions };
}

export async function clearPrediction(batchId: number): Promise<void> {
  delete inMemoryPredictions[batchId];
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

// (Oil-quality prediction feature removed)

