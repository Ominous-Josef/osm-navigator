import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Images,
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
import { dedupeLine, metersToPixelsExpression, USER_MARKER_IMAGES, userMarkerFeature } from './userMarker';

// PressEvent isn't exported from the package root, so derive it from the public props.
type LongPressEvent = Parameters<NonNullable<MapProps['onLongPress']>>[0];

const DEFAULT_ROUTE_COLOR = '#0A84FF';
const DEFAULT_ROUTE_WIDTH = 6;
const DEFAULT_CAMERA_ANIMATION_MS = 500;

/** Marker icons lie flat on the map and turn with the user's heading. */
const ICON_LAYOUT = {
  'icon-rotate': ['get', 'heading'] as ['get', string],
  'icon-rotation-alignment': 'map' as const,
  'icon-pitch-alignment': 'map' as const,
  'icon-allow-overlap': true,
  'icon-ignore-placement': true,
};

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
  userMarker,
  userMarkerHeading,
  userMarkerAccuracy,
  userMarkerStyle = 'dot',
  userMarkerColor,
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

  const routeGeoJSON = useMemo<GeoJSON.Feature<GeoJSON.LineString> | undefined>(() => {
    const line = route ? dedupeLine(route) : [];
    return line.length >= 2
      ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }
      : undefined;
  }, [route]);

  const markerGeoJSON = useMemo(
    () => (userMarker ? userMarkerFeature(userMarker, userMarkerHeading, userMarkerAccuracy) : undefined),
    [userMarker, userMarkerHeading, userMarkerAccuracy],
  );
  const markerColor = userMarkerColor ?? routeColor;
  const hasHeading = markerGeoJSON?.properties.heading !== undefined;
  const accuracyRadius =
    markerGeoJSON?.properties.accuracy !== undefined
      ? metersToPixelsExpression(markerGeoJSON.properties.accuracy, markerGeoJSON.geometry.coordinates[1])
      : undefined;

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
      {markerGeoJSON && <Images images={USER_MARKER_IMAGES} />}
      {markerGeoJSON && (
        // Layers come and go with the marker's state; keys keep React from reusing one
        // layer element for another (MapLibre refuses an `id` change).
        <GeoJSONSource id="osm-navigator-user-marker" data={markerGeoJSON}>
          {accuracyRadius && (
            <Layer
              key="accuracy"
              id="osm-navigator-user-marker-accuracy"
              type="circle"
              paint={{
                'circle-radius': accuracyRadius,
                'circle-color': markerColor,
                'circle-opacity': 0.12,
                'circle-stroke-color': markerColor,
                'circle-stroke-opacity': 0.35,
                'circle-stroke-width': 1,
                'circle-pitch-alignment': 'map',
              }}
            />
          )}
          {userMarkerStyle === 'arrow' && hasHeading ? (
            [
              // Google-style: the arrow sits on a white disc with a soft shadow.
              <Layer
                key="arrow-shadow"
                id="osm-navigator-user-marker-arrow-shadow"
                type="circle"
                paint={{
                  'circle-radius': 20,
                  'circle-color': '#000000',
                  'circle-opacity': 0.25,
                  'circle-blur': 0.4,
                  'circle-pitch-alignment': 'map',
                }}
              />,
              <Layer
                key="arrow-disc"
                id="osm-navigator-user-marker-arrow-disc"
                type="circle"
                paint={{ 'circle-radius': 17, 'circle-color': '#FFFFFF', 'circle-pitch-alignment': 'map' }}
              />,
              <Layer
                key="arrow-fill"
                id="osm-navigator-user-marker-arrow-fill"
                type="symbol"
                layout={{ ...ICON_LAYOUT, 'icon-image': 'osm-navigator-arrow-fill', 'icon-size': 0.8 }}
                paint={{ 'icon-color': markerColor }}
              />,
            ]
          ) : (
            [
              hasHeading && (
                <Layer
                  key="cone"
                  id="osm-navigator-user-marker-cone"
                  type="symbol"
                  layout={{ ...ICON_LAYOUT, 'icon-image': 'osm-navigator-cone-fill' }}
                  paint={{ 'icon-color': markerColor, 'icon-opacity': 0.35 }}
                />
              ),
              <Layer
                key="dot"
                id="osm-navigator-user-marker-dot"
                type="circle"
                paint={{
                  'circle-radius': 8,
                  'circle-color': markerColor,
                  'circle-stroke-color': '#FFFFFF',
                  'circle-stroke-width': 3,
                  'circle-pitch-alignment': 'map',
                }}
              />,
            ]
          )}
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
