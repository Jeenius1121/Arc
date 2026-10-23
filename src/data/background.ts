import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { refreshWidget } from '../widget/update.tsx';
import { planSlots } from '../core/planner.ts';
import { shoppingList } from '../core/progress.ts';
import { loadGameData } from './gamedataStore.ts';
import { syncFavorites, syncPlanAlerts } from './notifications.ts';
import { fetchEvents } from './sources.ts';
import { loadAlerts, loadFavorites, loadProgress, loadRegion, saveCache } from './storage.ts';

/**
 * The official schedule only looks ~24 h ahead, so favourite notifications and
 * the home-screen widget need it refreshed even while the app stays closed.
 * Android runs this task roughly at the requested interval (it may be later).
 */
const TASK = 'arc-refresh-favorites';

export async function refreshInBackground(): Promise<void> {
  const [region, favorites, alerts] = await Promise.all([loadRegion(), loadFavorites(), loadAlerts()]);
  const { result } = await fetchEvents(region);
  if (!result) return;
  await saveCache(result);
  if (favorites.rules.length > 0) await syncFavorites(result.events, favorites, alerts);
  if (favorites.smart) {
    const [data, progress] = await Promise.all([loadGameData(), loadProgress()]);
    await syncPlanAlerts(planSlots(data, shoppingList(data, progress), result.events, Date.now()), favorites, data);
  }
  await refreshWidget();
}

// Must be defined at module load, so the headless JS run can find it.
TaskManager.defineTask(TASK, async () => {
  try {
    await refreshInBackground();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh(): Promise<void> {
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(TASK))) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 120 });
  } catch {
    // Background work is a bonus; everything also syncs whenever the app is open.
  }
}
