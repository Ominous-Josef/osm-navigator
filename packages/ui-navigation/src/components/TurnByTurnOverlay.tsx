// TurnByTurnOverlay.tsx
// Overlay UI for turn-by-turn navigation

import type { ReactNode } from "react";
import { StyleSheet, Text, View, ViewProps } from "react-native";

export interface TurnByTurnOverlayProps extends ViewProps {
  maneuvers: Array<{
    instruction: string;
    distance: number;
    icon?: ReactNode;
  }>;
  currentStep: number;
}

export function TurnByTurnOverlay({ maneuvers, currentStep, style, ...rest }: TurnByTurnOverlayProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      {maneuvers.map((m, i) => (
        <View key={i} style={i === currentStep ? styles.current : styles.step}>
          {m.icon}
          <Text>{m.instruction}</Text>
          <Text>{m.distance} m</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "column", backgroundColor: "rgba(0,0,0,0.5)", padding: 8 },
  step: { opacity: 0.5, marginBottom: 4 },
  current: { opacity: 1, fontWeight: "bold", marginBottom: 4 },
});
