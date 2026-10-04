import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useNavigationTheme } from '../theme';
import { ManeuverIcon } from './ManeuverIcons';

export interface ArrivalCardProps extends ViewProps {
  /** Shown under the title, e.g. the place name. */
  destinationName?: string;
  /** Shows a "Done" button when set. */
  onDone?: () => void;
}

export function ArrivalCard({ destinationName, onDone, style, ...rest }: ArrivalCardProps) {
  const { colors, spacing, radii, typography } = useNavigationTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      {...rest}
    >
      <ManeuverIcon type="arrive" size={40} color={colors.success} />
      <Text style={[typography.instruction, { color: colors.textPrimary }]} accessibilityRole="header">
        You have arrived
      </Text>
      {destinationName ? (
        <Text style={[typography.body, styles.center, { color: colors.textSecondary }]} numberOfLines={2}>
          {destinationName}
        </Text>
      ) : null}
      {onDone ? (
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          style={{
            backgroundColor: colors.accent,
            borderRadius: radii.pill,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.xl,
            marginTop: spacing.sm,
          }}
        >
          <Text style={[typography.body, { color: colors.onAccent }]}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  center: { textAlign: 'center' },
});
