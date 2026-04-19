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
| [`@osm-navigator/native-map`](./packages/native-map) | Expo Module wrapping MapLibre Native for high-performance map rendering. |
| [`@osm-navigator/ui-navigation`](./packages/ui-navigation) | Ready-to-use UI components for navigation (banners, turn icons, etc.). |
| [`navigation-example`](./apps/navigation-example) | A comprehensive demo app showcasing real-time navigation and search. |

---

## 🛠️ Requirements

- **Yarn Classic (v1)**: Workspaces management.
- **Expo SDK 51+**: Development Builds are required for native modules.
- **React Native 0.74+**: Utilizing the New Architecture (Fabric).
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

- [x] Initial MapLibre Native integration via Expo Module.
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

---

## 📝 License

This project is licensed under the MIT License - see each package for specific details.

---

*Disclaimer: This project is not affiliated with or endorsed by the OpenStreetMap Foundation.*
