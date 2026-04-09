import type { LngLat } from "@osm-navigator/core";
import { fetchRoute, initOSMNavigator } from "@osm-navigator/core";
import type { CameraState, MapViewRef } from "@osm-navigator/native-map";
import { MapView } from "@osm-navigator/native-map";
import type { NavigationState } from "@osm-navigator/ui-navigation";
import { TurnByTurnOverlay } from "@osm-navigator/ui-navigation";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

// Initialize once at module level
initOSMNavigator();

const INITIAL_CAMERA: CameraState = {
  latitude: 52.5,
  longitude: 13.4,
  zoom: 12,
};

export default function App() {
  const mapRef = useRef<MapViewRef>(null);
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLongPress = useCallback(async (coords: LngLat) => {
    setLoading(true);
    try {
      const origin: LngLat = [13.4, 52.5];
      const result = await fetchRoute({
        origin,
        destination: coords,
        costing: "pedestrian",
      });
      setNavState({
        route: result,
        currentStepIndex: 0,
        distanceToNextStepMeters: result.steps[0]?.distance ?? 0,
        timeRemainingSeconds: result.durationSeconds,
        isArrived: false,
      });
      const lngs = result.geometry.map((c) => c[0]);
      const lats = result.geometry.map((c) => c[1]);
      mapRef.current?.fitBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
        60,
        800
      );
    } catch (err) {
      Alert.alert("Routing error", String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialCamera={INITIAL_CAMERA}
        onLongPress={handleLongPress}
        onMapLoaded={() => console.log("[OSMNavigator] Map ready")}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      )}
      <TurnByTurnOverlay
        navigationState={navState}
        units="metric"
        onClose={() => setNavState(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
});