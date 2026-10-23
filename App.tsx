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

import { BEFORE_OPTIONS, alertSummary, optionAvailable, pruneAlerts, type EventAlert } from './src/core/alerts.ts';
import { CATEGORIES, categoriesOf } from './src/core/categories.ts';
import { DEFAULT_FAVORITES, type Favorites } from './src/core/favorites.ts';
import { updateBackgroundRefresh } from './src/data/background.ts';
import { applyFilter, countdown, distinct, toggle } from './src/core/filter.ts';
import { REGIONS, type RegionId } from './src/core/parsers.ts';
import { EMPTY_FILTER, type EventOccurrence, type FilterPreset, type FilterState } from './src/core/types.ts';
import { fetchEvents, type FetchResult } from './src/data/sources.ts';
import {
  cancelAlert,
  ensureNotificationsReady,
  exactAlarmsAllowed,
  requestExactAlarms,
  rescheduleAll,
  scheduleAlert,
  scheduledCount,
  sendTestNotifications,
  syncFavorites,
} from './src/data/notifications.ts';
import {
  loadAlerts,
  loadAutoUpdate,
  loadCache,
  loadFavorites,
  loadPresets,
  loadRegion,
  saveAlerts,
  saveAutoUpdate,
  saveCache,
  saveFavorites,
  savePresets,
  saveRegion,
} from './src/data/storage.ts';
import { checkForUpdate, currentBuild, installUpdate, updatesSupported, type UpdateInfo } from './src/data/updates.ts';

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
  const [alerts, setAlerts] = useState<Record<string, EventAlert>>({});
  const [bellEvent, setBellEvent] = useState<EventOccurrence | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorites>(DEFAULT_FAVORITES);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

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
      const [cached, storedPresets, storedRegion, storedAlerts] = await Promise.all([loadCache(), loadPresets(), loadRegion(), loadAlerts()]);
      if (cached && cached.region === storedRegion) setData(cached);
      if (storedPresets) setPresets(storedPresets);
      const pruned = pruneAlerts(storedAlerts, Date.now());
      setAlerts(pruned);
      // Bells set by older versions were scheduled as inexact alarms; redo them.
      if (Object.keys(pruned).length > 0) resyncAlerts(pruned);
      setRegion(storedRegion);
      setFavorites(await loadFavorites());
      setFavoritesLoaded(true);
      const auto = await loadAutoUpdate();
      setAutoUpdate(auto);
      if (auto) lookForUpdate(true);
    })();
  }, []);

  const startUpdate = async (update: UpdateInfo) => {
    try {
      setUpdateStatus('Téléchargement de la mise à jour…');
      await installUpdate(update, (ratio) => setUpdateStatus(`Téléchargement de la mise à jour… ${Math.round(ratio * 100)} %`));
      setUpdateStatus(null);
    } catch (e) {
      setUpdateStatus(null);
      Alert.alert('Mise à jour impossible', e instanceof Error ? e.message : String(e));
    }
  };

  /** At launch (`silent`) only an available update is reported; from the button, every outcome is. */
  const lookForUpdate = async (silent: boolean) => {
    if (!updatesSupported) return;
    try {
      if (!silent) setUpdateStatus('Recherche de mise à jour…');
      const update = await checkForUpdate();
      setUpdateStatus(null);
      if (update) {
        Alert.alert('Mise à jour disponible', `La version ${update.buildNumber} est disponible (tu as la ${currentBuild}). L’installer maintenant ?`, [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Installer', onPress: () => startUpdate(update) },
        ]);
      } else if (!silent) {
        Alert.alert('Application à jour', `Tu as la dernière version (${currentBuild}).`);
      }
    } catch (e) {
      setUpdateStatus(null);
      if (!silent) Alert.alert('Vérification impossible', e instanceof Error ? e.message : String(e));
    }
  };

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

  // Keep favourite notifications in line with the latest schedule, bells and choices.
  useEffect(() => {
    if (!favoritesLoaded || events.length === 0) return;
    const following = favorites.conditions.length > 0;
    updateBackgroundRefresh(following);
    (async () => {
      if (following && !(await ensureNotificationsReady())) return;
      await syncFavorites(events, favorites, alerts).catch(() => {});
    })();
  }, [events, favorites, alerts, favoritesLoaded]);

  const changeFavorites = (next: Favorites) => {
    setFavorites(next);
    saveFavorites(next);
  };

  const toggleFavorite = (condition: string) =>
    changeFavorites({ ...favorites, conditions: toggle(favorites.conditions, condition) });

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

  const resyncAlerts = async (current: Record<string, EventAlert>) => {
    try {
      const next = await rescheduleAll(current);
      setAlerts(next);
      saveAlerts(next);
    } catch {
      // Keep the existing schedule if the native call fails.
    }
  };

  /** Replaces the bell on `event`; empty choices remove it. */
  const updateAlert = async (event: EventOccurrence, minutesBefore: number[], atEnd: boolean) => {
    const previous = alerts[event.id];
    if (previous) await cancelAlert(previous);
    const next = { ...alerts };
    delete next[event.id];
    if (minutesBefore.length > 0 || atEnd) {
      if (!(await ensureNotificationsReady())) return;
      const base = { event, minutesBefore, atEnd };
      next[event.id] = { ...base, notificationIds: await scheduleAlert(base) };
    }
    setAlerts(next);
    saveAlerts(next);
  };

  /** Running event: the bell toggles an "event finished" reminder. Upcoming: choose reminders. */
  const onBell = (event: EventOccurrence) => {
    if (event.start > Date.now()) {
      setBellEvent(event);
      return;
    }
    const current = alerts[event.id];
    if (current?.atEnd) updateAlert(event, current.minutesBefore, false);
    else updateAlert(event, [], true);
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
          {favorites.conditions.length > 0 && (
            <Chip
              label="❤ Favoris"
              active={activePreset === 'favorites'}
              onPress={() => selectPreset({ id: 'favorites', name: 'Favoris', ...EMPTY_FILTER, conditions: favorites.conditions })}
            />
          )}
          {presets.map((p) => (
            <Chip key={p.id} label={p.name} active={activePreset === p.id} onPress={() => selectPreset(p)} onLongPress={() => deletePreset(p)} />
          ))}
        </ScrollView>
        <Pressable onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filtres{filterCount ? ` (${filterCount})` : ''}</Text>
        </Pressable>
      </View>

      {updateStatus && (
        <View style={styles.updateBanner}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.text}>{updateStatus}</Text>
        </View>
      )}

      {errors.length > 0 && !data && <ErrorBox errors={errors} />}

      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            now={now}
            alert={alerts[item.id]}
            favorite={favorites.conditions.includes(item.condition)}
            onBell={() => onBell(item)}
            onHeart={() => toggleFavorite(item.condition)}
          />
        )}
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
        autoUpdate={autoUpdate}
        updateStatus={updateStatus}
        onAutoUpdate={(v) => {
          setAutoUpdate(v);
          saveAutoUpdate(v);
        }}
        onCheckUpdate={() => lookForUpdate(false)}
        onExactAlarmsGranted={() => resyncAlerts(alerts)}
        favorites={favorites}
        onFavorites={changeFavorites}
        onClose={() => setShowSettings(false)}
      />

      <AlertModal
        event={bellEvent}
        alert={bellEvent ? alerts[bellEvent.id] : undefined}
        now={now}
        onSave={(minutesBefore, atEnd) => {
          if (bellEvent) updateAlert(bellEvent, minutesBefore, atEnd);
          setBellEvent(null);
        }}
        onClose={() => setBellEvent(null)}
      />
    </SafeAreaView>
  );
}

