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
import { REGIONS, type RegionId } from './src/core/parsers.ts';
import { EMPTY_FILTER, type EventOccurrence, type FilterPreset, type FilterState } from './src/core/types.ts';
import { fetchEvents, type FetchResult } from './src/data/sources.ts';
import { loadCache, loadPresets, loadRegion, saveCache, savePresets, saveRegion } from './src/data/storage.ts';

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
  const [region, setRegion] = useState<RegionId | null>(null);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async (r: RegionId) => {
    setLoading(true);
    const { result, errors } = await fetchEvents(r);
    setErrors(errors);
    if (result) {
      setData(result);
      saveCache(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const [cached, storedPresets, storedRegion] = await Promise.all([loadCache(), loadPresets(), loadRegion()]);
      if (cached && cached.region === storedRegion) setData(cached);
      if (storedPresets) setPresets(storedPresets);
      setRegion(storedRegion);
    })();
  }, []);

  useEffect(() => {
    if (!region) return;
    refresh(region);
    const t = setInterval(() => refresh(region), AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh, region]);

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

  const savePreset = (name: string) => {
    const preset: FilterPreset = { id: `${Date.now()}`, name, ...filter };
    const next = [...presets, preset];
    setPresets(next);
    savePresets(next);
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

  const changeRegion = (r: RegionId) => {
    setRegion(r);
    saveRegion(r);
    setData(null);
  };

  const filterCount = filter.maps.length + filter.conditions.length + filter.categories.length + (filter.upcomingOnly ? 1 : 0);
  const regionLabel = REGIONS.find((r) => r.id === region)?.label ?? '';
  const time = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ARC Raiders · Événements</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {data ? `${regionLabel} · ${data.source} · maj ${time(data.fetchedAt)}` : loading ? 'Chargement…' : 'Aucune donnée'}
          </Text>
        </View>
        <Pressable onPress={() => setShowSettings(true)} style={styles.iconButton} accessibilityLabel="Réglages">
          <Text style={styles.iconText}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.presetBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Tous" active={activePreset === null && filterCount === 0} onPress={() => selectPreset(null)} />
          {presets.map((p) => (
            <Chip key={p.id} label={p.name} active={activePreset === p.id} onPress={() => selectPreset(p)} onLongPress={() => deletePreset(p)} />
          ))}
        </ScrollView>
        <Pressable onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filtres{filterCount ? ` (${filterCount})` : ''}</Text>
        </Pressable>
      </View>

      {errors.length > 0 && !data && <ErrorBox errors={errors} />}

      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} now={now} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {
              if (region) refresh(region);
            }} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>{events.length ? 'Aucun événement ne correspond à ce filtre.' : 'Tire vers le bas pour charger les événements.'}</Text>
          )
        }
      />

      <FiltersModal
        visible={showFilters}
        filter={filter}
        maps={maps}
        conditions={conditions}
        resultCount={visible.length}
        onChange={editFilter}
        onReset={() => selectPreset(null)}
        onSave={savePreset}
        onClose={() => setShowFilters(false)}
      />

      <SettingsModal
        visible={showSettings}
        region={region}
        data={data}
        errors={errors}
        onRegion={changeRegion}
        onClose={() => setShowSettings(false)}
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

function FiltersModal(props: {
  visible: boolean;
  filter: FilterState;
  maps: string[];
  conditions: string[];
  resultCount: number;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const { filter, onChange } = props;
  const [name, setName] = useState('');
  const save = () => {
    const n = name.trim();
    if (!n) return;
    props.onSave(n);
    setName('');
    props.onClose();
  };

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Filtres</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={props.onReset} style={[styles.button, styles.buttonGhost]}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Tout effacer</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Section title="Catégories">
              {CATEGORIES.map((c) => (
                <Chip key={c.id} label={c.label} active={filter.categories.includes(c.id)} onPress={() => onChange({ categories: toggle(filter.categories, c.id) })} />
              ))}
            </Section>
            <Section title="Cartes">
              {props.maps.map((m) => (
                <Chip key={m} label={m} active={filter.maps.includes(m)} onPress={() => onChange({ maps: toggle(filter.maps, m) })} />
              ))}
            </Section>
            <Section title="Événements">
              {props.conditions.map((c) => (
                <Chip key={c} label={c} active={filter.conditions.includes(c)} onPress={() => onChange({ conditions: toggle(filter.conditions, c) })} />
              ))}
            </Section>
            <View style={styles.switchRow}>
              <Text style={[styles.text, { flex: 1 }]}>Masquer les événements déjà en cours</Text>
              <Switch value={filter.upcomingOnly} onValueChange={(v) => onChange({ upcomingOnly: v })} />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Enregistrer ce filtre</Text>
            <View style={styles.saveRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nom (ex. Orage Barrage)"
                placeholderTextColor={colors.muted}
                style={styles.input}
                onSubmitEditing={save}
              />
              <Pressable onPress={save} style={[styles.button, !name.trim() && { opacity: 0.4 }]}>
                <Text style={styles.buttonText}>Enregistrer</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>Les filtres enregistrés apparaissent en haut de l’écran. Appui long dessus pour les supprimer.</Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable onPress={props.onClose} style={[styles.button, styles.buttonWide]}>
              <Text style={styles.buttonText}>
                Fermer · {props.resultCount} événement{props.resultCount > 1 ? 's' : ''}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function SettingsModal(props: {
  visible: boolean;
  region: RegionId | null;
  data: FetchResult | null;
  errors: string[];
  onRegion: (r: RegionId) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
            <Text style={[styles.title, { paddingHorizontal: 16 }]}>Réglages</Text>
            <Section title="Région du serveur">
              {REGIONS.map((r) => (
                <Chip key={r.id} label={r.label} active={props.region === r.id} onPress={() => props.onRegion(r.id)} />
              ))}
            </Section>
            <Text style={styles.hint}>Les horaires des événements dépendent de la région de ton serveur.</Text>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Source</Text>
            <Text style={[styles.text, { paddingHorizontal: 16 }]}>
              {props.data ? `${props.data.source} · ${props.data.events.length} événements` : 'Aucune donnée chargée'}
            </Text>
            {props.errors.length > 0 && <ErrorBox errors={props.errors} />}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Pressable onPress={props.onClose} style={[styles.button, styles.buttonWide]}>
              <Text style={styles.buttonText}>Fermer</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function ErrorBox({ errors }: { errors: string[] }) {
  return (
    <View style={styles.errorBox}>
      {errors.map((e) => (
        <Text key={e} style={styles.errorText}>
          {e}
        </Text>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>{children}</View>
    </View>
  );
}

function Chip(props: { label: string; active?: boolean; onPress: () => void; onLongPress?: () => void }) {
  return (
    <Pressable onPress={props.onPress} onLongPress={props.onLongPress} style={[styles.chip, props.active && styles.chipActive]}>
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
  presetBar: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, borderBottomWidth: 1, borderColor: colors.border },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: '#111', fontWeight: '600' },
  filterButton: { marginRight: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.accent },
  filterButtonText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  modalFooter: { padding: 16, borderTopWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginTop: 16 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 8 },
  input: { flex: 1, color: colors.text, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  button: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  buttonWide: { paddingVertical: 14 },
  buttonGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#111', fontWeight: '600', fontSize: 15 },
  hint: { color: colors.muted, fontSize: 12, paddingHorizontal: 16, marginTop: 8 },
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
