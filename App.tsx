import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES, categoriesOf } from './src/core/categories.ts';
import { applyFilter, countdown, distinct, toggle } from './src/core/filter.ts';
import { EMPTY_FILTER, type EventOccurrence, type FilterPreset, type FilterState } from './src/core/types.ts';
import { DEFAULT_SOURCES, fetchEvents, type FetchResult, type Source } from './src/data/sources.ts';
import { loadCache, loadPresets, loadSources, saveCache, savePresets, saveSources } from './src/data/storage.ts';

const AUTO_REFRESH_MS = 15 * 60 * 1000;

const DEFAULT_PRESETS: FilterPreset[] = [
  { id: 'night', name: 'Nuit', maps: [], conditions: [], categories: ['night'], upcomingOnly: false },
  { id: 'weather', name: 'Orage / météo', maps: [], conditions: [], categories: ['weather'], upcomingOnly: false },
  { id: 'loot', name: 'Butin bonus', maps: [], conditions: [], categories: ['loot'], upcomingOnly: false },
];

const colors = {
  bg: '#0e1116',
  card: '#181d25',
  border: '#2a313c',
  text: '#e8ecf1',
  muted: '#8b95a3',
  accent: '#f2c14e',
  live: '#4ade80',
  danger: '#f87171',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [now, setNow] = useState(Date.now());
  const [data, setData] = useState<FetchResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(DEFAULT_PRESETS);
  const [sources, setSources] = useState<Source[]>(DEFAULT_SOURCES);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async (list: Source[]) => {
    setLoading(true);
    const { result, errors } = await fetchEvents(list);
    setErrors(errors);
    if (result) {
      setData(result);
      saveCache(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const [cached, storedPresets, storedSources] = await Promise.all([loadCache(), loadPresets(), loadSources()]);
      if (cached) setData(cached);
      if (storedPresets) setPresets(storedPresets);
      const list = storedSources ?? DEFAULT_SOURCES;
      setSources(list);
      refresh(list);
    })();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => refresh(sources), AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh, sources]);

  const events = data?.events ?? [];
  const maps = useMemo(() => distinct(events, 'map'), [events]);
  const conditions = useMemo(() => distinct(events, 'condition'), [events]);
  const visible = useMemo(() => applyFilter(events, filter, now), [events, filter, now]);

  const selectPreset = (p: FilterPreset | null) => {
    setActivePreset(p?.id ?? null);
    setFilter(p ? { maps: p.maps, conditions: p.conditions, categories: p.categories, upcomingOnly: p.upcomingOnly } : EMPTY_FILTER);
  };

  const editFilter = (patch: Partial<FilterState>) => {
    setActivePreset(null);
    setFilter((f) => ({ ...f, ...patch }));
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset: FilterPreset = { id: `${Date.now()}`, name, ...filter };
    const next = [...presets, preset];
    setPresets(next);
    savePresets(next);
    setPresetName('');
    setActivePreset(preset.id);
  };

  const deletePreset = (p: FilterPreset) => {
    Alert.alert('Supprimer le filtre', `Supprimer « ${p.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          const next = presets.filter((x) => x.id !== p.id);
          setPresets(next);
          savePresets(next);
          if (activePreset === p.id) selectPreset(null);
        },
      },
    ]);
  };

  const filterCount = filter.maps.length + filter.conditions.length + filter.categories.length + (filter.upcomingOnly ? 1 : 0);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ARC Raiders · Événements</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {data
              ? `${data.source.label} · maj ${new Date(data.fetchedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : loading
                ? 'Chargement…'
                : 'Aucune donnée'}
          </Text>
        </View>
        <Pressable onPress={() => setShowSettings(true)} style={styles.iconButton} accessibilityLabel="Sources">
          <Text style={styles.iconText}>⚙</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetBar} contentContainerStyle={styles.chipRow}>
        <Chip label="Tous" active={activePreset === null && filterCount === 0} onPress={() => selectPreset(null)} />
        {presets.map((p) => (
          <Chip key={p.id} label={p.name} active={activePreset === p.id} onPress={() => selectPreset(p)} onLongPress={() => deletePreset(p)} />
        ))}
        <Chip label={showFilters ? 'Fermer ▲' : `Filtres${filterCount ? ` (${filterCount})` : ''} ▼`} outline onPress={() => setShowFilters((s) => !s)} />
      </ScrollView>

      {showFilters && (
        <ScrollView style={styles.filters} contentContainerStyle={{ paddingBottom: 12 }}>
          <Section title="Catégories">
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.label} active={filter.categories.includes(c.id)} onPress={() => editFilter({ categories: toggle(filter.categories, c.id) })} />
            ))}
          </Section>
          <Section title="Cartes">
            {maps.map((m) => (
              <Chip key={m} label={m} active={filter.maps.includes(m)} onPress={() => editFilter({ maps: toggle(filter.maps, m) })} />
            ))}
          </Section>
          <Section title="Événements">
            {conditions.map((c) => (
              <Chip key={c} label={c} active={filter.conditions.includes(c)} onPress={() => editFilter({ conditions: toggle(filter.conditions, c) })} />
            ))}
          </Section>
          <View style={styles.switchRow}>
            <Text style={styles.text}>Masquer les événements en cours</Text>
            <Switch value={filter.upcomingOnly} onValueChange={(v) => editFilter({ upcomingOnly: v })} />
          </View>
          <View style={styles.saveRow}>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Nom du filtre (ex. Orage Barrage)"
              placeholderTextColor={colors.muted}
              style={styles.input}
              onSubmitEditing={savePreset}
            />
            <Pressable onPress={savePreset} style={[styles.button, !presetName.trim() && { opacity: 0.4 }]}>
              <Text style={styles.buttonText}>Enregistrer</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Appui long sur un filtre enregistré pour le supprimer.</Text>
        </ScrollView>
      )}

      {errors.length > 0 && !data && (
        <View style={styles.errorBox}>
          {errors.map((e) => (
            <Text key={e} style={styles.errorText}>
              {e}
            </Text>
          ))}
        </View>
      )}

      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} now={now} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refresh(sources)} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>{events.length ? 'Aucun événement ne correspond à ce filtre.' : 'Tire vers le bas pour charger les événements.'}</Text>
          )
        }
      />

      <SettingsModal
        visible={showSettings}
        sources={sources}
        errors={errors}
        onClose={() => setShowSettings(false)}
        onSave={(list) => {
          setSources(list);
          saveSources(list);
          setShowSettings(false);
          refresh(list);
        }}
      />
    </SafeAreaView>
  );
}

