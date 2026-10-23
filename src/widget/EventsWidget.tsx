import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { EventOccurrence } from '../core/types.ts';

export const WIDGET_NAME = 'ArcEvents';

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Home-screen widget: the next followed events (or the next events at all when
 * nothing is followed). Widgets cannot tick every second, so it shows start
 * times; it is redrawn whenever the app or the background task refreshes.
 */
export function EventsWidget({ events, title, now }: { events: EventOccurrence[]; title: string; now: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#0e1116',
        borderRadius: 16,
        padding: 12,
        flexGap: 6,
      }}
    >
      <TextWidget text={title} style={{ fontSize: 13, color: '#f2c14e', fontWeight: '700' }} />
      {events.length === 0 ? (
        <TextWidget text="Ouvre l’app pour charger le planning" style={{ fontSize: 12, color: '#8b95a3' }} />
      ) : (
        events.map((e) => (
          <FlexWidget key={e.id} style={{ flexDirection: 'row', width: 'match_parent', flexGap: 8 }}>
            <TextWidget
              text={e.start <= now ? 'En cours' : hhmm(e.start)}
              style={{ fontSize: 13, color: e.start <= now ? '#4ade80' : '#e8ecf1', fontWeight: '600' }}
            />
            <TextWidget text={`${e.condition} · ${e.map}`} maxLines={1} truncate="END" style={{ fontSize: 13, color: '#e8ecf1' }} />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
