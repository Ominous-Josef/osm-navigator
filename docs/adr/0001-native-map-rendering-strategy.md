# 0001. Native map rendering strategy

- **Status:** Accepted
- **Date:** 2026-10-04
- **Deciders:** project maintainer

## Context

`@osm-navigator/native-map` is meant to render MapLibre maps in React Native. When this was decided:

- `expo-module.config.json` declared native modules (`OSMNavigatorModule`, `com.osmnavigator.OSMNavigatorModule`), but **no Swift or Kotlin implementation existed**. A root `.gitignore` rule (`ios/`, `android/`) would have kept any such code out of git anyway.
- `requireNativeViewManager('OSMNavigator')` therefore throws at import time, and every app using the SDK crashes on launch.
- Expo's tooling (prebuild / Continuous Native Generation, config plugins, `create-expo-module`) generates and configures **host app** native projects. It does **not** generate a native module's behaviour. Rendering a MapLibre view, applying props and emitting events must be implemented in Swift/Kotlin by *someone*.

The SDK's distinctive value is routing (Valhalla), geocoding (Photon), the navigation engine and the navigation UI. Map rendering is a commodity capability that existing open-source libraries already provide.

## Options considered

### Option A — Wrap `@maplibre/maplibre-react-native`
- **Pros:** unblocks the app in days. Mature, community-maintained native code for both platforms. Ships an Expo config plugin, so consumers write no native code.
- **Cons:** large transitive dependency. We inherit its release cadence, architecture requirements and bugs.

### Option B — Write our own Expo Module (Swift + Kotlin)
- **Pros:** full control. Minimal API surface. Matches the original README vision.
- **Cons:** weeks of work before anything renders. Two native codebases to maintain against MapLibre Native releases. Blocks all end-to-end verification in the meantime.

### Option C — A now, B later
Ship A behind a project-owned interface. Revisit B once the JS layers are proven and there's a concrete reason (see *Revisit when*).

## Decision

**Option C.** `@osm-navigator/native-map` wraps `@maplibre/maplibre-react-native` through an adapter. The **public API is owned by this project** and does not leak library types:

- `MapView` component, `MapViewProps`, `MapViewRef` (`animateTo`, `fitBounds`, `takeSnapshot`)
- Events: `onMapLoaded`, `onCameraChange`, `onPress`, `onLongPress`, `onMapError`
- Shared geo types (`LngLat`, `CameraState`) come from `@osm-navigator/core`

All library-specific code lives behind this boundary inside `packages/native-map/src/`, so replacing the implementation (a library major-version change, or a move to Option B) is a contained change with no breaking changes for SDK consumers.

## Consequences

- **No hand-written Kotlin/Swift for now.** Native setup is done by the library's Expo config plugin during `expo prebuild`.
- The dangling `expo-module.config.json` and the no-op root `app.plugin.js` are removed. Location permissions are configured through the `expo-location` config plugin.
- `.gitignore` native rules are anchored to `apps/*/ios/` and `apps/*/android/`, so a future Option B module under `packages/native-map/` can be committed.
- Adapter tests mock the library so the public contract is verified independently of native code.

### Version constraint (checked 2026-10-04 against the npm registry)

| Library line | Peer requirements | Latest release |
|---|---|---|
| `11.x` (latest `11.4.1`) | `expo >= 54`, `react-native >= 0.80`, `react >= 19.1`, New Architecture only | 2026-10-01 |
| `10.x` (final `10.4.2`) | `react-native >= 0.59.9` | 2025-12-03 |

The repo currently targets Expo SDK 51 (RN 0.74), which can only use the `10.x` line. `11.x` also introduced breaking API changes (e.g. `MapView` renamed to `Map`). Which line we adopt depends on when the Expo SDK upgrade happens. The adapter boundary keeps either path contained to `native-map` internals.

> **Resolved (2026-10-04):** [ADR 0002](./0002-expo-sdk-57-baseline.md) moves the repo to Expo SDK 57, so the **`11.x`** line is adopted.

## Revisit when

Consider Option B (or another library) if any of these happen:

- The wrapped library stops being maintained or falls behind supported Expo/RN versions.
- We need capabilities it can't expose: e.g. custom native navigation puck/camera tracking, offline-region APIs, or performance-critical route animation.
- Its binary size or transitive dependencies become a measurable problem for consumers.
