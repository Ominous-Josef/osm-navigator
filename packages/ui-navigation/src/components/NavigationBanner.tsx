import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { formatDistance, type Units } from '../format';
import { useNavigationTheme } from '../theme';
import { ManeuverIcon, type ManeuverType } from './ManeuverIcons';

export interface NavigationBannerProps extends ViewProps {
  /** Instruction for the upcoming maneuver. */
  instruction: string;
  /** Along-route distance to the upcoming maneuver, in meters. */
  distanceToManeuver: number;
  maneuverType: ManeuverType;
  /** Instruction for the maneuver after that, shown as "Then". */
  nextInstruction?: string;
  /** @default "metric" */
  units?: Units;
  locale?: string;
}

export function NavigationBanner({
  instruction,
  distanceToManeuver,
  maneuverType,
  nextInstruction,
  units = 'metric',
  locale,
  style,
  ...props
}: NavigationBannerProps) {
  const { colors, spacing, radii, typography } = useNavigationTheme();
  const distance = formatDistance(distanceToManeuver, units, locale);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, shadowColor: colors.shadow },
        style,
      ]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`In ${distance}, ${instruction}${nextInstruction ? `. Then ${nextInstruction}` : ''}`}
      accessibilityLiveRegion="polite"
      {...props}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconTile,
            { backgroundColor: colors.surfaceRaised, borderRadius: radii.md, marginRight: spacing.lg },
          ]}
        >
          <ManeuverIcon type={maneuverType} size={44} color={colors.textPrimary} />
        </View>
        <View style={styles.text}>
          <Text style={[typography.distance, { color: colors.accent }]} numberOfLines={1}>
            {distance}
          </Text>
          <Text
            style={[typography.instruction, { color: colors.textPrimary, marginTop: 2 }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {instruction}
          </Text>
        </View>
      </View>
      {nextInstruction ? (
        <View
          style={[
            styles.next,
            { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>THEN </Text>
          <Text style={[typography.body, styles.text, { color: colors.textSecondary }]} numberOfLines={1}>
            {nextInstruction}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconTile: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
  next: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
});
