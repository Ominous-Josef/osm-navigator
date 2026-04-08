// MapView.tsx
// Fabric-compatible MapView component for React Native

import * as React from "react";
import { HostComponent, requireNativeComponent, ViewProps } from "react-native";

// Only use CodegenTypes primitives for props
export interface MapViewProps extends ViewProps {
  style?: object;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  tileSourceUrl?: string;
  onRegionChange?: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
}

export interface MapViewRef {
  animateTo(region: MapViewProps["initialRegion"], durationMs?: number): void;
  fitBounds(bounds: { northEast: [number, number]; southWest: [number, number] }, durationMs?: number): void;
  takeSnapshot(options?: { format?: "png" | "jpeg"; quality?: number }): Promise<string>;
}

const NativeMapView: HostComponent<MapViewProps> = requireNativeComponent("MapView");

export const MapView = React.forwardRef<MapViewRef, MapViewProps>((props, ref) => {
  // TODO(agent): Wire up imperative ref commands to native module (Fabric/TurboModules)
  return <NativeMapView {...props} ref={ref as any} />;
});

MapView.displayName = "MapView";
