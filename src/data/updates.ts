import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

/**
 * Self-update for the sideloaded Android APK. CI publishes the APK and a
 * version.json ({ buildNumber }) on the public `apk-latest` release; the app
 * compares that number with its own and hands the downloaded APK to the
 * Android package installer, which updates the app in place.
 */
const RELEASE_URL = 'https://github.com/Jeenius1121/Arc/releases/download/apk-latest';

export interface UpdateInfo {
  buildNumber: number;
  apkUrl: string;
}

/** Build number baked in at build time (0 for local/dev builds). */
export const currentBuild: number = Number(Constants.expoConfig?.extra?.buildNumber ?? 0);

export const updatesSupported = Platform.OS === 'android';

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const res = await fetch(`${RELEASE_URL}/version.json?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(res.status === 404 ? 'page des versions inaccessible (dépôt privé ?)' : `HTTP ${res.status}`);
  const { buildNumber } = (await res.json()) as { buildNumber: number };
  if (!(buildNumber > currentBuild)) return null;
  return { buildNumber, apkUrl: `${RELEASE_URL}/app-release.apk` };
}

/** Downloads the APK (reporting progress 0..1) and opens the system installer. */
export async function installUpdate(update: UpdateInfo, onProgress: (ratio: number) => void): Promise<void> {
  const destination = new File(Paths.cache, `arc-events-${update.buildNumber}.apk`);
  if (destination.exists) destination.delete();
  const task = File.createDownloadTask(update.apkUrl, destination, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress(bytesWritten / totalBytes);
    },
  });
  const file = await task.downloadAsync();
  if (!file) throw new Error('téléchargement interrompu');
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
