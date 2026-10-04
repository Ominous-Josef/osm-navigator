# OSM Navigator (`osm-navigator`)
**The Open-Source Navigation Standard for React Native & Expo**

> "Navigating the world with Open Data, powered by the community."

OSM Navigator is a high-performance, open-source mapping and navigation SDK for React Native. It offers a zero-cost, privacy-focused alternative to proprietary solutions like Google Maps and Mapbox by unbundling map rendering, routing, and geocoding.

---

## Key Features

- **High-Performance Map Rendering**: Powered by **MapLibre Native** for smooth, vector-based maps.
- **Turn-by-Turn Routing**: Integration with **Valhalla** REST API for fast and flexible navigation.
- **Geocoding & Search**: Built-in support for **Photon** (OpenStreetMap-based search).
- **Open Data First**: Native support for **OpenFreeMap** and **Protomaps** tile sources.
- **Modern React Native**: Built as an **Expo Module** leveraging the **New Architecture** (Fabric/TurboModules).

---

## Monorepo Structure

This project is managed as a monorepo using Yarn Workspaces:

| Package | Description |
| :--- | :--- |
| [`@osm-navigator/core`](./packages/core) | Core logic for routing (Valhalla), geocoding (Photon), and shared types. |
| [`@osm-navigator/native-map`](./packages/native-map) | Map component backed by MapLibre Native (via `@maplibre/maplibre-react-native`, see [ADR 0001](./docs/adr/0001-native-map-rendering-strategy.md)). |
| [`@osm-navigator/ui-navigation`](./packages/ui-navigation) | Ready-to-use UI components for navigation (banners, turn icons, etc.). |
| [`navigation-example`](./apps/navigation-example) | A comprehensive demo app showcasing real-time navigation and search. |

---

## 🛠️ Requirements

- **Yarn Classic (v1.22.22)**: Workspaces management. Run `corepack enable` to get the pinned version.
- **Expo SDK 57**: Development Builds are required for native modules (see [ADR 0002](./docs/adr/0002-expo-sdk-57-baseline.md)).
- **React Native 0.86 / React 19.2**: New Architecture only.
- **iOS**: Swift 5.9+, iOS 13.4+
- **Android**: Kotlin 1.9+, SDK 24+

---

## Getting Started

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Ominous-Josef/osm-navigator.git
cd osm-navigator
yarn install
```

### 2. Development

To run the navigation example app:

```bash
# Start the development server
yarn workspace navigation-example start

# Run on iOS
yarn workspace navigation-example ios

# Run on Android
yarn workspace navigation-example android
```

> [!NOTE]
> Since this project uses native modules, you must use **Development Builds** (`npx expo run:ios` or `npx expo run:android`) rather than Expo Go.

---

## Architecture

OSM Navigator follows a modular architecture:

1.  **Core Engine**: MapLibre Native handles the heavy lifting of map rendering using Metal (iOS) and Vulkan (Android).
2.  **Service Layer**: The `@osm-navigator/core` package provides functional clients for Valhalla (Routing) and Photon (Geocoding).
3.  **UI Component Layer**: `@osm-navigator/ui-navigation` provides a set of themeable components that react to the navigation state provided by the core logic.

---

## Roadmap & Current Status

The project is currently in active development. Current focus areas include:

- [ ] MapLibre Native integration (via `@maplibre/maplibre-react-native`, see ADR 0001).
- [x] Basic routing and geocoding clients.
- [/] **Real-time Navigation Performance**: Optimizing geometry lookups and simulation state.
- [ ] **Native Permissions**: Automating location permission requests via Expo Config Plugin.
- [ ] **Offline Maps**: Support for mbtiles and offline routing.

<!-- See the [audit walkthrough](./osmnavigator-walkthrough.md) for a detailed list of internal improvements and bug fixes currently in progress. -->

---

## Contributing

We welcome contributions! Please feel free to open issues or submit pull requests.

1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

### AI Assistance

Parts of this project are developed with AI assistance ([Claude Code](https://claude.com/claude-code)). Commits produced this way carry a `Co-Authored-By: Claude` trailer, and every change is reviewed by a human maintainer before it lands. Contributors may use AI tools too; please disclose substantial AI-generated contributions in your pull request description.

---

## 🗺️ Data & Attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/). Default tiles are served by [OpenFreeMap](https://openfreemap.org/); routing by [Valhalla](https://github.com/valhalla/valhalla) and geocoding by [Photon](https://github.com/komoot/photon), both of which use OpenStreetMap data.

If you ship an app built with OSM Navigator, you must display "© OpenStreetMap contributors" visibly on the map, per the [OSM attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines). Other tile or data providers you configure may have additional attribution requirements.

---

## 📝 License

Copyright (C) 2026 Josef

This project is licensed under the [GNU General Public License v3.0 or later](./LICENSE) (`GPL-3.0-or-later`). Applies to all packages and the example app in this repository.

---

*Disclaimer: This project is not affiliated with or endorsed by the OpenStreetMap Foundation.*
