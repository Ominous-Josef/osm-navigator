import type { RouteStep } from "@osm-navigator/core";
import { FlatList, Pressable, StyleSheet, Text, View, type ViewProps } from "react-native";
import { formatDistance, type Units } from "../format";
import { useNavigationTheme } from "../theme";
import type { NavigationState } from "../types";
import { ManeuverIcon } from "./ManeuverIcons";

export interface TurnByTurnOverlayProps extends ViewProps {
  navigationState: NavigationState | null;
  /** @default "metric" */
  units?: Units;
  locale?: string;
  /** Shows a close button when set. */
  onClose?: () => void;
}

/** Scrollable list of every step on the route, with the current one highlighted. */
export function TurnByTurnOverlay({
  navigationState,
  units = "metric",
  locale,
  onClose,
  style,
  ...rest
}: TurnByTurnOverlayProps) {
  const { colors, spacing, radii, typography } = useNavigationTheme();
  if (!navigationState) return null;
  const { route, currentStepIndex } = navigationState;

  const renderStep = ({ item, index }: { item: RouteStep; index: number }) => {
    const isCurrent = index === currentStepIndex;
    const isPast = index < currentStepIndex;
    return (
      <View
        style={[
          styles.step,
          {
            padding: spacing.md,
            borderRadius: radii.md,
            marginBottom: spacing.xs,
            backgroundColor: isCurrent ? colors.surfaceRaised : "transparent",
            borderLeftColor: isCurrent ? colors.accent : "transparent",
            opacity: isPast ? 0.5 : 1,
          },
        ]}
        accessibilityState={{ selected: isCurrent }}
        testID={isCurrent ? "current-step" : undefined}
      >
        <ManeuverIcon type={item.maneuverType} size={28} color={isCurrent ? colors.accent : colors.textPrimary} />
        <Text
          style={[typography.body, styles.instruction, { color: colors.textPrimary, marginHorizontal: spacing.md }]}
          numberOfLines={2}
        >
          {item.instruction}
        </Text>
        {item.distance > 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {formatDistance(item.distance, units, locale)}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md }, style]}
      {...rest}
    >
      <View style={[styles.header, { marginBottom: spacing.sm }]}>
        <Text style={[typography.instruction, { color: colors.textPrimary }]} accessibilityRole="header">
          Steps
        </Text>
        {onClose ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close steps"
            hitSlop={12}
            style={{ padding: spacing.xs }}
          >
            <Text style={[typography.instruction, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={route.steps}
        keyExtractor={(step, index) => `${step.geometryIndex}:${index}`}
        renderItem={renderStep}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textMuted, padding: spacing.md }]}>
            This route has no turn-by-turn steps.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: "70%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  step: { flexDirection: "row", alignItems: "center", borderLeftWidth: 3 },
  instruction: { flex: 1 },
});
