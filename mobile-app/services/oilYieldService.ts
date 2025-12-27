import { Platform } from 'react-native';
import apiConfig from '../config/api';

export interface MaterialBatchCreate {
  cinnamon_type: string;
  mass_kg: number;
  plant_part: string;
  plant_age_years: number;
  harvest_season: string;
}

export interface MaterialBatchRead extends MaterialBatchCreate {
  id: number;
  created_at: string;
}

// Use localhost for web to avoid LAN IP timeouts in browser
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8000/api/v1'
  : apiConfig.API_BASE_URL;

export async function createMaterialBatch(payload: MaterialBatchCreate): Promise<MaterialBatchRead> {
  const url = `${BASE_URL}/oil_yield/batch`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create batch: ${response.status} ${errorText}`);
  }

  return response.json();
}
