import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { RARITY_COLOR, RARITY_FR, searchItems, type GameData, type GameItem } from '../core/gamedata.ts';
import { verdict, type Progress } from '../core/progress.ts';
import { ItemImage } from './common.tsx';
import { scanItems } from './Scanner.tsx';
import { colors, ui } from './theme.ts';

const ACTION_LABEL = { keep: 'Garder', later: 'De côté', recycle: 'Recycler', sell: 'Vendre' } as const;
const ACTION_COLOR = { keep: colors.live, later: '#60a5fa', recycle: colors.accent, sell: '#c084fc' } as const;

/** Search any item by its French name and see at a glance what to do with it. */
export function ItemsScreen({ data, progress, onOpen }: { data: GameData; progress: Progress; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [scanned, setScanned] = useState<GameItem[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const results = useMemo(() => scanned ?? searchItems(data, query), [data, query, scanned]);

  const scan = async () => {
    setScanning(true);
    try {
      const found = await scanItems(data);
      if (!found) return;
      if (found.length === 0) Alert.alert('Aucun objet reconnu', 'Cadre bien le nom de l’objet (infobulle ou inventaire) et évite les reflets.');
      else if (found.length === 1) onOpen(found[0].id);
      else setScanned(found);
    } catch (e) {
      Alert.alert('Scanner', e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[ui.chipRow, { paddingTop: 12 }]}>
        <TextInput
          value={query}
          onChangeText={(t) => {
            setScanned(null);
            setQuery(t);
          }}
          placeholder="Rechercher un objet (ex. engrenage, batterie…)"
          placeholderTextColor={colors.muted}
          style={ui.input}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Pressable onPress={scan} disabled={scanning} style={[ui.button, { paddingHorizontal: 12 }, scanning && { opacity: 0.5 }]} accessibilityLabel="Scanner un objet">
          <Text style={ui.buttonText}>{scanning ? '…' : '📷'}</Text>
        </Pressable>
      </View>
      {scanned && <Text style={ui.hint}>Objets reconnus sur la photo :</Text>}
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.list}
        ListEmptyComponent={
          <Text style={ui.empty}>
            {query.trim()
              ? 'Aucun objet trouvé.'
              : 'Tape le nom d’un objet, ou touche 📷 et photographie-le à l’écran : l’app te dit s’il faut le garder, le recycler ou le vendre, à quoi il sert et où le trouver.'}
          </Text>
        }
        renderItem={({ item }) => {
          const v = verdict(data, progress, item);
          return (
            <Pressable onPress={() => onOpen(item.id)} style={ui.card}>
              <ItemImage item={item} />
              <View style={{ flex: 1 }}>
                <Text style={ui.cardTitle}>{item.name}</Text>
                <Text style={{ color: RARITY_COLOR[item.rarity] ?? colors.muted, fontSize: 12 }}>
                  {RARITY_FR[item.rarity] ?? item.rarity} · {item.type}
                  {item.value ? ` · ${item.value.toLocaleString('fr-FR')} ¢` : ''}
                </Text>
              </View>
              <Text style={{ color: ACTION_COLOR[v.action], fontWeight: '700', fontSize: 13 }}>{ACTION_LABEL[v.action]}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
