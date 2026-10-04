import { type DimensionValue, StyleSheet, View, type ViewProps } from "react-native";
import { useNavigationTheme } from "../theme";

export interface RouteProgressBarProps extends ViewProps {
  /** Fraction completed, from 0 to 1 (clamped). */
  progress: number;
  /** @default 8 */
  height?: number;
}

export function RouteProgressBar({ progress, height = 8, style, ...rest }: RouteProgressBarProps) {
  const { colors } = useNavigationTheme();
  const fraction = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const percent = Math.round(fraction * 100);
  const width: DimensionValue = `${fraction * 100}%`;

  return (
    <View
      style={[styles.bar, { height, borderRadius: height / 2, backgroundColor: colors.track }, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Route progress"
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
      {...rest}
    >
      <View style={{ width, height, backgroundColor: colors.accent }} testID="route-progress-fill" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { overflow: "hidden" },
});
