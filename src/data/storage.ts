import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EventAlert } from '../core/alerts.ts';
import { migrateFavorites, type Favorites } from '../core/favorites.ts';
import type { RegionId } from '../core/parsers.ts';
import { migrateProgress, type Progress } from '../core/progress.ts';
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

const ALERTS_KEY = 'arc.alerts.v1';
export const loadAlerts = () => load<Record<string, EventAlert>>(ALERTS_KEY, {});
export const saveAlerts = (a: Record<string, EventAlert>) => save(ALERTS_KEY, a);

const AUTO_UPDATE_KEY = 'arc.autoUpdate.v1';
export const loadAutoUpdate = () => load<boolean>(AUTO_UPDATE_KEY, true);
export const saveAutoUpdate = (v: boolean) => save(AUTO_UPDATE_KEY, v);

const FAVORITES_KEY = 'arc.favorites.v1';
export const loadFavorites = async (): Promise<Favorites> => migrateFavorites(await load<unknown>(FAVORITES_KEY, null));
export const saveFavorites = (f: Favorites) => save(FAVORITES_KEY, f);

const PROGRESS_KEY = 'arc.progress.v1';
export const loadProgress = async (): Promise<Progress> => migrateProgress(await load<unknown>(PROGRESS_KEY, null));
export const saveProgress = (p: Progress) => save(PROGRESS_KEY, p);