function EventCard(props: {
  event: EventOccurrence;
  now: number;
  alert?: EventAlert;
  favorite: boolean;
  onBell: () => void;
  onHeart: () => void;
}) {
  const { event, now, alert, favorite, onBell, onHeart } = props;
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
        {alert && <Text style={styles.cardAlert}>🔔 {alertSummary(alert)}</Text>}
      </View>
      <View style={styles.cardSide}>
        <Text style={[styles.countdown, running && { color: colors.live }]}>{text}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onHeart}
            hitSlop={8}
            style={[styles.bell, favorite && styles.heartActive]}
            accessibilityLabel={favorite ? `Ne plus suivre ${event.condition}` : `Suivre ${event.condition}`}
          >
            <Text style={[styles.bellText, !favorite && { opacity: 0.45 }]}>{favorite ? '❤️' : '🤍'}</Text>
          </Pressable>
          <Pressable
            onPress={onBell}
            hitSlop={8}
            style={[styles.bell, alert && styles.bellActive]}
            accessibilityLabel={running ? 'Prévenir à la fin' : 'Programmer un rappel'}
          >
            <Text style={[styles.bellText, !alert && { opacity: 0.45 }]}>🔔</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Reminder picker for an upcoming event: several choices can be ticked at once. */
function AlertModal(props: {
  event: EventOccurrence | null;
  alert?: EventAlert;
  now: number;
  onSave: (minutesBefore: number[], atEnd: boolean) => void;
  onClose: () => void;
}) {
  const { event, alert, now } = props;
  const [minutes, setMinutes] = useState<number[]>([]);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    setMinutes(alert?.minutesBefore ?? (event ? [0] : []));
    setAtEnd(alert?.atEnd ?? false);
  }, [event, alert]);

  if (!event) return null;
  const toggleMinutes = (m: number) => setMinutes((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={props.onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Me prévenir</Text>
          <Text style={[styles.cardMap, { marginBottom: 8 }]}>
            {event.condition} · {event.map}
          </Text>
          {BEFORE_OPTIONS.map((o) => {
            const available = optionAvailable(event, o.minutes, now);
            return (
              <CheckRow
                key={o.minutes}
                label={o.label}
                checked={available && minutes.includes(o.minutes)}
                disabled={!available}
                onPress={() => toggleMinutes(o.minutes)}
              />
            );
          })}
          <CheckRow label="À la fin de l’événement" checked={atEnd} onPress={() => setAtEnd((v) => !v)} />
          <View style={[styles.saveRow, { paddingHorizontal: 0, marginTop: 16 }]}>
            {alert && (
              <Pressable onPress={() => props.onSave([], false)} style={[styles.button, styles.buttonGhost]}>
                <Text style={[styles.buttonText, { color: colors.danger }]}>Retirer</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={props.onClose} style={[styles.button, styles.buttonGhost]}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={() => props.onSave(minutes.filter((m) => optionAvailable(event, m, Date.now())), atEnd)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Valider</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CheckRow(props: { label: string; checked: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} disabled={props.disabled} style={[styles.checkRow, props.disabled && { opacity: 0.35 }]}>
      <View style={[styles.checkbox, props.checked && styles.checkboxOn]}>{props.checked && <Text style={styles.checkMark}>✓</Text>}</View>
      <Text style={styles.text}>{props.label}</Text>
    </Pressable>
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
  autoUpdate: boolean;
  updateStatus: string | null;
  onAutoUpdate: (v: boolean) => void;
  onCheckUpdate: () => void;
  onExactAlarmsGranted: () => void;
  favorites: Favorites;
  onFavorites: (f: Favorites) => void;
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

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Favoris ❤</Text>
            {props.favorites.conditions.length === 0 ? (
              <Text style={styles.hint}>Touche le cœur d’un événement pour être prévenu à chaque fois qu’il revient, sur n’importe quelle carte.</Text>
            ) : (
              <>
                <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
                  {props.favorites.conditions.map((c) => (
                    <Chip
                      key={c}
                      label={`${c}  ✕`}
                      active
                      onPress={() => props.onFavorites({ ...props.favorites, conditions: props.favorites.conditions.filter((x) => x !== c) })}
                    />
                  ))}
                </View>
                <Text style={styles.hint}>Me prévenir :</Text>
                <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
                  {BEFORE_OPTIONS.filter((o) => o.minutes <= 60).map((o) => (
                    <Chip
                      key={o.minutes}
                      label={o.minutes === 0 ? 'Au début' : o.label}
                      active={props.favorites.minutesBefore.includes(o.minutes)}
                      onPress={() =>
                        props.onFavorites({ ...props.favorites, minutesBefore: toggle(props.favorites.minutesBefore, o.minutes) })
                      }
                    />
                  ))}
                </View>
              </>
            )}

            {props.visible && <NotificationSettings onExactAlarmsGranted={props.onExactAlarmsGranted} />}

            {updatesSupported && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Mises à jour</Text>
                <Text style={[styles.text, { paddingHorizontal: 16, marginTop: 4 }]}>Version installée : {currentBuild || 'dev'}</Text>
                <View style={styles.switchRow}>
                  <Text style={[styles.text, { flex: 1 }]}>Vérifier à chaque démarrage</Text>
                  <Switch value={props.autoUpdate} onValueChange={props.onAutoUpdate} />
                </View>
                <View style={[styles.saveRow, { marginTop: 12 }]}>
                  <Pressable
                    onPress={props.onCheckUpdate}
                    disabled={!!props.updateStatus}
                    style={[styles.button, { flex: 1 }, !!props.updateStatus && { opacity: 0.5 }]}
                  >
                    <Text style={styles.buttonText}>{props.updateStatus ?? 'Rechercher une mise à jour'}</Text>
                  </Pressable>
                </View>
              </>
            )}
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

/** Shows whether reminders can fire on time and lets the user send test notifications. */
function NotificationSettings({ onExactAlarmsGranted }: { onExactAlarmsGranted: () => void }) {
  const [exact, setExact] = useState<boolean | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setExact(await exactAlarmsAllowed());
    setCount(await scheduledCount());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allow = async () => {
    if (await requestExactAlarms()) onExactAlarmsGranted();
    refresh();
  };

  const test = async () => {
    await sendTestNotifications();
    refresh();
    Alert.alert('Test lancé', 'Tu vas recevoir 3 notifications dans 15, 30 et 45 secondes. Tu peux fermer l’app.');
  };

  return (
    <>
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Notifications</Text>
      <Text style={[styles.text, { paddingHorizontal: 16, marginTop: 4 }]}>
        Rappels à l’heure pile : {exact === null ? '…' : exact ? 'autorisés ✓' : 'non autorisés'}
      </Text>
      {count !== null && <Text style={styles.hint}>Rappels programmés : {count}</Text>}
      <View style={[styles.saveRow, { marginTop: 12 }]}>
        {exact === false && (
          <Pressable onPress={allow} style={[styles.button, { flex: 1 }]}>
            <Text style={styles.buttonText}>Autoriser</Text>
          </Pressable>
        )}
        <Pressable onPress={test} style={[styles.button, styles.buttonGhost, { flex: 1 }]}>
          <Text style={[styles.buttonText, { color: colors.text }]}>Tester les notifications</Text>
        </Pressable>
      </View>
    </>
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
  cardAlert: { color: colors.accent, fontSize: 12, marginTop: 4 },
  updateBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent },
  cardSide: { alignItems: 'flex-end', gap: 8 },
  bell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  bellActive: { backgroundColor: '#3a3220', borderColor: colors.accent },
  bellText: { fontSize: 16 },
  heartActive: { backgroundColor: '#3a1f24', borderColor: colors.danger },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32, borderWidth: 1, borderColor: colors.border },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#111', fontSize: 14, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  errorBox: { marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#2a1618', borderWidth: 1, borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12 },
});
