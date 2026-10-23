import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { duration } from '../core/filter.ts';
import { fold, type GameData } from '../core/gamedata.ts';
import type { PlannedSlot } from '../core/planner.ts';
import type { EventOccurrence } from '../core/types.ts';
import {
  completeGoal,
  goalStep,
  hasGoal,
  markCurrentQuest,
  questAncestors,
  shoppingList,
  toggleGoal,
  type Goal,
  type Progress,
} from '../core/progress.ts';
import { CheckRow, Chip, ItemImage, Stepper } from './common.tsx';
import { colors, ui } from './theme.ts';

/**
 * Followed goals (quests, workshop levels, project phases) and the shopping
 * list they add up to, with what the player already set aside.
 */
export function GoalsScreen(props: {
  data: GameData;
  progress: Progress;
  plan: PlannedSlot[];
  now: number;
  onProgress: (p: Progress) => void;
  onOpenItem: (id: string) => void;
  onOpenEvent: (e: EventOccurrence) => void;
}) {
  const { data, progress, onProgress } = props;
  const [picking, setPicking] = useState(false);
  const [questId, setQuestId] = useState<string | null>(null);
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
            {props.plan.length > 0 && (
              <>
                <Text style={ui.sectionTitleFlush}>🎯 Meilleurs créneaux pour toi</Text>
                {props.plan.map((slot) => (
                  <Pressable key={slot.event.id} onPress={() => props.onOpenEvent(slot.event)} style={[ui.box, { borderColor: colors.accent }]}>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={[ui.cardTitle, { flex: 1 }]}>{slot.event.condition}</Text>
                      <Text style={{ color: slot.event.start <= props.now ? colors.live : colors.accent, fontWeight: '700' }}>
                        {slot.event.start <= props.now ? `en cours · ${duration(slot.event.end - props.now)}` : `dans ${duration(slot.event.start - props.now)}`}
                      </Text>
                    </View>
                    <Text style={ui.accentText}>{slot.event.map}</Text>
                    {slot.reasons.slice(0, 4).map((r) => (
                      <Text key={r.itemId} style={ui.muted}>
                        • {data.items[r.itemId]?.name ?? r.itemId} (il en manque {r.missing}) : {r.why}
                      </Text>
                    ))}
                  </Pressable>
                ))}
              </>
            )}

            <View style={[ui.row, { justifyContent: 'space-between', marginTop: 8 }]}>
              <Text style={[ui.sectionTitleFlush, { marginTop: 0 }]}>Liste de courses {missingTotal > 0 ? `· ${missingTotal} manquants` : '· complète ✓'}</Text>
              {missingTotal > 0 && (
                <Pressable onPress={() => shareList(data, list)} hitSlop={8}>
                  <Text style={ui.accentText}>📣 Partager</Text>
                </Pressable>
              )}
            </View>
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
                <Pressable disabled={s.goal.kind !== 'quest'} onPress={() => setQuestId(s.goal.id)}>
                  <Text style={ui.cardTitle}>
                    {s.title}
                    {s.goal.kind === 'quest' ? '  ›' : ''}
                  </Text>
                </Pressable>
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
      <GoalPicker visible={picking} data={data} progress={progress} onProgress={onProgress} onOpenQuest={setQuestId} onClose={() => setPicking(false)} />
      <QuestSheet data={data} questId={questId} onOpenItem={props.onOpenItem} onOpenQuest={setQuestId} onClose={() => setQuestId(null)} />
    </View>
  );
}

