# Example App: osm-navigator

This is a demo Expo app for the osm-navigator SDK.

## Features
- Map rendering (<MapView />)
- Turn-by-turn routing (Valhalla)
- Geocoding (Photon)
- UI overlays for navigation

## Usage
1. Install dependencies from the monorepo root:
   ```sh
   yarn install
   ```
2. Build a development client (Expo Dev Build required):
   ```sh
   cd apps/example
   expo run:android # or expo run:ios
   ```

## Requirements
- Expo SDK 51+
- React Native 0.74+ (New Architecture)
- Development builds only (not Expo Go)

## License
MIT
