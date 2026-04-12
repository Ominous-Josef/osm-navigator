import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { ViewProps } from 'react-native';

interface NativeMapViewProps extends ViewProps {
  styleURL?: string;
  initialCamera?: {
    latitude: number;
    longitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
  };
  camera?: {
    latitude: number;
    longitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
  };
  route?: [number, number][];
  onPress?: (event: { nativeEvent: { latitude: number; longitude: number } }) => void;
  showUserLocation?: boolean;
}

export const NativeMapView: React.ComponentType<NativeMapViewProps> = requireNativeViewManager('OSMNavigator');