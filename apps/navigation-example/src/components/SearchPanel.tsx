import type { GeocodeResult } from '@osm-navigator/core';
import { ErrorBanner, useNavigationTheme } from '@osm-navigator/ui-navigation';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { SearchStatus } from '../hooks/useDestinationSearch';
import type { PermissionStatus } from '../hooks/useLocationPermission';

export interface SearchPanelProps {
  query: string;
  onChangeQuery: (text: string) => void;
  status: SearchStatus;
  results: GeocodeResult[];
  searchError?: string;
  onRetrySearch: () => void;
  onSelectResult: (result: GeocodeResult) => void;

  hasDestination: boolean;
  isStarting: boolean;
  onStart: () => void;

  permission: PermissionStatus;
  onOpenSettings: () => void;

  /** Dev builds only: drive along the route instead of using GPS. */
  simulate?: boolean;
  onToggleSimulate?: (value: boolean) => void;
}

export function SearchPanel({
  query,
  onChangeQuery,
  status,
  results,
  searchError,
  onRetrySearch,
  onSelectResult,
  hasDestination,
  isStarting,
  onStart,
  permission,
  onOpenSettings,
  simulate,
  onToggleSimulate,
}: SearchPanelProps) {
  const { colors, spacing, radii, typography } = useNavigationTheme();
  const canStart = hasDestination && !isStarting && permission === 'granted';
  const showNoResults = status === 'success' && results.length === 0;

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md }]}>
      <Text style={[typography.instruction, styles.center, { color: colors.textPrimary }]} accessibilityRole="header">
        🧭 OSM Navigation
      </Text>

      {permission === 'denied' ? (
        <ErrorBanner
          title="Location is off"
          message="Navigation needs your location. Allow it in Settings, then come back."
          onRetry={onOpenSettings}
          testID="permission-banner"
        />
      ) : null}

      <View>
        <TextInput
          style={[
            typography.body,
            styles.input,
            { backgroundColor: colors.surfaceRaised, color: colors.textPrimary, borderRadius: radii.md, padding: spacing.md },
          ]}
          placeholder="Where do you want to go?"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={onChangeQuery}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search for a destination"
        />
        {status === 'loading' ? (
          <ActivityIndicator style={styles.inputSpinner} color={colors.accent} testID="search-spinner" />
        ) : null}
      </View>

      {status === 'error' && searchError ? (
        <ErrorBanner title="Search failed" message={searchError} onRetry={onRetrySearch} />
      ) : null}

      {showNoResults ? (
        <Text style={[typography.body, styles.center, { color: colors.textMuted }]}>No places found for “{query.trim()}”.</Text>
      ) : null}

      {results.length > 0 ? (
        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          style={styles.results}
          keyExtractor={(item, index) => `${item.coordinates.join(',')}:${index}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectResult(item)}
              accessibilityRole="button"
              style={({ pressed }) => [
                { padding: spacing.md, borderRadius: radii.sm },
                pressed && { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.address ? (
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '400' }]} numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      ) : null}

      {hasDestination ? (
        <Pressable
          onPress={onStart}
          disabled={!canStart}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canStart, busy: isStarting }}
          style={[
            styles.start,
            { backgroundColor: colors.accent, borderRadius: radii.md, padding: spacing.lg, opacity: canStart || isStarting ? 1 : 0.5 },
          ]}
        >
          {isStarting ? (
            <ActivityIndicator color={colors.onAccent} testID="start-spinner" />
          ) : (
            <Text style={[typography.instruction, { color: colors.onAccent }]}>🚗 Start Navigation</Text>
          )}
        </Pressable>
      ) : null}

      {onToggleSimulate ? (
        <View style={[styles.devRow, { gap: spacing.sm }]}>
          <Text style={[typography.caption, styles.devLabel, { color: colors.textMuted }]}>DEV · Simulate drive</Text>
          <Switch value={!!simulate} onValueChange={onToggleSimulate} accessibilityLabel="Simulate drive" />
          <Link href="/gallery" style={[typography.caption, { color: colors.accent }]}>
            Gallery →
          </Link>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  center: { textAlign: 'center' },
  input: { paddingRight: 44 },
  inputSpinner: { position: 'absolute', right: 12, top: 0, bottom: 0 },
  results: { maxHeight: 260 },
  start: { alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  devRow: { flexDirection: 'row', alignItems: 'center' },
  devLabel: { flex: 1 },
});
