// RouteProgressBar.tsx
// Progress bar for route navigation

import { StyleSheet, View, ViewProps } from "react-native";

export interface RouteProgressBarProps extends ViewProps {
  progress: number; // 0 to 1
}

export function RouteProgressBar({ progress, style, ...rest }: RouteProgressBarProps) {
  return (
    <View style={[styles.bar, style]} {...rest}>
      <View style={[styles.progress, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 8, backgroundColor: "#ccc", borderRadius: 4, overflow: "hidden" },
  progress: { height: 8, backgroundColor: "#007aff" },
});
