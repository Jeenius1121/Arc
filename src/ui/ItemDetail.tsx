import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { RARITY_COLOR, RARITY_FR, type GameData } from '../core/gamedata.ts';
import { droppedBy, recycleValue, shoppingList, usesOf, verdict, type Progress, type Verdict } from '../core/progress.ts';
import { ItemImage, Stepper } from './common.tsx';
import { colors, ui } from './theme.ts';

const VERDICT_COLOR: Record<Verdict['action'], string> = {
  keep: colors.live,
  later: '#60a5fa',
  recycle: colors.accent,
  sell: '#c084fc',
};

/**
 * Everything about one item: keep/recycle/sell verdict, stats, recycling,
 * recipe, uses, vendors and which ARC drop it. Linked items open in place
 * (with a back button).
 */
export function ItemDetail(props: {
  data: GameData;
  progress: Progress;
  itemId: string | null;
  onOwned: (id: string, n: number) => void;
  onClose: () => void;
}) {
  const { data, progress } = props;
  const [stack, setStack] = useState<string[]>([]);
  useEffect(() => setStack(props.itemId ? [props.itemId] : []), [props.itemId]);
  const id = stack[stack.length - 1];
  const item = id ? data.items[id] : undefined;
  if (!props.itemId || !item) return null;

  const open = (next: string) => data.items[next] && setStack((s) => [...s, next]);
  const v = verdict(data, progress, item);
  const line = shoppingList(data, progress).find((l) => l.id === item.id);
  const owned = progress.owned[item.id] ?? 0;
  const uses = usesOf(data, item.id);
  const drops = droppedBy(data, item.id);
  const fmt = (n?: number) => (n ?? 0).toLocaleString('fr-FR');

  const ItemLink = ({ itemId, n }: { itemId: string; n: number }) => (
    <Pressable onPress={() => open(itemId)} style={[ui.row, { paddingVertical: 6 }]}>
      <ItemImage item={data.items[itemId]} size={32} />
      <Text style={[ui.text, { flex: 1 }]}>{data.items[itemId]?.name ?? itemId}</Text>
      <Text style={ui.accentText}>×{n}</Text>
    </Pressable>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={() => (stack.length > 1 ? setStack((s) => s.slice(0, -1)) : props.onClose())}>
      <SafeAreaProvider>
        <SafeAreaView style={ui.root}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {stack.length > 1 && (
              <Pressable onPress={() => setStack((s) => s.slice(0, -1))}>
                <Text style={ui.accentText}>‹ {data.items[stack[stack.length - 2]]?.name}</Text>
              </Pressable>
            )}
            <View style={[ui.row, { gap: 14 }]}>
              <ItemImage item={item} size={72} />
              <View style={{ flex: 1 }}>
                <Text style={ui.title}>{item.name}</Text>
                <Text style={{ color: RARITY_COLOR[item.rarity] ?? colors.muted, fontWeight: '600' }}>
                  {RARITY_FR[item.rarity] ?? item.rarity} · {item.type}
                </Text>
              </View>
            </View>

            <View style={[ui.box, { borderColor: VERDICT_COLOR[v.action] }]}>
              <Text style={{ color: VERDICT_COLOR[v.action], fontSize: 18, fontWeight: '700' }}>{v.title}</Text>
              <Text style={ui.text}>{v.reason}</Text>
            </View>

            {item.desc && <Text style={[ui.text, { lineHeight: 20 }]}>{item.desc}</Text>}

            <View style={[ui.box, { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }]}>
              <Stat label="Valeur" value={item.value ? `${fmt(item.value)} ¢` : '—'} />
              <Stat label="Par case" value={item.value ? `${fmt(item.value * item.stack)} ¢` : '—'} />
              <Stat label="Pile" value={`×${item.stack}`} />
              {item.weight ? <Stat label="Poids" value={`${item.weight} kg`} /> : null}
              {item.recycles ? <Stat label="Recyclé" value={`${fmt(recycleValue(data, item))} ¢`} /> : null}
            </View>

            {(line || uses.some((u) => u.kind !== 'recipe' && u.kind !== 'trade')) && (
              <View style={[ui.box, ui.row, { justifyContent: 'space-between' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={ui.text}>Mis de côté pour mes objectifs</Text>
                  {line && <Text style={ui.muted}>Il en faut {line.needed} au total</Text>}
                </View>
                <Stepper label={String(owned)} onMinus={() => props.onOwned(item.id, Math.max(0, owned - 1))} onPlus={() => props.onOwned(item.id, owned + 1)} />
              </View>
            )}

            {item.recycles && (
              <>
                <Text style={ui.sectionTitleFlush}>Recyclage</Text>
                {Object.entries(item.recycles).map(([rid, n]) => (
                  <ItemLink key={rid} itemId={rid} n={n} />
                ))}
              </>
            )}
            {item.salvages && (
              <>
                <Text style={ui.sectionTitleFlush}>Démontage en raid</Text>
                {Object.entries(item.salvages).map(([rid, n]) => (
                  <ItemLink key={rid} itemId={rid} n={n} />
                ))}
              </>
            )}
            {item.recipe && (
              <>
                <Text style={ui.sectionTitleFlush}>
                  Fabrication{item.bench ? ` · ${item.bench.join(', ')}` : ''}
                  {item.craftQty ? ` · donne ×${item.craftQty}` : ''}
                </Text>
                {Object.entries(item.recipe).map(([rid, n]) => (
                  <ItemLink key={rid} itemId={rid} n={n} />
                ))}
              </>
            )}

            {uses.length > 0 && (
              <>
                <Text style={ui.sectionTitleFlush}>Utilisé pour ({uses.length})</Text>
                {uses.slice(0, 25).map((u, i) => (
                  <Pressable key={i} disabled={u.kind !== 'recipe' && u.kind !== 'trade'} onPress={() => open(u.ref)} style={[ui.row, { paddingVertical: 4 }]}>
                    <Text style={[ui.text, { flex: 1 }]}>{u.label}</Text>
                    <Text style={ui.accentText}>×{u.n}</Text>
                  </Pressable>
                ))}
                {uses.length > 25 && <Text style={ui.muted}>… et {uses.length - 25} autres</Text>}
              </>
            )}

            {item.vendors && (
              <>
                <Text style={ui.sectionTitleFlush}>Vendu par</Text>
                {item.vendors.map((vd, i) => (
                  <Text key={i} style={ui.text}>
                    {vd.trader} :{' '}
                    {Object.entries(vd.cost)
                      .map(([cid, n]) => (cid === 'coins' ? `${fmt(n)} ¢` : `${n} ${data.items[cid]?.name ?? cid}`))
                      .join(' + ')}
                  </Text>
                ))}
              </>
            )}

            {(drops.length > 0 || item.foundIn) && (
              <>
                <Text style={ui.sectionTitleFlush}>Où le trouver</Text>
                {item.foundIn && <Text style={ui.text}>Zones : {item.foundIn.join(', ')}</Text>}
                {drops.length > 0 && <Text style={ui.text}>Lâché par : {drops.map((b) => b.name).join(', ')}</Text>}
              </>
            )}

            <Text style={[ui.muted, { marginTop: 8 }]}>Données communautaires (arctracker.io / RaidTheory), non officielles.</Text>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={ui.muted}>{label}</Text>
      <Text style={[ui.text, { fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}
