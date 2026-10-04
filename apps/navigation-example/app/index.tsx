import type { GeocodeResult, LngLat } from '@osm-navigator/core';
import { MapView, type MapViewRef } from '@osm-navigator/native-map';
import { ErrorBanner } from '@osm-navigator/ui-navigation';
import * as Location from 'expo-location';
import { useNetworkState } from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GpsSignalBanner } from '../src/components/GpsSignalBanner';
import { NavigationHUD } from '../src/components/NavigationHUD';
import { SearchPanel } from '../src/components/SearchPanel';
import { useCompassHeading } from '../src/hooks/useCompassHeading';
import { useDestinationSearch } from '../src/hooks/useDestinationSearch';
import { useFollowCamera } from '../src/hooks/useFollowCamera';
import { useGpsSignal } from '../src/hooks/useGpsSignal';
import { useLocationPermission } from '../src/hooks/useLocationPermission';
import { useLocationTracking } from '../src/hooks/useLocationTracking';
import { useNavigationSession } from '../src/hooks/useNavigationSession';
import { type Fix, steadyFix } from '../src/lib/location';

const BERLIN_CENTER: LngLat = [13.405, 52.52];

interface PickedDestination {
  coordinates: LngLat;
  name: string;
}

export default function NavigationScreen() {
  const mapRef = useRef<MapViewRef>(null);
  const [picked, setPicked] = useState<PickedDestination | null>(null);
  const [simulate, setSimulate] = useState(false);

  const permission = useLocationPermission();
  const network = useNetworkState();
  const isOffline = network.isConnected === false || network.isInternetReachable === false;

  const session = useNavigationSession({ simulate });
  const isNavigating = session.phase === 'navigating' || session.phase === 'arrived';
  const isTrackingRoute = session.phase === 'navigating';
  const granted = permission.status === 'granted';

  // Outside navigation, track the user ourselves so the map can show their position,
  // facing and accuracy with the same marker used while navigating.
  const [idleFix, setIdleFix] = useState<Fix | null>(null);
  useLocationTracking(granted && !isTrackingRoute, (next) => setIdleFix((prev) => steadyFix(prev, next)));
  const fix = isTrackingRoute ? session.fix : (idleFix ?? session.fix);

  const compass = useCompassHeading(granted);
  const signal = useGpsSignal(fix, granted && !(isTrackingRoute && simulate));
  const search = useDestinationSearch({ bias: fix?.position });
  const follow = useFollowCamera(session.navState, fix, compass);

  // Open on the user rather than the Berlin fallback, once location is allowed.
  useEffect(() => {
    if (!granted) return;
    let active = true;
    void Location.getLastKnownPositionAsync().then((last) => {
      if (active && last) {
        mapRef.current?.animateTo({ longitude: last.coords.longitude, latitude: last.coords.latitude, zoom: 14 }, 800);
      }
    });
    return () => {
      active = false;
    };
  }, [granted]);

  const pick = (destination: PickedDestination, zoom = false) => {
    setPicked(destination);
    if (zoom) {
      mapRef.current?.animateTo(
        { longitude: destination.coordinates[0], latitude: destination.coordinates[1], zoom: 15 },
        800,
      );
    }
  };

  const selectResult = (result: GeocodeResult) => {
    search.setQueryWithoutSearch(result.name);
    pick({ coordinates: result.coordinates, name: result.name }, true);
    Keyboard.dismiss();
  };

  const pickOnMap = (coords: LngLat) => {
    if (isNavigating) return;
    const name = `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
    search.setQueryWithoutSearch(name);
    pick({ coordinates: coords, name });
  };

  const exit = () => {
    session.stop();
    setPicked(null);
    search.setQueryWithoutSearch('');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCamera={{ latitude: BERLIN_CENTER[1], longitude: BERLIN_CENTER[0], zoom: 12 }}
        camera={follow.camera}
        cameraAnimationDurationMs={1000}
        onPress={pickOnMap}
        route={session.route?.geometry}
        // The map draws the user itself (not the native puck): snapped onto the route while
        // navigating, with an arrow for where they face and a circle for GPS accuracy.
        userMarker={follow.marker}
        userMarkerHeading={follow.markerHeading}
        userMarkerAccuracy={follow.markerAccuracy}
        userMarkerStyle={follow.markerStyle}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {isOffline ? (
          <ErrorBanner variant="offline" message="You're offline. Search and routing need a connection." style={styles.banner} />
        ) : null}
        <GpsSignalBanner quality={signal} accuracy={fix?.accuracy} isNavigating={isTrackingRoute} style={styles.banner} />
        {session.error ? (
          <ErrorBanner
            title={isNavigating ? 'Rerouting failed' : "Couldn't start navigation"}
            message={session.error}
            onRetry={isNavigating ? session.rerouteNow : picked ? () => session.start(picked) : undefined}
            onDismiss={session.dismissError}
            style={styles.banner}
          />
        ) : null}

        {isNavigating && session.navState ? (
          <NavigationHUD
            navState={session.navState}
            destinationName={session.destination?.name}
            isRerouting={session.isRerouting}
            onReroute={session.rerouteNow}
            onExit={exit}
          />
        ) : (
          <View style={styles.searchArea} pointerEvents="box-none">
            <SearchPanel
              query={search.query}
              onChangeQuery={(text) => {
                search.setQuery(text);
                setPicked(null);
              }}
              status={search.status}
              results={search.results}
              searchError={search.error}
              onRetrySearch={search.retry}
              onSelectResult={selectResult}
              hasDestination={picked !== null}
              isStarting={session.phase === 'starting'}
              onStart={() => picked && session.start(picked)}
              permission={permission.status}
              onOpenSettings={permission.openSettings}
              simulate={simulate}
              onToggleSimulate={__DEV__ ? setSimulate : undefined}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFill },
  banner: { marginHorizontal: 16, marginTop: 8 },
  searchArea: { padding: 16 },
});
