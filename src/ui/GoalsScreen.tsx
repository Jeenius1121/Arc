import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { fold, type GameData } from '../core/gamedata.ts';
import { completeGoal, goalStep, hasGoal, shoppingList, toggleGoal, type Goal, type Progress } from '../core/progress.ts';
import { CheckRow, Chip, ItemImage, Stepper } from './common.tsx';
import { colors, ui } from './theme.ts';

/**
 * Followed goals (quests, workshop levels, project phases) and the shopping
 * list they add up to, with what the player already set aside.
 */
export function GoalsScreen(props: {
  data: GameData;
  progress: Progress;
  onProgress: (p: Progress) => void;
  onOpenItem: (id: string) => void;
}) {
  const { data, progress, onProgress } = props;
  const [picking, setPicking] = useState(false);
  const list = useMemo(() => shoppingList(data, progress), [data, progress]);
  const steps = progress.goals.map((g) => goalStep(data, progress, g));
  const setOwned = (id: string, n: number) => onProgress({ ...progress, owned: { ...progress.owned, [id]: Math.max(0, n) } });
  const missingTotal = list.reduce((s, l) => s + l.missing, 0);

  const complete = (g: Goal, title: string) =>
    Alert.alert('Objectif terminé ?', `« ${title} » sera marqué comme fait et les objets demandés seront retirés de tes objets mis de côté.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Terminé', onPress: () => onProgress(completeGoal(data, progress, g)) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[ui.list, { paddingBottom: 32 }]}>
        <Pressable onPress={() => setPicking(true)} style={ui.button}>
          <Text style={ui.buttonText}>+ Ajouter un objectif (quête, atelier, projet)</Text>
        </Pressable>

        {steps.length === 0 ? (
          <Text style={ui.empty}>
            Ajoute les quêtes, améliorations d’atelier ou projets que tu vises : l’app calcule tout ce qu’il te faut récupérer et te dit quoi garder.
          </Text>
        ) : (
          <>
            <Text style={ui.sectionTitleFlush}>Liste de courses {missingTotal > 0 ? `· ${missingTotal} objets manquants` : '· complète ✓'}</Text>
            {list.map((l) => {
              const item = data.items[l.id];
              return (
                <Pressable key={l.id} onPress={() => props.onOpenItem(l.id)} style={[ui.card, l.missing === 0 && { opacity: 0.55 }]}>
                  <ItemImage item={item} />
                  <View style={{ flex: 1 }}>
                    <Text style={ui.cardTitle}>{item?.name ?? l.id}</Text>
                    <Text style={ui.muted} numberOfLines={2}>
                      {l.for.join(' · ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ color: l.missing ? colors.accent : colors.live, fontWeight: '700' }}>
                      {l.owned}/{l.needed}
                    </Text>
                    <Stepper label="" onMinus={() => setOwned(l.id, l.owned - 1)} onPlus={() => setOwned(l.id, l.owned + 1)} />
                  </View>
                </Pressable>
              );
            })}

            <Text style={ui.sectionTitleFlush}>Mes objectifs</Text>
            {steps.map((s) => (
              <View key={`${s.goal.kind}:${s.goal.id}`} style={ui.box}>
                <Text style={ui.cardTitle}>{s.title}</Text>
                <Text style={ui.muted}>{s.subtitle}</Text>
                {!s.available ? (
                  <Text style={[ui.text, { color: colors.live }]}>Terminé ✓</Text>
                ) : (
                  <Text style={ui.text}>
                    {s.req.length
                      ? s.req.map((r) => `${data.items[r.id]?.name ?? r.id} ${Math.min(progress.owned[r.id] ?? 0, r.n)}/${r.n}`).join(' · ')
                      : 'Aucun objet demandé.'}
                  </Text>
                )}
                <View style={[ui.row, { marginTop: 6 }]}>
                  {s.available && (
                    <Pressable onPress={() => complete(s.goal, s.title)} style={[ui.button, { flex: 1 }]}>
                      <Text style={ui.buttonText}>Terminé ✓</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => onProgress(toggleGoal(progress, s.goal))} style={[ui.button, ui.buttonGhost, { flex: 1 }]}>
                    <Text style={[ui.buttonText, { color: colors.text }]}>Ne plus suivre</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <GoalPicker visible={picking} data={data} progress={progress} onProgress={onProgress} onClose={() => setPicking(false)} />
    </View>
  );
}

function GoalPicker(props: { visible: boolean; data: GameData; progress: Progress; onProgress: (p: Progress) => void; onClose: () => void }) {
  const { data, progress, onProgress } = props;
  const [tab, setTab] = useState<'quest' | 'bench' | 'project'>('quest');
  const [query, setQuery] = useState('');
  const quests = useMemo(() => {
    const q = fold(query.trim());
    return data.quests.filter((x) => !q || fold(x.name).includes(q) || fold(x.trader).includes(q));
  }, [data, query]);

  const toggleDone = (id: string) =>
    onProgress({
      ...progress,
      doneQuests: progress.doneQuests.includes(id) ? progress.doneQuests.filter((x) => x !== id) : [...progress.doneQuests, id],
    });

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={ui.root}>
          <View style={ui.modalHeader}>
            <Text style={ui.title}>Objectifs</Text>
          </View>
          <View style={ui.chipRow}>
            <Chip label="Quêtes" active={tab === 'quest'} onPress={() => setTab('quest')} />
            <Chip label="Atelier" active={tab === 'bench'} onPress={() => setTab('bench')} />
            <Chip label="Projets" active={tab === 'project'} onPress={() => setTab('project')} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }} keyboardShouldPersistTaps="handled">
            {tab === 'quest' && (
              <>
                <TextInput value={query} onChangeText={setQuery} placeholder="Chercher une quête ou un marchand" placeholderTextColor={colors.muted} style={[ui.input, { flex: 0 }]} />
                <Text style={ui.muted}>Coche « Suivre » pour l’ajouter à ta liste de courses, ou « Faite » pour les quêtes déjà terminées.</Text>
                {quests.map((q) => {
                  const done = progress.doneQuests.includes(q.id);
                  const followed = hasGoal(progress, { kind: 'quest', id: q.id });
                  return (
                    <View key={q.id} style={[ui.box, done && { opacity: 0.5 }]}>
                      <Text style={ui.cardTitle}>{q.name}</Text>
                      <Text style={ui.muted}>
                        {q.trader}
                        {q.maps.length ? ` · ${q.maps.join(', ')}` : ''}
                        {q.req.length ? ` · ${q.req.map((r) => `${data.items[r.id]?.name ?? r.id} ×${r.n}`).join(', ')}` : ''}
                      </Text>
                      <View style={ui.row}>
                        <CheckRow label="Suivre" checked={followed} disabled={done} onPress={() => onProgress(toggleGoal(progress, { kind: 'quest', id: q.id }))} />
                        <View style={{ width: 16 }} />
                        <CheckRow label="Faite" checked={done} onPress={() => toggleDone(q.id)} />
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {tab === 'bench' &&
              data.benches.map((b) => {
                const level = progress.benchLevels[b.id] ?? 0;
                const max = Math.max(...b.levels.map((l) => l.level));
                const goal: Goal = { kind: 'bench', id: b.id };
                return (
                  <View key={b.id} style={ui.box}>
                    <Text style={ui.cardTitle}>{b.name}</Text>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={ui.text}>Mon niveau actuel</Text>
                      <Stepper
                        label={`${level}/${max}`}
                        onMinus={() => onProgress({ ...progress, benchLevels: { ...progress.benchLevels, [b.id]: Math.max(0, level - 1) } })}
                        onPlus={() => onProgress({ ...progress, benchLevels: { ...progress.benchLevels, [b.id]: Math.min(max, level + 1) } })}
                      />
                    </View>
                    {level < max ? (
                      <CheckRow label={`Suivre le niveau ${level + 1}`} checked={hasGoal(progress, goal)} onPress={() => onProgress(toggleGoal(progress, goal))} />
                    ) : (
                      <Text style={[ui.text, { color: colors.live }]}>Niveau maximum ✓</Text>
                    )}
                  </View>
                );
              })}

            {tab === 'project' &&
              data.projects.map((p) => {
                const phase = progress.projectPhases[p.id] ?? 0;
                const max = p.phases.length;
                const goal: Goal = { kind: 'project', id: p.id };
                return (
                  <View key={p.id} style={ui.box}>
                    <Text style={ui.cardTitle}>{p.name}</Text>
                    <Text style={ui.muted} numberOfLines={2}>
                      {p.desc}
                    </Text>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={ui.text}>Phases terminées</Text>
                      <Stepper
                        label={`${phase}/${max}`}
                        onMinus={() => onProgress({ ...progress, projectPhases: { ...progress.projectPhases, [p.id]: Math.max(0, phase - 1) } })}
                        onPlus={() => onProgress({ ...progress, projectPhases: { ...progress.projectPhases, [p.id]: Math.min(max, phase + 1) } })}
                      />
                    </View>
                    {phase < max ? (
                      <CheckRow label={`Suivre la phase ${phase + 1}`} checked={hasGoal(progress, goal)} onPress={() => onProgress(toggleGoal(progress, goal))} />
                    ) : (
                      <Text style={[ui.text, { color: colors.live }]}>Projet terminé ✓</Text>
                    )}
                  </View>
                );
              })}
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
