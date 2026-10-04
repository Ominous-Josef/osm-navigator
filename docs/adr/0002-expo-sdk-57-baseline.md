# 0002. Expo SDK 57 baseline

- **Status:** Accepted
- **Date:** 2026-10-04
- **Deciders:** project maintainer

## Context

The repo targeted Expo SDK 51 (React Native 0.74, React 18.2). [ADR 0001](./0001-native-map-rendering-strategy.md) chose to wrap `@maplibre/maplibre-react-native`, whose maintained `11.x` line requires `expo >= 54`, `react-native >= 0.80` and `react >= 19.1` and supports only the New Architecture. The last `10.x` release that works on SDK 51 is from 2025-12-03.

The original plan was to fix everything on SDK 51 and upgrade afterwards. That would mean writing the map adapter twice (10.x API, then 11.x API, with breaking changes such as `MapView` → `Map`) and fixing React/RN type errors twice (React 18 types, then React 19 types).

Facts at decision time (checked against the npm registry, 2026-10-04):

| Package | SDK 57 pinned version |
|---|---|
| `expo` | `57.0.26` (latest) |
| `react-native` | `0.86.3` |
| `react` | `19.2.3` |
| `expo-router` / `expo-location` / `expo-speech` / `expo-dev-client` | `~57.0.x` |
| `react-native-svg` | `15.15.4` |
| `jest-expo` | `~57.0.5` |
| `@maplibre/maplibre-react-native` | `11.4.1` (peer range satisfied) |

## Options considered

### Option A — Stay on SDK 51, upgrade at the end
- **Pros:** no upgrade work up front.
- **Cons:** adapter built on an unmaintained library line, then rewritten. Type fixes redone for React 19. Building on a two-year-old toolchain.

### Option B — Upgrade before the native-map phase
- **Pros:** the map adapter is written once.
- **Cons:** UI type fixes done earlier still get redone against React 19 types. SDK 51 packages are installed only to be thrown away.

### Option C — Upgrade as part of the Phase 0 dependency baseline
- **Pros:** one install, one set of type fixes, adapter written once against the maintained library. Cheap now, because no native projects are committed (CNG) and the example app is being rebuilt anyway.
- **Cons:** a large version jump (51 → 57) in one step, so release-note breaking changes must be reviewed rather than discovered gradually.

## Decision

**Option C.** Re-baseline the monorepo directly on **Expo SDK 57** during Phase 0, using `npx expo install --fix` to align every Expo-managed package to SDK 57 pins. `@maplibre/maplibre-react-native` is adopted at **`11.x`**.

## Consequences

- **The New Architecture is mandatory.** React Native 0.86 has no legacy architecture, which matches the README's stated direction.
- **React 19 patterns:** components take `ref` as a normal prop instead of `React.forwardRef`. JSX types come from the `React.JSX` namespace.
- **Metro:** SDK 52+ auto-configures monorepos, so the hand-written `watchFolders` / `nodeModulesPaths` overrides are removed unless verification shows they're still needed.
- **Yarn Classic (v1)** remains the package manager. Hoisted installs are supported by Expo.
- Release notes for SDKs 52–57 must be reviewed for breaking changes affecting `expo-router`, `expo-location` and `expo-speech`. Findings go into the Phase 0 checkpoint report.
- The deferred "SDK upgrade" phase is removed from the implementation plan.

## Revisit when

- A new Expo SDK is released: adopt it on the normal cadence (Expo supports roughly the latest few SDKs).
- `@maplibre/maplibre-react-native` publishes a major version with a different Expo/RN peer range.
