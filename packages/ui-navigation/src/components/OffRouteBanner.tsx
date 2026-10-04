import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useNavigationTheme } from '../theme';

export interface OffRouteBannerProps extends ViewProps {
  /** Shows a spinner and "Finding a new route…" while a reroute request is in flight. */
  isRerouting?: boolean;
  /** Shows a "Reroute" button when set and not already rerouting. */
  onReroute?: () => void;
}

export function OffRouteBanner({ isRerouting = false, onReroute, style, ...rest }: OffRouteBannerProps) {
  const { colors, spacing, radii, typography } = useNavigationTheme();
  const message = isRerouting ? 'Finding a new route…' : "You're off route";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.warning, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      {...rest}
    >
      {isRerouting ? <ActivityIndicator color={colors.onWarning} testID="rerouting-spinner" /> : null}
      <Text style={[typography.body, styles.message, { color: colors.onWarning }]}>{message}</Text>
      {onReroute && !isRerouting ? (
        <Pressable
          onPress={onReroute}
          accessibilityRole="button"
          style={{
            backgroundColor: colors.onWarning,
            borderRadius: radii.pill,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text style={[typography.caption, { color: colors.warning }]}>Reroute</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  message: { flex: 1 },
});
