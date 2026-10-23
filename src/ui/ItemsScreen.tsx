import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { RARITY_COLOR, RARITY_FR, searchItems, type GameData } from '../core/gamedata.ts';
import { verdict, type Progress } from '../core/progress.ts';
import { ItemImage } from './common.tsx';
import { colors, ui } from './theme.ts';

const ACTION_LABEL = { keep: 'Garder', later: 'De côté', recycle: 'Recycler', sell: 'Vendre' } as const;
const ACTION_COLOR = { keep: colors.live, later: '#60a5fa', recycle: colors.accent, sell: '#c084fc' } as const;

/** Search any item by its French name and see at a glance what to do with it. */
export function ItemsScreen({ data, progress, onOpen }: { data: GameData; progress: Progress; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchItems(data, query), [data, query]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[ui.chipRow, { paddingTop: 12 }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un objet (ex. engrenage, batterie…)"
          placeholderTextColor={colors.muted}
          style={ui.input}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.list}
        ListEmptyComponent={
          <Text style={ui.empty}>
            {query.trim()
              ? 'Aucun objet trouvé.'
              : 'Tape le nom d’un objet pour savoir s’il faut le garder, le recycler ou le vendre, à quoi il sert et où le trouver.'}
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
