import { Platform } from 'react-native';
import apiConfig from '../config/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatchSource     = 'own_farm' | 'purchased';
export type ProcessStage    = 'raw' | 'drying' | 'distilling' | 'quality_check' | 'complete';

export interface MaterialBatchCreate {
  batch_name?: string;
  cinnamon_type: string;
  mass_kg: number;
  dried_mass_kg?: number;
  plant_part: string;
  plant_age_years: number;
  harvest_season: string;
  source: BatchSource;
  process_stage?: ProcessStage;
}

export interface MaterialBatchUpdate {
  batch_name?: string;
  cinnamon_type?: string;
  mass_kg?: number;
  dried_mass_kg?: number;
  plant_part?: string;
  plant_age_years?: number;
  harvest_season?: string;
  source?: BatchSource;
  process_stage?: ProcessStage;
}

export interface MaterialBatchRead {
  id: number;
  batch_name: string | null;
  cinnamon_type: string;
  mass_kg: number;
  dried_mass_kg: number | null;
  plant_part: string;
  plant_age_years: number;
  harvest_season: string;
  source: BatchSource;
  process_stage: ProcessStage;
  created_at: string;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

const BATCH_URL = `${BASE_URL}/oil_yield/batch`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function listMaterialBatches(filters?: {
  source?: BatchSource;
  process_stage?: ProcessStage;
}): Promise<MaterialBatchRead[]> {
  const params = new URLSearchParams();
  if (filters?.source)        params.set('source', filters.source);
  if (filters?.process_stage) params.set('process_stage', filters.process_stage);
  const url = params.toString() ? `${BATCH_URL}?${params}` : BATCH_URL;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  return handleResponse<MaterialBatchRead[]>(res);
}

export async function createMaterialBatch(
  payload: MaterialBatchCreate,
): Promise<MaterialBatchRead> {
  const res = await fetch(BATCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MaterialBatchRead>(res);
}

export async function updateMaterialBatch(
  id: number,
  payload: MaterialBatchUpdate,
): Promise<MaterialBatchRead> {
  const res = await fetch(`${BATCH_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MaterialBatchRead>(res);
}

