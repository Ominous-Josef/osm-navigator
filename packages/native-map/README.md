# @osm-navigator/native-map

The map component for OSM Navigator: vector tiles, a route line, a user marker and a controllable camera.

It's built on MapLibre Native through [`@maplibre/maplibre-react-native`](https://github.com/maplibre/maplibre-react-native). The props and ref are this package's own, so the renderer can change later without breaking your code ([ADR 0001](../../docs/adr/0001-native-map-rendering-strategy.md)).

## Installation

MapLibre is native code, so your app needs it as a direct dependency and config plugin, and has to run as a **development build**; Expo Go doesn't include MapLibre.

```bash
npx expo install @maplibre/maplibre-react-native
```

```jsonc
// app.json
{
  "expo": {
    "plugins": ["@maplibre/maplibre-react-native"]
  }
}
```

Then rebuild the app (`npx expo run:android` / `run:ios`). To show the device's own location puck (`showUserLocation`), also set up `expo-location` and its permission.

## Usage

```tsx
import { MapView, type MapViewRef } from "@osm-navigator/native-map";

const mapRef = useRef<MapViewRef>(null);

<MapView
  ref={mapRef}
  style={{ flex: 1 }}
  initialCamera={{ longitude: 5.75, latitude: 5.55, zoom: 14 }}
  onPress={(lngLat) => pickDestination(lngLat)}
  route={route?.geometry}
  userMarker={position}
  userMarkerHeading={heading}
  userMarkerAccuracy={accuracyMeters}
  userMarkerStyle={isNavigating ? "arrow" : "dot"}
/>;

mapRef.current?.animateTo({ longitude: 5.78, latitude: 5.57, zoom: 15 }, 800);
```

## Props

| Prop | Description |
| :--- | :--- |
| `styleURL` | MapLibre style URL. Defaults to `getConfig().mapStyleURL` from `@osm-navigator/core` (OpenFreeMap Liberty). |
| `initialCamera` | Starting position (uncontrolled) |
| `camera` | Controlled camera. Every change animates over `cameraAnimationDurationMs` (default 500). Leave it undefined to let the user pan freely. |
| `route`, `routeColor`, `routeWidth` | A route line (`[lng, lat][]`). Defaults: `#0A84FF`, 6. |
| `userMarker` | Draws the user at this position. It's drawn by the map itself, so it can show a snapped or simulated position. |
| `userMarkerHeading` | Degrees clockwise from north. Adds a heading indicator; leave it undefined for a plain dot. |
| `userMarkerAccuracy` | GPS accuracy in meters. Draws a circle of that radius on the ground, so a poor (indoor) fix looks as uncertain as it is. |
| `userMarkerStyle` | `"dot"`: a dot with a cone showing where the user faces, for standing or walking. `"arrow"`: a navigation arrow on a white disc, for moving or navigating. Default `"dot"`. |
| `userMarkerColor` | Defaults to `routeColor`. Tints the dot, cone and arrow. |
| `showUserLocation`, `userLocationMode` | MapLibre's built-in location puck: `"default"`, `"heading"` (compass) or `"course"` (direction of travel). Needs location permission. |
| `onPress`, `onLongPress` | Called with `[lng, lat]` |
| `onCameraChange` | Called when the camera settles. Includes `isUserInteraction`, so you can stop following when the user pans. |
| `onMapLoaded`, `onMapError` | Called when the style loads, or when the style or tiles fail to load |
| `pitchEnabled`, `rotateEnabled`, `compassEnabled`, `scaleBarEnabled`, `attributionEnabled` | Map controls and gestures |

## Ref

| Method | Description |
| :--- | :--- |
| `animateTo(camera, durationMs?)` | Ease to a camera position |
| `fitBounds(sw, ne, paddingPx?, durationMs?)` | Fit a bounding box |
| `takeSnapshot()` | Render the map to an image file and resolve with its URI |

## Attribution

OpenStreetMap data requires visible "© OpenStreetMap contributors" credit. Keep MapLibre's attribution button visible (`attributionEnabled`), or show the credit yourself.

## Development

The marker icons are generated, not hand-drawn. To change them, edit [`scripts/generate-marker-images.py`](./scripts/generate-marker-images.py) and run it (it needs Pillow). It writes `src/markerImages.ts` with the icons inlined as data URIs, so the package ships no image files.

## License

GPL-3.0-or-later. See the [root LICENSE](../../LICENSE).
