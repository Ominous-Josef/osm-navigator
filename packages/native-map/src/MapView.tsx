import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  type MapProps,
  type MapRef,
  NativeUserLocation,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { getConfig } from '@osm-navigator/core';
import { useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { type NativeSyntheticEvent, StyleSheet } from 'react-native';
import type { CameraState, MapViewProps } from './types';

// PressEvent isn't exported from the package root, so derive it from the public props.
type LongPressEvent = Parameters<NonNullable<MapProps['onLongPress']>>[0];

const DEFAULT_ROUTE_COLOR = '#0A84FF';
const DEFAULT_ROUTE_WIDTH = 6;
const DEFAULT_CAMERA_ANIMATION_MS = 500;

function toCameraStop(camera: CameraState) {
  return {
    center: [camera.longitude, camera.latitude] as [number, number],
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: camera.pitch,
  };
}

/**
 * Map component for osm-navigator.
 *
 * Our own API in front of `@maplibre/maplibre-react-native` (see ADR 0001), so the
 * renderer can be swapped without breaking callers.
 */
export function MapView({
  ref,
  style,
  styleURL,
  initialCamera,
  camera,
  cameraAnimationDurationMs = DEFAULT_CAMERA_ANIMATION_MS,
  pitchEnabled,
  rotateEnabled,
  attributionEnabled,
  compassEnabled,
  scaleBarEnabled,
  onMapLoaded,
  onMapError,
  onCameraChange,
  onLongPress,
  onPress,
  route,
  routeColor = DEFAULT_ROUTE_COLOR,
  routeWidth = DEFAULT_ROUTE_WIDTH,
  showUserLocation = false,
  userLocationMode = 'default',
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  useImperativeHandle(
    ref,
    () => ({
      animateTo(target, durationMs = DEFAULT_CAMERA_ANIMATION_MS) {
        cameraRef.current?.easeTo({ ...toCameraStop(target), duration: durationMs });
      },
      fitBounds(sw, ne, paddingPx = 0, durationMs = DEFAULT_CAMERA_ANIMATION_MS) {
        cameraRef.current?.fitBounds([sw[0], sw[1], ne[0], ne[1]], {
          padding: { top: paddingPx, right: paddingPx, bottom: paddingPx, left: paddingPx },
          duration: durationMs,
        });
      },
      async takeSnapshot() {
        if (!mapRef.current) throw new Error('MapView is not mounted');
        return mapRef.current.createStaticMapImage({ output: 'file' });
      },
    }),
    [],
  );

  const handlePress = useCallback(
    (event: LongPressEvent) => onPress?.(event.nativeEvent.lngLat),
    [onPress],
  );
  const handleLongPress = useCallback(
    (event: LongPressEvent) => onLongPress?.(event.nativeEvent.lngLat),
    [onLongPress],
  );
  const handleRegionDidChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, zoom, pitch, bearing, animated, userInteraction } = event.nativeEvent;
      onCameraChange?.({
        longitude: center[0],
        latitude: center[1],
        zoom,
        pitch,
        bearing,
        isAnimating: animated,
        isUserInteraction: userInteraction,
      });
    },
    [onCameraChange],
  );
  const handleLoaded = useCallback(() => onMapLoaded?.(), [onMapLoaded]);
  const handleFailed = useCallback(
    () => onMapError?.({ message: 'The map style or its tiles failed to load' }),
    [onMapError],
  );

  const routeGeoJSON = useMemo<GeoJSON.Feature<GeoJSON.LineString> | undefined>(
    () =>
      route && route.length >= 2
        ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }
        : undefined,
    [route],
  );

  return (
    <Map
      ref={mapRef}
      style={[styles.map, style]}
      mapStyle={styleURL ?? getConfig().mapStyleURL}
      touchPitch={pitchEnabled}
      touchRotate={rotateEnabled}
      attribution={attributionEnabled}
      compass={compassEnabled}
      scaleBar={scaleBarEnabled}
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onRegionDidChange={onCameraChange ? handleRegionDidChange : undefined}
      onDidFinishLoadingMap={handleLoaded}
      onDidFailLoadingMap={handleFailed}
    >
      <Camera
        ref={cameraRef}
        initialViewState={initialCamera ? toCameraStop(initialCamera) : undefined}
        {...(camera
          ? { ...toCameraStop(camera), duration: cameraAnimationDurationMs, easing: 'ease' as const }
          : {})}
      />
      {routeGeoJSON && (
        <GeoJSONSource id="osm-navigator-route" data={routeGeoJSON}>
          <Layer
            id="osm-navigator-route-line"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': routeColor, 'line-width': routeWidth }}
          />
        </GeoJSONSource>
      )}
      {showUserLocation && <NativeUserLocation mode={userLocationMode} />}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
