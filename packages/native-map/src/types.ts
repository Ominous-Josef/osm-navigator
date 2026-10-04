import type { CameraState, LngLat } from "@osm-navigator/core";
import type { Ref } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type { CameraState, LngLat };

export interface CameraChangeEvent {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  /** True when the change came from an animation rather than a jump. */
  isAnimating: boolean;
  /** True when the user moved the map (pan, pinch, rotate). */
  isUserInteraction: boolean;
}

export interface MapError {
  message: string;
}

export interface MapViewProps {
  ref?: Ref<MapViewRef>;
  style?: StyleProp<ViewStyle>;
  /** MapLibre style URL. @default getConfig().mapStyleURL */
  styleURL?: string;
  /** Camera position on first render (uncontrolled). */
  initialCamera?: CameraState;
  /**
   * Controlled camera. Every change animates to the new position. Leave undefined to
   * let the user move the map freely; `ref.animateTo()` works in both modes, but a
   * later change to this prop wins.
   */
  camera?: CameraState;
  /** Animation duration for `camera` prop changes. @default 500 */
  cameraAnimationDurationMs?: number;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  attributionEnabled?: boolean;
  compassEnabled?: boolean;
  scaleBarEnabled?: boolean;
  /** Called once the style and initial tiles have loaded. */
  onMapLoaded?: () => void;
  /** Called when the style or tiles fail to load (bad URL, offline…). */
  onMapError?: (error: MapError) => void;
  /** Called when the camera settles after a change. */
  onCameraChange?: (event: CameraChangeEvent) => void;
  onLongPress?: (coords: LngLat) => void;
  onPress?: (coords: LngLat) => void;
  /** Route drawn as a line on top of the map style. */
  route?: LngLat[];
  /** @default "#0A84FF" */
  routeColor?: string;
  /** @default 6 */
  routeWidth?: number;
  /** Shows the native user-location puck. Requires location permission. */
  showUserLocation?: boolean;
  /**
   * What the puck's arrow follows:
   * - `"heading"`: the compass (where the phone points), best on foot.
   * - `"course"`: the GPS direction of travel, best when driving; noisy at walking speed
   *   and frozen when stationary.
   * - `"default"`: a dot without an arrow.
   * @default "default"
   */
  userLocationMode?: UserLocationMode;
  /**
   * A position drawn by the map itself (a dot), e.g. the user snapped onto the route
   * during navigation, or a simulated position. Independent of `showUserLocation`.
   */
  userMarker?: LngLat;
  /**
   * Direction the user faces, in degrees clockwise from north. Draws an arrow in the
   * marker; leave undefined for a plain dot.
   */
  userMarkerHeading?: number;
  /**
   * Horizontal accuracy of `userMarker` in meters. Draws a circle of that radius on the
   * ground around it, so a poor fix (e.g. indoors) looks as uncertain as it is.
   */
  userMarkerAccuracy?: number;
  /**
   * - `"dot"`: a dot with a cone showing where the user faces; for standing or walking.
   * - `"arrow"`: a navigation arrow; for moving or navigating.
   * Without `userMarkerHeading` both draw a plain dot.
   * @default "dot"
   */
  userMarkerStyle?: UserMarkerStyle;
  /** @default routeColor */
  userMarkerColor?: string;
}

export type UserLocationMode = "default" | "heading" | "course";

export type UserMarkerStyle = "dot" | "arrow";

export interface MapViewRef {
  animateTo(camera: CameraState, durationMs?: number): void;
  fitBounds(sw: LngLat, ne: LngLat, paddingPx?: number, durationMs?: number): void;
  /** Renders the current map to an image file and resolves with its URI. */
  takeSnapshot(): Promise<string>;
}
