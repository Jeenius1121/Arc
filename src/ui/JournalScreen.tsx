import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { overall, statsBy, type RaidEntry, type RaidStats } from '../core/journal.ts';
import type { EventOccurrence } from '../core/types.ts';
import { Chip } from './common.tsx';
import { colors, ui } from './theme.ts';

const MAPS = ['Champ de bataille du Barrage', 'Port spatial', 'Ville enfouie', 'Portail bleu', 'Stella Montis', 'Riven Tides', 'Col de Pendola'];

/**
 * Two-tap raid log (map, outcome, value) and the stats it adds up to:
 * extraction rate and real yield per map and per map condition.
 */
export function JournalScreen(props: { entries: RaidEntry[]; events: EventOccurrence[]; now: number; onChange: (e: RaidEntry[]) => void }) {
  const { entries, now } = props;
  const [map, setMap] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [by, setBy] = useState<'map' | 'condition' | 'both'>('map');

  // The condition running on that map right now (raids are logged just after).
  const condition = map ? props.events.find((e) => e.map === map && e.start <= now && e.end > now - 30 * 60_000)?.condition : undefined;
  const all = overall(entries);
  const groups = useMemo(() => statsBy(entries, by), [entries, by]);

  const log = (outcome: RaidEntry['outcome']) => {
    if (!map) return;
    const v = Number(value.replace(/\D/g, ''));
    const entry: RaidEntry = { id: `${Date.now()}`, at: Date.now(), map, condition, outcome, value: outcome === 'extract' && v ? v : undefined };
    props.onChange([entry, ...entries]);
    setValue('');
  };

  const remove = (e: RaidEntry) =>
    Alert.alert('Supprimer ce raid ?', '', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => props.onChange(entries.filter((x) => x.id !== e.id)) },
    ]);

  return (
    <ScrollView contentContainerStyle={[ui.list, { paddingBottom: 32 }]} keyboardShouldPersistTaps="handled">
      <View style={ui.box}>
        <Text style={ui.cardTitle}>Raid terminé</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {MAPS.map((m) => (
            <Chip key={m} label={m} active={map === m} onPress={() => setMap(m)} />
          ))}
        </View>
        {condition && <Text style={ui.accentText}>Événement en cours : {condition}</Text>}
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          placeholder="Valeur ramenée (¢), facultatif"
          placeholderTextColor={colors.muted}
          style={[ui.input, { flex: 0 }]}
        />
        <View style={ui.row}>
          <Pressable disabled={!map} onPress={() => log('extract')} style={[ui.button, { flex: 1, backgroundColor: colors.live }, !map && { opacity: 0.4 }]}>
            <Text style={ui.buttonText}>✅ Extrait</Text>
          </Pressable>
          <Pressable disabled={!map} onPress={() => log('death')} style={[ui.button, { flex: 1, backgroundColor: colors.danger }, !map && { opacity: 0.4 }]}>
            <Text style={ui.buttonText}>💀 Mort</Text>
          </Pressable>
        </View>
      </View>

      {entries.length === 0 ? (
        <Text style={ui.empty}>Note chaque raid en deux appuis : l’app calcule ton taux d’extraction et ce que chaque carte et chaque événement te rapporte vraiment.</Text>
      ) : (
        <>
          <StatsRow s={all} highlight />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip label="Par carte" active={by === 'map'} onPress={() => setBy('map')} />
            <Chip label="Par événement" active={by === 'condition'} onPress={() => setBy('condition')} />
            <Chip label="Les deux" active={by === 'both'} onPress={() => setBy('both')} />
          </View>
          {groups.map((s) => (
            <StatsRow key={s.key} s={s} />
          ))}

          <Text style={ui.sectionTitleFlush}>Derniers raids (appui long pour supprimer)</Text>
          {entries.slice(0, 30).map((e) => (
            <Pressable key={e.id} onLongPress={() => remove(e)} style={[ui.row, { paddingVertical: 6 }]}>
              <Text style={{ fontSize: 16 }}>{e.outcome === 'extract' ? '✅' : '💀'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ui.text}>
                  {e.map}
                  {e.condition ? ` · ${e.condition}` : ''}
                </Text>
                <Text style={ui.muted}>{new Date(e.at).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              {e.value ? <Text style={ui.accentText}>{e.value.toLocaleString('fr-FR')} ¢</Text> : null}
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function StatsRow({ s, highlight }: { s: RaidStats; highlight?: boolean }) {
  return (
    <View style={[ui.box, highlight && { borderColor: colors.accent }]}>
      <Text style={ui.cardTitle}>{s.key}</Text>
      <Text style={ui.text}>
        {s.raids} raid{s.raids > 1 ? 's' : ''} · {Math.round(s.rate * 100)} % d’extraction
      </Text>
      <Text style={ui.muted}>
        Rapporte en moyenne {s.yieldPerRaid.toLocaleString('fr-FR')} ¢ par raid ({s.avgValue.toLocaleString('fr-FR')} ¢ quand tu extrais)
      </Text>
    </View>
  );
}
