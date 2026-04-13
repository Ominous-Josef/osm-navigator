import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type ManeuverType = 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'arrive';

interface ManeuverIconProps {
  type: ManeuverType;
  size?: number;
  color?: string;
}

export const ManeuverIcon: React.FC<ManeuverIconProps> = ({ type, size = 32 }) => {
  const getIcon = () => {
    switch (type) {
      case 'straight': return '⬆️';
      case 'left': return '⬅️';
      case 'right': return '➡️';
      case 'slight-left': return '↖️';
      case 'slight-right': return '↗️';
      case 'u-turn': return '↩️';
      case 'arrive': return '🏁';
      default: return '📍';
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.8 }}>{getIcon()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
