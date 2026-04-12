// TurnByTurnOverlay.tsx
// Overlay UI for turn-by-turn navigation

import { StyleSheet, Text, View, ViewProps } from "react-native";
import type { NavigationState } from "../types";

export interface TurnByTurnOverlayProps extends ViewProps {
  navigationState: NavigationState | null;
  units?: "metric" | "imperial";
  onClose?: () => void;
}

export function TurnByTurnOverlay({ navigationState, style, ...rest }: TurnByTurnOverlayProps) {
  if (!navigationState) return null;
  const { route, currentStepIndex } = navigationState;
  return (
    <View style={[styles.container, style]} {...rest}>
      {route.steps.map((step, i) => (
        <View key={i} style={i === currentStepIndex ? styles.current : styles.step}>
          <Text>{step.instruction}</Text>
          <Text>{step.distance} m</Text>
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
