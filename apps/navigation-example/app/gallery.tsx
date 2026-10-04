// Dev-only component gallery for visual review of @osm-navigator/ui-navigation.
// Open with: osm-navigation-example://gallery (or the link on the main screen in dev builds).
import type { ManeuverType, NavigationState, Route } from '@osm-navigator/core';
import {
  ArrivalCard,
  darkNavigationTheme,
  ErrorBanner,
  lightNavigationTheme,
  ManeuverIcon,
  maneuverLabel,
  NavigationBanner,
  NavigationThemeProvider,
  OffRouteBanner,
  RouteProgressBar,
  TurnByTurnOverlay,
  type Units,
  useNavigationTheme,
} from '@osm-navigator/ui-navigation';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MANEUVERS: ManeuverType[] = [
  'depart', 'straight', 'slight-left', 'slight-right', 'left', 'right', 'sharp-left', 'sharp-right',
  'keep-left', 'keep-right', 'u-turn', 'merge', 'roundabout', 'ferry', 'arrive',
];

const SAMPLE_ROUTE = {
  geometry: [],
  distanceMeters: 2766,
  durationSeconds: 451,
  raw: {},
  steps: [
    { instruction: 'Drive south.', maneuverType: 'depart', distance: 93, duration: 20, startLocation: [0, 0], geometryIndex: 0 },
    { instruction: 'Turn right onto Effurun–Sapele Road.', maneuverType: 'right', distance: 1240, duration: 120, startLocation: [0, 0], geometryIndex: 4 },
    { instruction: 'Enter the roundabout and take the 2nd exit onto F103.', maneuverType: 'roundabout', distance: 860, duration: 90, startLocation: [0, 0], geometryIndex: 9 },
    { instruction: 'Keep left at the fork.', maneuverType: 'keep-left', distance: 480, duration: 60, startLocation: [0, 0], geometryIndex: 15 },
    { instruction: 'Your destination is on the right.', maneuverType: 'arrive', distance: 0, duration: 0, startLocation: [0, 0], geometryIndex: 20 },
  ],
} as unknown as Route;

const SAMPLE_STATE: NavigationState = {
  route: SAMPLE_ROUTE,
  currentStepIndex: 1,
  distanceToNextStepMeters: 412,
  distanceRemainingMeters: 1780,
  timeRemainingSeconds: 270,
  progress: 0.36,
  snappedPosition: [0, 0],
  distanceFromRouteMeters: 3,
  routeBearing: 180,
  isOffRoute: false,
  isArrived: false,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors, spacing, typography } = useNavigationTheme();
  return (
    <View style={{ marginBottom: spacing.xl, gap: spacing.md }}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Gallery({ units, onToggleTheme, onToggleUnits, isDark }: {
  units: Units;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleUnits: () => void;
}) {
  const { colors, spacing, radii, typography } = useNavigationTheme();
  const chip = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ backgroundColor: colors.surfaceRaised, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}
    >
      <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#E5E5EA' }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.row, { gap: spacing.sm, marginBottom: spacing.xl }]}>
          {chip(isDark ? 'Theme: dark' : 'Theme: light', onToggleTheme)}
          {chip(`Units: ${units}`, onToggleUnits)}
        </View>

        <Section title="NavigationBanner">
          <NavigationBanner instruction="Turn right onto Effurun–Sapele Road." distanceToManeuver={412} maneuverType="right" nextInstruction="Enter the roundabout and take the 2nd exit." units={units} />
          <NavigationBanner
            instruction="Take the exit toward Warri–Sapele Road / Delta State University Abraka Campus and continue for a while"
            distanceToManeuver={2350}
            maneuverType="slight-right"
            units={units}
          />
        </Section>

        <Section title="ManeuverIcon (all 15)">
          <View style={[styles.row, styles.wrap, { gap: spacing.md }]}>
            {MANEUVERS.map((type) => (
              <View key={type} style={[styles.iconCell, { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.sm }]}>
                <ManeuverIcon type={type} size={36} />
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]} numberOfLines={1}>
                  {maneuverLabel(type)}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.row, { gap: spacing.md }]}>
            <ManeuverIcon type="left" size={36} color={colors.accent} />
            <ManeuverIcon type="u-turn" size={36} color={colors.warning} />
            <ManeuverIcon type="arrive" size={36} color={colors.success} />
          </View>
        </Section>

        <Section title="RouteProgressBar">
          <RouteProgressBar progress={0} />
          <RouteProgressBar progress={0.36} />
          <RouteProgressBar progress={1} height={12} />
        </Section>

        <Section title="TurnByTurnOverlay">
          <TurnByTurnOverlay navigationState={SAMPLE_STATE} units={units} onClose={() => {}} />
          <TurnByTurnOverlay navigationState={{ ...SAMPLE_STATE, route: { ...SAMPLE_ROUTE, steps: [] } }} />
        </Section>

        <Section title="OffRouteBanner">
          <OffRouteBanner onReroute={() => {}} />
          <OffRouteBanner isRerouting />
        </Section>

        <Section title="ArrivalCard">
          <ArrivalCard destinationName="Petroleum Training Institute (PTI)" onDone={() => {}} />
        </Section>

        <Section title="ErrorBanner">
          <ErrorBanner title="Couldn't find a route" message="Path distance exceeds the max distance limit: 1500000 meters" onRetry={() => {}} onDismiss={() => {}} />
          <ErrorBanner variant="offline" message="You're offline. Search and routing need a connection." />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function GalleryScreen() {
  const [isDark, setIsDark] = useState(true);
  const [units, setUnits] = useState<Units>('metric');
  return (
    <NavigationThemeProvider theme={isDark ? darkNavigationTheme : lightNavigationTheme}>
      <Gallery
        units={units}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onToggleUnits={() => setUnits((u) => (u === 'metric' ? 'imperial' : 'metric'))}
      />
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  iconCell: { width: 96, alignItems: 'center' },
});
