# @osm-navigator/core

Core SDK for OSM Navigator: Valhalla routing, Photon geocoding, and unified config.

## Features
- ValhallaClient: Turn-by-turn routing (Valhalla REST API)
- PhotonClient: Geocoding (Photon REST API)
- initOSMNavigator: Unified config, optional custom endpoints

## Usage
```ts
import { initOSMNavigator } from "@osm-navigator/core";

const osm = initOSMNavigator({
  valhalla: { endpoint: "https://valhalla1.openstreetmap.de" },
  photon: { endpoint: "https://photon.komoot.io/api" },
});

// Routing
const route = await osm.valhalla.route({
  locations: [
    { lat: 52.5, lon: 13.4 },
    { lat: 52.6, lon: 13.5 },
  ],
  costing: "auto",
});

// Geocoding
const results = await osm.photon.search({ q: "Berlin" });
```

## TypeScript
- All props and types are explicit, strict mode enabled.

## License
MIT
