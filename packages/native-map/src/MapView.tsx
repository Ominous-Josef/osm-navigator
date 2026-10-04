import { useCallback } from 'react';
import { NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { NativeMapView, NativePressEvent } from './MapViewNativeComponent';
import { MapViewProps } from './types';

export function MapView({
  // TODO(phase 4): wire ref to native view commands (animateTo, fitBounds, takeSnapshot)
  // via useImperativeHandle. Destructured so it isn't spread onto the native view.
  ref: _ref,
  style,
  styleURL = "https://tiles.openfreemap.org/styles/liberty",
  initialCamera,
  camera,
  onPress,
  ...props
}: MapViewProps) {
  const handlePress = useCallback((event: NativeSyntheticEvent<NativePressEvent>) => {
    if (onPress) {
      const { latitude, longitude } = event.nativeEvent;
      onPress([longitude, latitude]);
    }
  }, [onPress]);

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
