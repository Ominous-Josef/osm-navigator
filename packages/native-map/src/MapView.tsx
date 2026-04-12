import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeMapView } from './MapViewNativeComponent';
import { MapViewProps } from './types';

export const MapView: React.FC<MapViewProps> = ({
  style,
  styleURL = "https://tiles.openfreemap.org/styles/liberty",
  initialCamera,
  camera,
  onPress,
  ...props
}) => {
  const handlePress = React.useCallback((event: any) => {
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
        onPress={handlePress}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
