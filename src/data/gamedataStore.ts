import { File, Paths } from 'expo-file-system';

import type { GameData } from '../core/gamedata.ts';
import bundled from './gamedata.json';

/**
 * Game data ships inside the app and CI also publishes a fresh copy next to
 * the APK, so items, quests and recipes stay current between app updates.
 */
const REMOTE_URL = 'https://github.com/Jeenius1121/Arc/releases/download/apk-latest/gamedata.json';
const DAY = 24 * 3600_000;

export const bundledGameData = bundled as unknown as GameData;

function cacheFile(): File {
  return new File(Paths.document, 'gamedata.json');
}

function newer(a: GameData, b: GameData): boolean {
  return Date.parse(a.generatedAt) > Date.parse(b.generatedAt);
}

/** The most recent data available offline (downloaded copy if newer than the bundled one). */
export async function loadGameData(): Promise<GameData> {
  try {
    const file = cacheFile();
    if (file.exists) {
      const cached = JSON.parse(await file.text()) as GameData;
      if (newer(cached, bundledGameData)) return cached;
    }
  } catch {
    // Corrupt or unreadable cache: fall back to the bundled data.
  }
  return bundledGameData;
}

/** Downloads the published data if it is newer than `current`; returns it, or null when unchanged. */
export async function refreshGameData(current: GameData): Promise<GameData | null> {
  if (Date.now() - Date.parse(current.generatedAt) < DAY) return null;
  try {
    const res = await fetch(`${REMOTE_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const text = await res.text();
    const remote = JSON.parse(text) as GameData;
    if (!remote.items || !newer(remote, current)) return null;
    const file = cacheFile();
    if (file.exists) file.delete();
    file.create();
    await file.write(text);
    return remote;
  } catch {
    return null;
  }
}
