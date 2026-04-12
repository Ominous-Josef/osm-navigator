import type { ViewStyle } from "react-native";

export type LngLat = [number, number];

export interface CameraState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface CameraChangeEvent {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  isAnimating: boolean;
}

export interface MapViewProps {
  style?: ViewStyle;
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