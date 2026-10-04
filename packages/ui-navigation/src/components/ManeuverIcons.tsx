import type { ManeuverType } from '@osm-navigator/core';
import type { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type { ManeuverType };

// Placeholder glyphs; replaced by themeable SVG icons in Phase 5.
const GLYPHS: Record<ManeuverType, string> = {
  depart: '📍',
  straight: '⬆️',
  'slight-left': '↖️',
  'slight-right': '↗️',
  left: '⬅️',
  right: '➡️',
  'sharp-left': '↙️',
  'sharp-right': '↘️',
  'keep-left': '↖️',
  'keep-right': '↗️',
  'u-turn': '↩️',
  merge: '⤴️',
  roundabout: '🔄',
  ferry: '⛴️',
  arrive: '🏁',
};

interface ManeuverIconProps {
  type: ManeuverType;
  size?: number;
  color?: string;
}

export const ManeuverIcon: FC<ManeuverIconProps> = ({ type, size = 32 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.8 }}>{GLYPHS[type] ?? '📍'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
