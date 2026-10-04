import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useNavigationTheme } from '../theme';

export interface ErrorBannerProps extends ViewProps {
  message: string;
  /** Bold first line, e.g. "Couldn't find a route". */
  title?: string;
  /** `offline` uses the neutral surface instead of the danger colour. @default "error" */
  variant?: 'error' | 'offline';
  /** Shows a "Retry" button when set. */
  onRetry?: () => void;
  /** Shows a dismiss button when set. */
  onDismiss?: () => void;
}

/** Reusable banner for service errors and offline state. */
export function ErrorBanner({
  message,
  title,
  variant = 'error',
  onRetry,
  onDismiss,
  style,
  ...rest
}: ErrorBannerProps) {
  const { colors, spacing, radii, typography } = useNavigationTheme();
  const background = variant === 'offline' ? colors.surfaceRaised : colors.danger;
  const foreground = variant === 'offline' ? colors.textPrimary : colors.onDanger;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: background, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      {...rest}
    >
      <View style={styles.text}>
        {title ? <Text style={[typography.body, styles.title, { color: foreground }]}>{title}</Text> : null}
        <Text style={[typography.body, { color: foreground }]} numberOfLines={3}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={{
            borderColor: foreground,
            borderWidth: 1,
            borderRadius: radii.pill,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text style={[typography.caption, { color: foreground }]}>Retry</Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12}>
          <Text style={[typography.instruction, { color: foreground }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  title: { fontWeight: '700' },
});
