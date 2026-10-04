# @osm-navigator/core

Routing, search and navigation logic for OSM Navigator. Pure TypeScript with no React or native code, so it also runs in Node and in tests.

- **Routing:** `fetchRoute` talks to [Valhalla](https://github.com/valhalla/valhalla). It supports multi-leg routes, and turn codes are mapped to a small `ManeuverType` set.
- **Search:** `geocode` and `reverseGeocode` talk to [Photon](https://github.com/komoot/photon).
- **Navigation:** `NavigationEngine` turns GPS fixes into a navigation state: the position snapped to the route, the current step, distance and time remaining, off-route detection with hysteresis, and arrival.
- **Robust requests:** timeouts, `AbortSignal` cancellation, typed errors and checks on response shape.

## Setup

```ts
import { initOSMNavigator } from "@osm-navigator/core";

// Optional: every value has a default. Call it once at startup.
initOSMNavigator({
  userAgent: "my-app/1.0 (you@example.com)", // please identify your app
  valhallaEndpoint: "https://valhalla.example.com", // default: https://valhalla1.openstreetmap.de
  photonEndpoint: "https://photon.example.com", // default: https://photon.komoot.io
  mapStyleURL: "https://tiles.openfreemap.org/styles/liberty", // used by native-map
  requestTimeoutMs: 15_000,
  headers: { "X-Api-Key": "…" }, // sent with every request
});
```

`initOSMNavigator` throws a `ConfigError` for invalid values. `getConfig()` returns the resolved, read-only configuration. The default endpoints are free public services meant for fair use; see the [root README](../../README.md#public-services-and-fair-use) before shipping.

## Search

```ts
import { geocode, reverseGeocode } from "@osm-navigator/core";

const results = await geocode({
  query: "Petroleum Training Institute",
  limit: 5, // default 5
  locationBias: [5.75, 5.55], // [lng, lat]; prefer nearby results
  signal: controller.signal, // optional cancellation
});
// → [{ name, address, coordinates: [lng, lat], type, score?, raw }]

const [place] = await reverseGeocode({ coordinates: [5.75, 5.55] });
```

## Routing

```ts
import { fetchRoute } from "@osm-navigator/core";

const route = await fetchRoute({
  origin: [5.75, 5.55],
  destination: [5.78, 5.57],
  costing: "auto", // "auto" | "bicycle" | "pedestrian" | "motorcycle" | "truck" | "transit"
  waypoints: [], // optional pass-through points
  signal: controller.signal,
});

route.geometry; // [lng, lat][] for the whole trip
route.distanceMeters; // and route.durationSeconds
route.steps; // [{ instruction, maneuverType, distance, duration, startLocation, geometryIndex }]
```

## Navigation

```ts
import { NavigationEngine } from "@osm-navigator/core";

const engine = new NavigationEngine(route, {
  onStepChange: (step, index, state) => speak(step.instruction),
  onOffRouteChange: (isOffRoute, state) => {
    if (isOffRoute) reroute();
  },
  onArrive: (state) => speak("You have arrived."),
  // Tuning (defaults shown):
  offRouteThresholdMeters: 30,
  onRouteThresholdMeters: 15,
  offRouteConfirmations: 3,
  arrivalThresholdMeters: 20,
  lookAheadMeters: 500,
});

// For every GPS fix. Pass the accuracy when you have it: fixes whose uncertainty still
// reaches the route don't count as off-route, and GPS drift doesn't move progress forward.
const state = engine.update([lng, lat], accuracyMeters);
```

`NavigationState`:

| Field | Meaning |
| :--- | :--- |
| `currentStepIndex` | The step being travelled. Its maneuver is behind the user; the upcoming one is `steps[currentStepIndex + 1]`. |
| `distanceToNextStepMeters` | Along-route distance to the upcoming maneuver |
| `distanceRemainingMeters`, `timeRemainingSeconds`, `progress` | Trip totals; `progress` runs from 0 to 1 |
| `snappedPosition`, `routeBearing` | The user on the route, and the route's direction there. Use these for the marker and the camera. |
| `distanceFromRouteMeters`, `isOffRoute` | Raw distance from the route, and the debounced off-route flag |
| `isArrived` | Latched: once true, later updates are ignored |

The engine doesn't reroute or speak by itself; your app decides. A new route means a new engine. The example app's [`useNavigationSession`](../../apps/navigation-example/src/hooks/useNavigationSession.ts) shows a complete setup with spoken prompts and debounced rerouting.

### Routes from other providers

The engine only needs a `Route`, so you can build one from any provider's response (OSRM, GraphHopper, …) and pass it in. `Route.raw` is currently typed as a Valhalla response, so you'll need a cast there.

## Errors

Every error thrown by the SDK extends `OSMNavigatorError`:

| Error | When |
| :--- | :--- |
| `NetworkError` | No response (offline, DNS failure, connection reset) |
| `TimeoutError` | No answer within `requestTimeoutMs` (`url`, `timeoutMs`) |
| `AbortError` | Cancelled through your `signal` |
| `ServiceError` | HTTP status other than 2xx (`url`, `status`, `body`); a 429 means you're rate-limited |
| `InvalidResponseError` | The response isn't the expected shape |
| `ConfigError` | Invalid configuration or engine options |

`toErrorMessage(error)` gets a readable message from any thrown value.

## Utilities

- **Geo helpers:** `haversineDistance(a, b)`, `bearing(from, to)`, `projectOntoSegment(p, a, b)`, `cumulativeDistances(line)`, `EARTH_RADIUS_METERS`.
- **Polyline:** `decodePolyline(encoded, precision = 6)`.
- **Request helper:** `requestJson(url, init, guard, options)`, the HTTP helper the clients use (timeouts, cancellation, User-Agent and typed errors).
- **Types:** `LngLat` (`[longitude, latitude]`, the GeoJSON order), `CameraState`, `ManeuverType`.

## License

GPL-3.0-or-later. See the [root LICENSE](../../LICENSE).
