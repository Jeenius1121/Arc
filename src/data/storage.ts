import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RegionId } from '../core/parsers.ts';
import type { FilterPreset } from '../core/types.ts';
import type { FetchResult } from './sources.ts';

const PRESETS_KEY = 'arc.presets.v2';
const CACHE_KEY = 'arc.cache.v2';
const REGION_KEY = 'arc.region.v1';

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function save(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience; the app keeps working in memory.
  }
}

export const loadPresets = () => load<FilterPreset[] | null>(PRESETS_KEY, null);
export const savePresets = (p: FilterPreset[]) => save(PRESETS_KEY, p);
export const loadCache = () => load<FetchResult | null>(CACHE_KEY, null);
export const saveCache = (r: FetchResult) => save(CACHE_KEY, r);
export const loadRegion = () => load<RegionId>(REGION_KEY, 'europe');
export const saveRegion = (r: RegionId) => save(REGION_KEY, r);
