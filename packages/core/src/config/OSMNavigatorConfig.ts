/**
 * Global configuration for OSM Navigator services.
 * All endpoints have public defaults and can be overridden by the user.
 */
export interface OSMNavigatorConfig {
  /**
   * Valhalla routing engine endpoint.
   * @default "https://valhalla1.openstreetmap.de"
   */
  valhallaEndpoint?: string;

  /**
   * Photon geocoding endpoint.
   * @default "https://photon.komoot.io"
   */
  photonEndpoint?: string;

  /**
   * MapLibre style URL (Protomaps PMTiles or OpenFreeMap style JSON).
   * @default "https://tiles.openfreemap.org/styles/liberty"
   */
  mapStyleURL?: string;
}

const DEFAULT_CONFIG: Required<OSMNavigatorConfig> = {
  valhallaEndpoint: "https://valhalla1.openstreetmap.de",
  photonEndpoint: "https://photon.komoot.io",
  mapStyleURL: "https://tiles.openfreemap.org/styles/liberty",
};

let _config: Required<OSMNavigatorConfig> = { ...DEFAULT_CONFIG };

/**
 * Initialize OSM Navigator with optional user-supplied endpoints.
 * Call this once at app startup before using any SDK features.
 *
 * @example
 * initOSMNavigator({
 *   valhallaEndpoint: "https://my-valhalla.example.com",
 * });
 */
export function initOSMNavigator(config: OSMNavigatorConfig = {}): void {
  _config = { ...DEFAULT_CONFIG, ...config };
}

export function getConfig(): Required<OSMNavigatorConfig> {
  return _config;
}