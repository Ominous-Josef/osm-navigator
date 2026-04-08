// ManeuverIcon.tsx
// Icon for navigation maneuvers

import { StyleSheet, Text, View, ViewProps } from "react-native";

export interface ManeuverIconProps extends ViewProps {
  type: "turn-left" | "turn-right" | "straight" | "u-turn" | string;
}

export function ManeuverIcon({ type, style, ...rest }: ManeuverIconProps) {
  // TODO(agent): Replace with SVG or image icons for each maneuver type
  return (
    <View style={[styles.icon, style]} {...rest}>
      <Text>{type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#eee", borderRadius: 12 },
});
