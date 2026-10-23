import { Image, Pressable, Text, View } from 'react-native';

import { RARITY_COLOR, type GameItem } from '../core/gamedata.ts';
import { colors, ui } from './theme.ts';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={ui.sectionTitle}>{title}</Text>
      <View style={[ui.chipRow, { flexWrap: 'wrap' }]}>{children}</View>
    </View>
  );
}

export function Chip(props: { label: string; active?: boolean; onPress: () => void; onLongPress?: () => void }) {
  return (
    <Pressable onPress={props.onPress} onLongPress={props.onLongPress} style={[ui.chip, props.active && ui.chipActive]}>
      <Text style={[ui.chipText, props.active && ui.chipTextActive]}>{props.label}</Text>
    </Pressable>
  );
}

export function CheckRow(props: { label: string; checked: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} disabled={props.disabled} style={[ui.checkRow, props.disabled && { opacity: 0.35 }]}>
      <View style={[ui.checkbox, props.checked && ui.checkboxOn]}>{props.checked && <Text style={ui.checkMark}>✓</Text>}</View>
      <Text style={ui.text}>{props.label}</Text>
    </Pressable>
  );
}

export function Stepper(props: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={ui.stepper}>
      <Pressable onPress={props.onMinus} hitSlop={6} style={ui.stepperButton}>
        <Text style={ui.text}>−</Text>
      </Pressable>
      <Text style={[ui.text, { minWidth: 44, textAlign: 'center' }]}>{props.label}</Text>
      <Pressable onPress={props.onPlus} hitSlop={6} style={ui.stepperButton}>
        <Text style={ui.text}>+</Text>
      </Pressable>
    </View>
  );
}

/** Item picture with a border in its rarity colour (images come from arctracker.io's CDN). */
export function ItemImage({ item, size = 40 }: { item?: GameItem; size?: number }) {
  const border = RARITY_COLOR[item?.rarity ?? ''] ?? colors.border;
  return (
    <View style={{ width: size, height: size, borderRadius: 8, borderWidth: 2, borderColor: border, backgroundColor: '#11151b', overflow: 'hidden' }}>
      {item?.img ? <Image source={{ uri: item.img }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
    </View>
  );
}
