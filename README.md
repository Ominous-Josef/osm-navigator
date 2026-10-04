# OSM Navigator (`osm-navigator`)

**Open-source turn-by-turn navigation for React Native and Expo, built on OpenStreetMap.**

[![CI](https://github.com/Ominous-Josef/osm-navigator/actions/workflows/ci.yml/badge.svg)](https://github.com/Ominous-Josef/osm-navigator/actions/workflows/ci.yml)

OSM Navigator puts map rendering, routing, search and navigation logic into separate packages, so you can build a navigation app on open data without paying per request. By default it uses free public services: [OpenFreeMap](https://openfreemap.org/) tiles, [Valhalla](https://github.com/valhalla/valhalla) routing and [Photon](https://github.com/komoot/photon) search. You can point it at your own servers instead.

> **Status: early development (0.1.0).** The packages work end to end in the example app, which has been tested on a physical Android device. iOS has not been tested yet, and nothing is published to npm, so use the packages from this repository for now.

---

## Packages

| Package | What it does |
| :--- | :--- |
| [`@osm-navigator/core`](./packages/core) | Routing (Valhalla), search (Photon), configuration, typed errors, and `NavigationEngine`, which tracks progress along a route, detects off-route and arrival, and has no UI. Pure TypeScript. |
| [`@osm-navigator/native-map`](./packages/native-map) | A `<MapView />` that draws the map, the route, and a user marker with heading and GPS accuracy. Built on MapLibre Native through [`@maplibre/maplibre-react-native`](https://github.com/maplibre/maplibre-react-native), behind our own API ([ADR 0001](./docs/adr/0001-native-map-rendering-strategy.md)). |
| [`@osm-navigator/ui-navigation`](./packages/ui-navigation) | Themeable navigation UI: maneuver banner, step list, progress bar, off-route and arrival cards, error banners, SVG maneuver icons, and distance/duration formatting. |
| [`navigation-example`](./apps/navigation-example) | A complete navigation app built from the packages: search, start, voice prompts, rerouting, GPS signal warnings and a simulated drive for testing. Start here to see how the pieces fit. |

## How it fits together

```
          search ─────────► geocode()            (core → Photon)
                                │ destination
          GPS position ──► fetchRoute()          (core → Valhalla)
                                │ Route
      GPS fixes ──────────► NavigationEngine     (core, pure logic)
                                │ NavigationState: snapped position, current step,
                                │ distance to the next turn, off-route, arrived
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
   <MapView route userMarker camera/>   <NavigationBanner/>, <TurnByTurnOverlay/>, …
         (native-map)                          (ui-navigation)
```

Your app connects these. It decides when to reroute, what to say out loud, and how the camera behaves. [`apps/navigation-example/src/hooks/useNavigationSession.ts`](./apps/navigation-example/src/hooks/useNavigationSession.ts) is a complete, tested example to copy from.

## Quick look

```ts
import { fetchRoute, geocode, initOSMNavigator, NavigationEngine } from "@osm-navigator/core";

initOSMNavigator({ userAgent: "my-app/1.0 (contact@example.com)" });

const [place] = await geocode({ query: "Petroleum Training Institute", locationBias: here });
const route = await fetchRoute({ origin: here, destination: place.coordinates });

const engine = new NavigationEngine(route, {
  onStepChange: (step) => speak(step.instruction),
  onOffRouteChange: (offRoute) => offRoute && reroute(),
  onArrive: () => speak("You have arrived."),
});

// For each GPS fix:
const state = engine.update([lng, lat], accuracyMeters);
```

```tsx
<MapView
  style={{ flex: 1 }}
  route={route.geometry}
  userMarker={state.snappedPosition}
  userMarkerHeading={state.routeBearing}
  userMarkerStyle="arrow"
  camera={{ longitude, latitude, zoom: 17, pitch: 55, bearing: state.routeBearing }}
/>
<NavigationBanner
  instruction={next.instruction}
  maneuverType={next.maneuverType}
  distanceToManeuver={state.distanceToNextStepMeters}
/>
```

Each package README covers its full API.

---

## Requirements

- **Node.js 24** (CI uses it; Node 22 should also work).
- **Yarn Classic 1.22.22**, pinned in `package.json`. Run `corepack enable` once to get it.
- **Expo SDK 57**, **React Native 0.86**, **React 19.2**, New Architecture only ([ADR 0002](./docs/adr/0002-expo-sdk-57-baseline.md)).
- **A development build.** MapLibre is native code, so **Expo Go can't run the app.** Minimum OS versions follow Expo SDK 57's defaults.
- **To build for Android:** Android Studio and its bundled JDK (JDK 21). Newer system JDKs can break Gradle.

## Getting started

```bash
git clone https://github.com/Ominous-Josef/osm-navigator.git
cd osm-navigator
corepack enable
yarn install
```

Run the example app on a device or emulator:

```bash
# First time, and after native dependency changes: build and install the dev client.
yarn workspace navigation-example android     # or: ios

# After that, just start Metro and open the installed app.
yarn workspace navigation-example start
```

In development builds, the search panel has a **Simulate drive** switch: it drives along the route at about 43 km/h, so you can test navigation from your desk. A **Gallery** link shows every UI component in light and dark themes.

> [!TIP]
> If Gradle seems stuck on the first Android build, it's usually downloading several hundred MB of dependencies. Run it with `--info` to watch progress. If the system JDK is too new, point `JAVA_HOME` at Android Studio's (`/opt/android-studio/jbr` on Linux).

## Development

| Command | What it does |
| :--- | :--- |
| `yarn typecheck` | Type-checks every package, the app and all tests |
| `yarn lint` | ESLint (typescript-eslint and React hooks / React Compiler rules) |
| `yarn test` | Jest: `core` in Node; `ui-navigation` and the app with `jest-expo` and React Native Testing Library |
| `yarn test:coverage` | The same, with the 90% coverage threshold enforced |
| `yarn build` | Builds the packages' `dist/` output with `tsc -b` |

[CI](./.github/workflows/ci.yml) runs install → typecheck → lint → tests with coverage on every pull request and every push to `main`. It doesn't build the native app.

During development Metro reads the packages' TypeScript sources directly through their `"react-native"` field, so you don't need to build them first.

Design decisions are recorded as ADRs in [`docs/adr/`](./docs/adr/README.md).

---

## Public services and fair use

The defaults point at free services run by volunteers and small organisations:

| Service | Default | Policy |
| :--- | :--- | :--- |
| Map tiles | `https://tiles.openfreemap.org/styles/liberty` | Run by [OpenFreeMap](https://openfreemap.org/); see its terms |
| Routing | `https://valhalla1.openstreetmap.de` | Run by [FOSSGIS](https://www.fossgis.de/); see its usage policy |
| Search | `https://photon.komoot.io` | Run by [komoot](https://photon.komoot.io); fair use only |

They're fine for development and demos, **not for production traffic**. Before you ship:

1. **Identify your app** with a `userAgent` that includes contact details: `initOSMNavigator({ userAgent: "my-app/1.0 (you@example.com)" })`.
2. **Don't send unnecessary requests.** Debounce search and limit rerouting; the example app waits 300 ms before searching and reroutes at most once every 15 s.
3. **For real usage, run your own instances or use a paid provider:**
   - Valhalla and Photon are both self-hostable;
   - `initOSMNavigator` takes `valhallaEndpoint`, `photonEndpoint`, `mapStyleURL` and extra `headers`, for example an API key.

### Other routing or search providers

`NavigationEngine` and the UI only need a `Route`: a line of `[lng, lat]` points plus steps. You can build one from any provider's response, for example OSRM, GraphHopper or a commercial API, and pass it to the engine.

For now, `fetchRoute` and `geocode` only speak Valhalla and Photon, and `Route.raw` is typed as a Valhalla response. A pluggable provider interface is on the roadmap.

Check your provider's terms. Some, including Google Maps Platform, don't allow their routes or places to be shown on a non-Google map or used for turn-by-turn guidance.

---

## Roadmap

- [x] Valhalla routing (multi-leg), Photon search, typed errors, timeouts and cancellation
- [x] `NavigationEngine`: route snapping, monotonic progress, off-route detection with hysteresis, arrival, GPS-accuracy-aware
- [x] MapLibre map with route, a user marker that shows heading and accuracy, and a follow camera
- [x] Themeable UI components with SVG maneuver icons
- [x] Example app: voice prompts, automatic rerouting, offline and weak-GPS warnings, simulated drive
- [x] CI: typecheck, lint, tests with coverage
- [ ] Test on iOS
- [ ] Pluggable routing and search providers
- [ ] Publish the packages to npm
- [ ] Offline maps and routing

## Contributing

Issues and pull requests are welcome.

1. Fork the repo and create a branch: `git checkout -b feature/my-change`.
2. Make sure `yarn typecheck`, `yarn lint` and `yarn test` pass. CI runs the same checks.
3. Open a pull request describing the change. For an architectural change, add an ADR (see [`docs/adr/`](./docs/adr/README.md)).

### AI assistance

Parts of this project are developed with AI assistance ([Claude Code](https://claude.com/claude-code)). Commits produced this way carry a `Co-Authored-By: Claude` trailer, and every change is reviewed by a human maintainer before it lands. Contributors may use AI tools too; please disclose substantial AI-generated contributions in your pull request description.

---

## Data and attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/). The default tiles are served by [OpenFreeMap](https://openfreemap.org/). Routing is done by [Valhalla](https://github.com/valhalla/valhalla) and search by [Photon](https://github.com/komoot/photon); both use OpenStreetMap data.

If you ship an app built with OSM Navigator, you must display "© OpenStreetMap contributors" visibly on the map, per the [OSM attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines). `MapView` can show MapLibre's attribution button (`attributionEnabled`); keep it visible, or show the credit yourself. Other tile or data providers you configure may have additional attribution requirements.

## License

Copyright (C) 2026 Josef

Licensed under the [GNU General Public License v3.0 or later](./LICENSE) (`GPL-3.0-or-later`). This applies to all packages and the example app in this repository.

---

*This project is not affiliated with or endorsed by the OpenStreetMap Foundation.*
