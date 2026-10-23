import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { syncFavorites } from './notifications.ts';
import { fetchEvents } from './sources.ts';
import { loadAlerts, loadFavorites, loadRegion, saveCache } from './storage.ts';

/**
 * The official schedule only looks ~24 h ahead, so favourite notifications
 * need the schedule to be refreshed even when the app stays closed. Android
 * runs this task roughly at the requested interval (it may be later).
 */
const TASK = 'arc-refresh-favorites';

export async function refreshAndSyncFavorites(): Promise<void> {
  const [region, favorites, alerts] = await Promise.all([loadRegion(), loadFavorites(), loadAlerts()]);
  if (favorites.conditions.length === 0) return;
  const { result } = await fetchEvents(region);
  if (!result) return;
  await saveCache(result);
  await syncFavorites(result.events, favorites, alerts);
}

// Must be defined at module load, so the headless JS run can find it.
TaskManager.defineTask(TASK, async () => {
  try {
    await refreshAndSyncFavorites();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Registers the periodic refresh while there are favourites, unregisters it otherwise. */
export async function updateBackgroundRefresh(enabled: boolean): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK);
    if (enabled && !registered) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 120 });
    if (!enabled && registered) await BackgroundTask.unregisterTaskAsync(TASK);
  } catch {
    // Background work is a bonus; favourites still sync whenever the app is open.
  }
}
