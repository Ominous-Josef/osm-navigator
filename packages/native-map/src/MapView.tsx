import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeMapView } from './MapViewNativeComponent';
import { MapViewProps, MapViewRef } from './types';

export const MapView = React.forwardRef<MapViewRef, MapViewProps>(({
  style,
  styleURL = "https://tiles.openfreemap.org/styles/liberty",
  initialCamera,
  camera,
  onPress,
  ...props
}, ref) => {
  const handlePress = React.useCallback((event: any) => {
    if (onPress) {
      const { latitude, longitude } = event.nativeEvent;
      onPress([longitude, latitude]);
    }
  }, [onPress]);

  // TODO: Wire ref to native view commands (animateTo, fitBounds, takeSnapshot)
  // via requireNativeModule or UIManager.dispatchViewManagerCommand

  return (
    <View style={[styles.container, style]}>
      <NativeMapView
        style={StyleSheet.absoluteFill}
        styleURL={styleURL}
        initialCamera={initialCamera}
        camera={camera}
        onPress={handlePress}
        {...props}
      />
    </View>
  );
});

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
