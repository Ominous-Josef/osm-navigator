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
  isAnimating: boolean;
}

export interface MapViewProps {
  ref?: Ref<MapViewRef>;
  style?: StyleProp<ViewStyle>;
  styleURL?: string;
  initialCamera?: CameraState;
  camera?: CameraState;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  attributionEnabled?: boolean;
  compassEnabled?: boolean;
  scaleBarEnabled?: boolean;
  onMapLoaded?: () => void;
  onCameraChange?: (event: CameraChangeEvent) => void;
  onLongPress?: (coords: LngLat) => void;
  onPress?: (coords: LngLat) => void;
  route?: LngLat[];
  showUserLocation?: boolean;
}

export interface MapViewRef {
  animateTo(camera: CameraState, durationMs?: number): void;
  fitBounds(sw: LngLat, ne: LngLat, paddingPx?: number, durationMs?: number): void;
  takeSnapshot(): Promise<string>;
}
