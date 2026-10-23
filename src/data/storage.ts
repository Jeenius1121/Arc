import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FilterPreset } from '../core/types.ts';
import type { FetchResult, Source } from './sources.ts';

const PRESETS_KEY = 'arc.presets.v1';
const CACHE_KEY = 'arc.cache.v1';
const SOURCES_KEY = 'arc.sources.v1';

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
export const loadSources = () => load<Source[] | null>(SOURCES_KEY, null);
export const saveSources = (s: Source[]) => save(SOURCES_KEY, s);