function GoalPicker(props: {
  visible: boolean;
  data: GameData;
  progress: Progress;
  onProgress: (p: Progress) => void;
  onOpenQuest: (id: string) => void;
  onClose: () => void;
}) {
  const { data, progress, onProgress } = props;
  const [tab, setTab] = useState<'quest' | 'bench' | 'project'>('quest');
  const [query, setQuery] = useState('');
  const [hideDone, setHideDone] = useState(true);
  const quests = useMemo(() => {
    const q = fold(query.trim());
    return data.quests.filter(
      (x) => (!hideDone || !progress.doneQuests.includes(x.id)) && (!q || fold(x.name).includes(q) || fold(x.trader).includes(q)),
    );
  }, [data, query, hideDone, progress.doneQuests]);

  const markCurrent = (id: string, name: string) => {
    const before = progress.doneQuests.length;
    const next = markCurrentQuest(data, progress, id);
    onProgress(next);
    const added = next.doneQuests.length - before;
    Alert.alert('C’est noté', `« ${name} » est suivie${added > 0 ? ` et les ${added} quêtes qui la précèdent sont marquées comme faites` : ''}.`);
  };

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
                <View style={[ui.box, { borderColor: colors.accent }]}>
                  <Text style={[ui.text, { fontWeight: '700' }]}>📍 Le plus rapide</Text>
                  <Text style={ui.text}>
                    Ouvre ton journal de quêtes en jeu et, pour chaque quête en cours, touche « J’en suis là » ici : toutes les quêtes d’avant dans sa chaîne sont
                    cochées comme faites automatiquement.
                  </Text>
                </View>
                <CheckRow label={`Masquer les quêtes faites (${progress.doneQuests.length})`} checked={hideDone} onPress={() => setHideDone((v) => !v)} />
                {quests.map((q) => {
                  const done = progress.doneQuests.includes(q.id);
                  const followed = hasGoal(progress, { kind: 'quest', id: q.id });
                  return (
                    <View key={q.id} style={[ui.box, done && { opacity: 0.5 }]}>
                      <Pressable onPress={() => props.onOpenQuest(q.id)}>
                        <Text style={ui.cardTitle}>{q.name}  ›</Text>
                      </Pressable>
                      <Text style={ui.muted}>
                        {q.trader}
                        {q.maps.length ? ` · ${q.maps.join(', ')}` : ''}
                        {q.req.length ? ` · ${q.req.map((r) => `${data.items[r.id]?.name ?? r.id} ×${r.n}`).join(', ')}` : ''}
                      </Text>
                      <View style={[ui.row, { flexWrap: 'wrap' }]}>
                        <Pressable onPress={() => markCurrent(q.id, q.name)} style={[ui.button, { paddingVertical: 6 }]}>
                          <Text style={[ui.buttonText, { fontSize: 13 }]}>📍 J’en suis là{questAncestors(data, q.id).size ? ` (+${questAncestors(data, q.id).size} faites)` : ''}</Text>
                        </Pressable>
                        <CheckRow label="Suivre" checked={followed} disabled={done} onPress={() => onProgress(toggleGoal(progress, { kind: 'quest', id: q.id }))} />
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

function shareList(data: GameData, list: ReturnType<typeof shoppingList>) {
  const lines = list.filter((l) => l.missing > 0).map((l) => `• ${data.items[l.id]?.name ?? l.id} : ${l.missing}`);
  Share.share({ message: `🎯 Ma liste ARC Raiders (il me manque) :\n${lines.join('\n')}` }).catch(() => {});
}

/** Quest sheet: story, objectives, maps, items to hand in, rewards and the quest chain. */
function QuestSheet(props: {
  data: GameData;
  questId: string | null;
  onOpenItem: (id: string) => void;
  onOpenQuest: (id: string) => void;
  onClose: () => void;
}) {
  const { data } = props;
  const q = data.quests.find((x) => x.id === props.questId);
  if (!q) return null;
  const quest = (id: string) => data.quests.find((x) => x.id === id);
  const ItemRow = ({ id, n }: { id: string; n: number }) => (
    <Pressable onPress={() => props.onOpenItem(id)} style={[ui.row, { paddingVertical: 4 }]}>
      <ItemImage item={data.items[id]} size={32} />
      <Text style={[ui.text, { flex: 1 }]}>{data.items[id]?.name ?? id}</Text>
      <Text style={ui.accentText}>×{n}</Text>
    </Pressable>
  );
  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={ui.root}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={ui.title}>{q.name}</Text>
            <Text style={ui.accentText}>
              {q.trader}
              {q.maps.length ? ` · ${q.maps.join(', ')}` : ''}
              {q.xp ? ` · ${q.xp.toLocaleString('fr-FR')} XP` : ''}
            </Text>
            {q.desc ? <Text style={[ui.text, { lineHeight: 20, fontStyle: 'italic' }]}>{q.desc}</Text> : null}
            <Text style={ui.sectionTitleFlush}>Objectifs</Text>
            {q.objectives.map((o, i) => (
              <Text key={i} style={ui.text}>
                {i + 1}. {o}
              </Text>
            ))}
            {q.req.length > 0 && (
              <>
                <Text style={ui.sectionTitleFlush}>À livrer</Text>
                {q.req.map((r) => (
                  <ItemRow key={r.id} id={r.id} n={r.n} />
                ))}
              </>
            )}
            {q.rewards.length > 0 && (
              <>
                <Text style={ui.sectionTitleFlush}>Récompenses</Text>
                {q.rewards.map((r) => (
                  <ItemRow key={r.id} id={r.id} n={r.n} />
                ))}
              </>
            )}
            {(q.prev.length > 0 || q.next.length > 0) && <Text style={ui.sectionTitleFlush}>Chaîne de quêtes</Text>}
            {q.prev.map((id) => (
              <Pressable key={id} onPress={() => props.onOpenQuest(id)}>
                <Text style={ui.text}>‹ Avant : {quest(id)?.name ?? id}</Text>
              </Pressable>
            ))}
            {q.next.map((id) => (
              <Pressable key={id} onPress={() => props.onOpenQuest(id)}>
                <Text style={ui.text}>› Ensuite : {quest(id)?.name ?? id}</Text>
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
