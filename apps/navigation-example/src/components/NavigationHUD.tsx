import type { NavigationState } from '@osm-navigator/core';
import {
  ArrivalCard,
  formatDistance,
  formatDuration,
  NavigationBanner,
  OffRouteBanner,
  RouteProgressBar,
  TurnByTurnOverlay,
  type Units,
  useNavigationTheme,
} from '@osm-navigator/ui-navigation';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { upcomingManeuver } from '../lib/maneuver';

export interface NavigationHUDProps {
  navState: NavigationState;
  destinationName?: string;
  isRerouting: boolean;
  onReroute: () => void;
  onExit: () => void;
  units?: Units;
}

export function NavigationHUD({
  navState,
  destinationName,
  isRerouting,
  onReroute,
  onExit,
  units = 'metric',
}: NavigationHUDProps) {
  const { colors, spacing, radii, typography } = useNavigationTheme();
  const [showSteps, setShowSteps] = useState(false);
  const upcoming = upcomingManeuver(navState);

  if (navState.isArrived) {
    return (
      <View style={[styles.fill, styles.centerContent, { padding: spacing.xl }]} pointerEvents="box-none">
        <ArrivalCard destinationName={destinationName} onDone={onExit} style={styles.arrival} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { padding: spacing.lg }]} pointerEvents="box-none">
      <View style={{ gap: spacing.sm }}>
        {upcoming ? (
          <NavigationBanner
            instruction={upcoming.instruction}
            distanceToManeuver={upcoming.distanceMeters}
            maneuverType={upcoming.type}
            nextInstruction={upcoming.thenInstruction}
            units={units}
          />
        ) : null}
        {navState.isOffRoute || isRerouting ? (
          <OffRouteBanner isRerouting={isRerouting} onReroute={onReroute} />
        ) : null}
      </View>

      <View style={styles.spacer} pointerEvents="none" />

      {showSteps ? (
        <TurnByTurnOverlay
          navigationState={navState}
          units={units}
          onClose={() => setShowSteps(false)}
          style={{ marginBottom: spacing.sm }}
        />
      ) : null}

      <View style={[styles.footer, { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm }]}>
        <View style={styles.footerRow}>
          <View style={styles.flex}>
            <Text style={[typography.instruction, { color: colors.textPrimary }]}>
              {formatDuration(navState.timeRemainingSeconds)}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {formatDistance(navState.distanceRemainingMeters, units)} remaining
            </Text>
          </View>
          <Pressable
            onPress={() => setShowSteps((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={showSteps ? 'Hide steps' : 'Show steps'}
            style={[styles.pill, { backgroundColor: colors.surfaceRaised, borderRadius: radii.pill, paddingHorizontal: spacing.md }]}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>☰ Steps</Text>
          </Pressable>
          <Pressable
            onPress={onExit}
            accessibilityRole="button"
            accessibilityLabel="Exit navigation"
            style={[styles.pill, { backgroundColor: colors.danger, borderRadius: radii.pill, paddingHorizontal: spacing.md, marginLeft: spacing.sm }]}
          >
            <Text style={[typography.body, { color: colors.onDanger }]}>✕ Exit</Text>
          </Pressable>
        </View>
        <RouteProgressBar progress={navState.progress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerContent: { justifyContent: 'center' },
  arrival: { alignSelf: 'stretch' },
  spacer: { flex: 1 },
  footer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  pill: { height: 40, justifyContent: 'center' },
});
