# osm-navigator — Project Audit

Scope: every tracked file (3 packages, 2 apps, root config). `node_modules` is not installed, so I couldn't run `tsc`. The type errors listed below come from reading the code, not from a compiler run.

---

## 🔴 P0 — Blockers (the app cannot run)

### 1. The native map module has no native code, and `.gitignore` hides it
- [expo-module.config.json](file:///home/thutmose/Documents/work/osm-navigator/packages/native-map/expo-module.config.json) declares `OSMNavigatorModule` (iOS) and `com.osmnavigator.OSMNavigatorModule` (Android).
- `packages/native-map/ios/` and `packages/native-map/android/` **do not exist**.
- Root [.gitignore](file:///home/thutmose/Documents/work/osm-navigator/.gitignore#L13-L14) ignores `android/` and `ios/` **at any depth**. I confirmed this with `git check-ignore`. If native code was ever written, it was never committed.
- Result: `requireNativeViewManager('OSMNavigator')` in [MapViewNativeComponent.ts](file:///home/thutmose/Documents/work/osm-navigator/packages/native-map/src/MapViewNativeComponent.ts#L26) throws at import time, so **both apps crash on launch**.
- Fix: anchor the ignores to the app folders (`/apps/*/android/`, `/apps/*/ios/`). The Swift/Kotlin MapLibre module still has to be written.

### 2. Metro config is misnamed, so Metro never loads it
- Both apps have `metro-config.js`. Metro only looks for **`metro.config.js`**.
- Without it, `watchFolders` and the `extraNodeModules` workspace aliases are never applied.

### 3. Package entrypoints point to build output that doesn't exist
- `core` and `native-map` use `"main": "dist/index.js"`. `dist/` is gitignored and never built before `expo start`.
- `ui-navigation` is inconsistent: `main` points to `src/index.ts`, but `types` points to `dist/index.d.ts`.
- Combined with #2, imports of `@osm-navigator/*` fail to resolve.

### 4. The `example` app is broken scaffolding
- [apps/example/app/_layout.tsx](file:///home/thutmose/Documents/work/osm-navigator/apps/example/app/_layout.tsx) contains only a `TODO(agent)` comment and has no default export. expo-router will fail.
- It largely duplicates `navigation-example`: same deps and a near-identical screen with a simulator.

---

## 🟠 P1 — Functional bugs

### Navigation example ([index.tsx](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx))

| # | Line | Issue |
|---|---|---|
| 5 | [L164-L223](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L164-L223) | **GPS subscription leak / race.** `watchPositionAsync` is awaited inside the effect. If cleanup runs before it resolves (e.g. the user exits quickly), `locationSubRef` is still `null`. The subscription is assigned later and never removed, so GPS keeps running in the background. |
| 6 | [L188-L192](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L188-L192) | **Arrival is announced repeatedly.** Every GPS tick within 30 m calls `safeSpeech('You have arrived…')`. Nothing latches the arrival or stops tracking. |
| 7 | [L195-L205](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L195-L205) | **Step detection is fragile.** It snaps to the nearest *vertex* (not segment) across the whole route, so routes that loop back or run close to themselves jump between steps. `geometry.indexOf(startLocation)` depends on array reference identity and runs O(n·m) on every tick. |
| 8 | [L283-L288](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L283-L288) | **Distance to the next maneuver is straight-line** (haversine), not along the route, so it's wrong on curved roads. |
| 9 | [L127-L136](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L127-L136) | **Search race.** A slow earlier response can overwrite a newer one. There's no `AbortController` and no request-ID check. |
| 10 | [L240](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L240) | `getCurrentPositionAsync({})` has no timeout, so the spinner can hang indefinitely indoors. |
| 11 | [L226-L267](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L226-L267) | Start Navigation isn't disabled while loading, so double-taps fire duplicate requests. |

### Core services
- **No timeouts or cancellation** in [ValhallaClient](file:///home/thutmose/Documents/work/osm-navigator/packages/core/src/routing/ValhallaClient.ts#L129) or [PhotonClient](file:///home/thutmose/Documents/work/osm-navigator/packages/core/src/geocoding/PhotonClient.ts#L49). `fetch` can hang forever.
- **Waypoints are silently dropped.** Only `legs[0]` is used ([L141](file:///home/thutmose/Documents/work/osm-navigator/packages/core/src/routing/ValhallaClient.ts#L141)), but `through` waypoints and multi-leg trips can produce several legs.
- **Unvalidated responses.** `as ValhallaRouteResponse` / `as PhotonResponse` are trusted blindly. A malformed body crashes on `data.trip.legs`.
- **Exit maneuvers are mislabelled.** Exits (20/21) map to `straight` instead of slight-right/left. Ferry, merge-left/right and other types fall through to `straight`.
- A `[0, 0]` fallback for `startLocation` ([L103](file:///home/thutmose/Documents/work/osm-navigator/packages/core/src/routing/ValhallaClient.ts#L103)) hides bad data behind a valid coordinate (Gulf of Guinea).
- Requesting `units: "miles"` and then converting to metres is a needless lossy round-trip. Request `kilometers` instead.
- Public Valhalla and Photon instances have **fair-use policies**. Shipping them as SDK defaults with no `User-Agent` header risks rate limiting or bans.

### MapView ([MapView.tsx](file:///home/thutmose/Documents/work/osm-navigator/packages/native-map/src/MapView.tsx))
- The `ref` is accepted but **never wired**: there's no `useImperativeHandle`. `mapRef.current.animateTo()` (used in `apps/example`) throws.
- `onMapLoaded`, `onCameraChange` and `onLongPress` are declared in props but never bridged to native events. `onLongPress` gets passed straight through via `...props`.
- `styleURL` hard-codes the default instead of reading `getConfig().mapStyleURL`, so `initOSMNavigator({ mapStyleURL })` has no effect.

---

## 🟡 P2 — Type safety and API design

- **`any` usage** (violates the strict-typing rule): `event: any` in [MapView.tsx:L14](file:///home/thutmose/Documents/work/osm-navigator/packages/native-map/src/MapView.tsx#L14) and `catch (error: any)` in [index.tsx:L258](file:///home/thutmose/Documents/work/osm-navigator/apps/navigation-example/app/index.tsx#L258).
- **`RouteStep.maneuverType` is typed as `string`**, which forces an unsafe `as ManeuverType` cast in the apps. The maneuver union should live in `core` and be shared.
- **`LngLat` is defined twice** (core and native-map), and `CameraState` is duplicated inline in `NativeMapViewProps`.
- **Undeclared dependencies.** `ui-navigation` imports `@osm-navigator/core` but doesn't list it. No package declares `react`/`react-native` peer deps except native-map, which uses `"*"`.
- **Missing project references.** `ui-navigation/tsconfig.json` has no `references` to core, so composite builds rely on `dist/` already existing.
- **Probable type errors** (not compiler-verified):
  - `ui-navigation` components use JSX without importing `React` under `jsx: react-native`.
  - The `` `${n}%` `` width in RouteProgressBar is typed as `string`, not `DimensionValue`.
  - `fontWeight` is used inside a `View` style.
- **TypeScript version drift:** root `^5.4`, apps `~5.3.3`.

---

## 🟡 P2 — UI component defects

- [ManeuverIcon](file:///home/thutmose/Documents/work/osm-navigator/packages/ui-navigation/src/components/ManeuverIcons.tsx#L12) **ignores its `color` prop**. Emoji glyphs render differently on each platform and can't be themed.
- [TurnByTurnOverlay](file:///home/thutmose/Documents/work/osm-navigator/packages/ui-navigation/src/components/TurnByTurnOverlay.tsx):
  - `units` and `onClose` are accepted but unused.
  - Raw float metres are rendered (e.g. `1234.5678 m`).
  - Black text sits on a dark translucent background.
  - Long routes aren't scrollable.
  - It uses `key={i}`.
- Distance formatting exists only inside `NavigationBanner`. It isn't shared, has no imperial support, and isn't locale-aware.
- No theming tokens: colours are hard-coded separately in each component and app.
- Missing states: there's no empty state for "no search results", no off-route/reroute handling, and no network-offline banner.

---

## ⚪ P3 — Repo hygiene and tooling

- `tsconfig.tsbuildinfo` files are committed in all three packages; they should be gitignored.
- [app.plugin.js](file:///home/thutmose/Documents/work/osm-navigator/app.plugin.js) is a no-op: it reads `build.gradle` and writes it back unchanged. `withDangerousMod` is unnecessary here.
- The root [app.json](file:///home/thutmose/Documents/work/osm-navigator/app.json) and the `expo.autolinking` block in the root `package.json` are meaningless at the monorepo root.
- The root `devDependencies` lists `@osm-navigator/native-map`, which is odd.
- The `lint` script references ESLint 8, but there's no ESLint config file.
- There are **zero tests**. The polyline decoder, maneuver mapping and geo-math are pure functions and easy to unit test.
- Geo utilities (`haversineDistance`, `calculateBearing`, `findNearestGeometryIndex`) live inside an app screen instead of `core`.
- [.workspace](file:///home/thutmose/Documents/work/osm-navigator/.workspace) still refers to `/apps/example`, while the README refers to `navigation-example`.
- Expo SDK 51 / RN 0.74 is quite old relative to today (Oct 2026), and the README's "New Architecture" claim needs SDK 52+ defaults to be meaningful.

---

## Suggested fix order

```mermaid
flowchart LR
  A["P0: gitignore + metro.config.js + entrypoints"] --> B["P0: native MapLibre module (iOS/Android)"]
  A --> C["P1: core hardening (timeouts, validation, legs, types)"]
  C --> D["P1: extract nav engine from app into core + tests"]
  D --> E["P2: UI components, theming, states"]
  B --> E
```
