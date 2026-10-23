import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { isFollowed, type Favorites } from '../core/favorites.ts';
import type { EventOccurrence } from '../core/types.ts';
import { loadCache, loadFavorites } from '../data/storage.ts';
import { EventsWidget, WIDGET_NAME } from './EventsWidget.tsx';

const ROWS = 4;

export function widgetContent(events: EventOccurrence[], fav: Favorites, now: number) {
  const following = fav.rules.length > 0;
  const upcoming = events.filter((e) => e.end > now && (!following || isFollowed(fav, e)));
  return {
    title: following ? 'ARC · Prochains favoris' : 'ARC · Prochains événements',
    events: upcoming.slice(0, ROWS),
  };
}

/** Renders the widget from what the app last saved (schedule cache and favourites). */
export async function renderStoredWidget() {
  const [cache, fav] = await Promise.all([loadCache(), loadFavorites()]);
  const now = Date.now();
  const { title, events } = widgetContent(cache?.events ?? [], fav, now);
  return <EventsWidget title={title} events={events} now={now} />;
}

/** Redraws every placed widget; a no-op when none is on the home screen. */
export async function refreshWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => renderStoredWidget() });
  } catch {
    // The widget is optional; never let it break a refresh.
  }
}
