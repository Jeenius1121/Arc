import * as ImagePicker from 'expo-image-picker';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { Alert } from 'react-native';

import type { GameData, GameItem } from '../core/gamedata.ts';
import { matchScannedText } from '../core/scan.ts';

/**
 * Takes a photo of the game screen (PC or TV), reads its text on-device and
 * returns the items whose names appear in it.
 */
export async function scanItems(data: GameData): Promise<GameItem[] | null> {
  if (!isSupported) {
    Alert.alert('Scanner indisponible', 'La reconnaissance de texte n’est pas disponible sur ce téléphone.');
    return null;
  }
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Appareil photo refusé', 'Autorise l’appareil photo pour ARC Events dans les réglages du téléphone.');
    return null;
  }
  const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (shot.canceled || !shot.assets[0]) return null;
  const lines = await extractTextFromImage(shot.assets[0].uri);
  return matchScannedText(data, lines);
}
