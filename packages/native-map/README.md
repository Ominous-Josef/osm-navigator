# @osm-navigator/native-map

Fabric-compatible <MapView /> for React Native (Expo Module).

## Features
- <MapView /> component (Fabric, TurboModules ready)
- Props: initialRegion, tileSourceUrl, onRegionChange
- Imperative ref: animateTo, fitBounds, takeSnapshot
- TypeScript strict mode, CodegenTypes primitives only

## Usage
```tsx
import { MapView } from "@osm-navigator/native-map";

<MapView
  style={{ flex: 1 }}
  initialRegion={{
    latitude: 52.5,
    longitude: 13.4,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }}
  tileSourceUrl="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
/>
```

## Native Implementation
- TODO(agent): Wire up imperative ref commands to native module (Fabric/TurboModules)

## License
MIT