function EventCard({ event, now }: { event: EventOccurrence; now: number }) {
  const { running, text } = countdown(event, now);
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const day = new Date(event.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  const cats = categoriesOf(event.condition)
    .map((id) => CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.card, running && { borderColor: colors.live }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{event.condition}</Text>
        <Text style={styles.cardMap}>{event.map}</Text>
        <Text style={styles.cardMeta}>
          {day} · {fmt(event.start)} – {fmt(event.end)}
          {cats ? `  ·  ${cats}` : ''}
        </Text>
      </View>
      <Text style={[styles.countdown, running && { color: colors.live }]}>{text}</Text>
    </View>
  );
}

function SettingsModal(props: {
  visible: boolean;
  sources: Source[];
  errors: string[];
  onClose: () => void;
  onSave: (s: Source[]) => void;
}) {
  const [draft, setDraft] = useState(props.sources);
  useEffect(() => setDraft(props.sources), [props.sources, props.visible]);
  const update = (i: number, url: string) => setDraft((d) => d.map((s, j) => (j === i ? { ...s, url } : s)));

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.title}>Sources des données</Text>
          <Text style={styles.hint}>Essayées dans l'ordre ; la première qui renvoie des événements est utilisée.</Text>
          {draft.map((s, i) => (
            <View key={s.id} style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>{s.label}</Text>
              <TextInput value={s.url} onChangeText={(u) => update(i, u)} autoCapitalize="none" autoCorrect={false} style={styles.input} />
            </View>
          ))}
          {props.errors.length > 0 && (
            <View style={[styles.errorBox, { marginHorizontal: 0 }]}>
              {props.errors.map((e) => (
                <Text key={e} style={styles.errorText}>
                  {e}
                </Text>
              ))}
            </View>
          )}
          <View style={[styles.saveRow, { marginTop: 24 }]}>
            <Pressable onPress={() => setDraft(DEFAULT_SOURCES)} style={[styles.button, styles.buttonGhost]}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Par défaut</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={props.onClose} style={[styles.button, styles.buttonGhost]}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Annuler</Text>
            </Pressable>
            <Pressable onPress={() => props.onSave(draft)} style={styles.button}>
              <Text style={styles.buttonText}>OK</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>{children}</View>
    </View>
  );
}

function Chip(props: { label: string; active?: boolean; outline?: boolean; onPress: () => void; onLongPress?: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      style={[styles.chip, props.active && styles.chipActive, props.outline && styles.chipOutline]}
    >
      <Text style={[styles.chipText, props.active && styles.chipTextActive]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  iconButton: { padding: 8 },
  iconText: { color: colors.text, fontSize: 22 },
  presetBar: { flexGrow: 0 },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipOutline: { backgroundColor: 'transparent' },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: '#111', fontWeight: '600' },
  filters: { maxHeight: 380, borderBottomWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 8 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  input: { flex: 1, color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  button: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  buttonGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#111', fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12, paddingHorizontal: 16, marginTop: 6 },
  text: { color: colors.text },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cardMap: { color: colors.accent, fontSize: 14, marginTop: 2 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  countdown: { color: colors.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'], textAlign: 'right', maxWidth: 140 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  errorBox: { marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#2a1618', borderWidth: 1, borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12 },
});
