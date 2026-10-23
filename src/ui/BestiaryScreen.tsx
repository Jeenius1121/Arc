import { useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { botTexts, THREAT_COLOR } from '../core/botInfo.ts';
import { duration } from '../core/filter.ts';
import type { Bot, GameData } from '../core/gamedata.ts';
import { conditionName, mapName } from '../core/names.ts';
import type { EventOccurrence } from '../core/types.ts';
import { ItemImage } from './common.tsx';
import { colors, ui } from './theme.ts';

/** Every ARC with its threat, weak point, maps, drops and when it shows up more. */
export function BestiaryScreen(props: {
  data: GameData;
  events: EventOccurrence[];
  now: number;
  onOpenItem: (id: string) => void;
  onOpenEvent: (e: EventOccurrence) => void;
}) {
  const [open, setOpen] = useState<Bot | null>(null);
  const bots = [...props.data.bots].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={bots}
        keyExtractor={(b) => b.id}
        contentContainerStyle={ui.list}
        renderItem={({ item: b }) => {
          const t = botTexts(b.id, b.type, b.threat);
          return (
            <Pressable onPress={() => setOpen(b)} style={ui.card}>
              <BotImage bot={b} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={ui.cardTitle}>{b.name}</Text>
                <Text style={ui.muted}>{[t.type, `${b.drops.length} butins`].filter(Boolean).join(' · ')}</Text>
              </View>
              {t.threat ? <Text style={{ color: THREAT_COLOR[b.threat], fontWeight: '700', fontSize: 12 }}>{t.threat}</Text> : null}
            </Pressable>
          );
        }}
      />
      {open && <BotDetail {...props} bot={open} onClose={() => setOpen(null)} />}
    </View>
  );
}

function BotImage({ bot, size }: { bot: Bot; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: '#11151b', overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      {bot.img ? <Image source={{ uri: bot.img }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
    </View>
  );
}

function BotDetail(props: {
  bot: Bot;
  data: GameData;
  events: EventOccurrence[];
  now: number;
  onOpenItem: (id: string) => void;
  onOpenEvent: (e: EventOccurrence) => void;
  onClose: () => void;
}) {
  const { bot, data, now } = props;
  const t = botTexts(bot.id, bot.type, bot.threat);
  // Upcoming occurrences of the conditions during which this ARC is more common.
  const boosted = props.events
    .filter(
      (e) =>
        e.end > now &&
        bot.moreDuring.some((m) => mapName(m.map) === e.map && m.events.some((x) => conditionName(x) === e.condition)),
    )
    .slice(0, 5);

  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={ui.root}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View style={[ui.row, { gap: 14 }]}>
              <BotImage bot={bot} size={88} />
              <View style={{ flex: 1 }}>
                <Text style={ui.title}>{bot.name}</Text>
                {t.type ? <Text style={ui.muted}>{t.type}</Text> : null}
                {t.threat ? <Text style={{ color: THREAT_COLOR[bot.threat], fontWeight: '700' }}>Menace : {t.threat}</Text> : null}
              </View>
            </View>
            {t.desc ? <Text style={[ui.text, { lineHeight: 20 }]}>{t.desc}</Text> : <Text style={ui.muted}>Pas encore de description.</Text>}
            {t.weakness ? (
              <View style={[ui.box, { borderColor: colors.accent }]}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>🎯 Point faible</Text>
                <Text style={ui.text}>{t.weakness}</Text>
              </View>
            ) : null}
            {bot.xp > 0 && <Text style={ui.muted}>Jusqu’à {bot.xp} XP (destruction + fouille)</Text>}

            <Text style={ui.sectionTitleFlush}>Cartes</Text>
            <Text style={ui.text}>{bot.maps.map(mapName).join(', ') || '—'}</Text>

            {bot.moreDuring.length > 0 && (
              <>
                <Text style={ui.sectionTitleFlush}>Plus fréquent pendant</Text>
                {bot.moreDuring.map((m) => (
                  <Text key={m.map} style={ui.text}>
                    {mapName(m.map)} : {m.events.map(conditionName).join(', ')}
                  </Text>
                ))}
                {boosted.length > 0 && (
                  <>
                    <Text style={ui.sectionTitleFlush}>Prochaines occasions</Text>
                    {boosted.map((e) => (
                      <Pressable key={e.id} onPress={() => props.onOpenEvent(e)} style={[ui.row, { paddingVertical: 4 }]}>
                        <Text style={[ui.text, { flex: 1 }]}>
                          {e.condition} · {e.map}
                        </Text>
                        <Text style={{ color: e.start <= now ? colors.live : colors.accent }}>
                          {e.start <= now ? 'en cours' : `dans ${duration(e.start - now)}`}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
              </>
            )}

            <Text style={ui.sectionTitleFlush}>Butin</Text>
            {bot.drops.map((id) => (
              <Pressable key={id} onPress={() => props.onOpenItem(id)} style={[ui.row, { paddingVertical: 4 }]}>
                <ItemImage item={data.items[id]} size={32} />
                <Text style={[ui.text, { flex: 1 }]}>{data.items[id]?.name ?? id}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={ui.modalFooter}>
            <Pressable onPress={props.onClose} style={[ui.button, { paddingVertical: 14 }]}>
              <Text style={ui.buttonText}>Fermer</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
