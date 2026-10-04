import type { CameraState, LngLat } from '@osm-navigator/core';
import { requireNativeViewManager } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

export interface NativePressEvent {
  latitude: number;
  longitude: number;
}

interface NativeMapViewProps extends ViewProps {
  styleURL?: string;
  initialCamera?: CameraState;
  camera?: CameraState;
  route?: LngLat[];
  onPress?: (event: NativeSyntheticEvent<NativePressEvent>) => void;
  showUserLocation?: boolean;
}

export const NativeMapView: ComponentType<NativeMapViewProps> = requireNativeViewManager('OSMNavigator');
