import { ConfigError } from "../errors";

/** Kept in sync with packages/core/package.json; sent in the default User-Agent. */
export const SDK_VERSION = "0.1.0";

/**
 * Global configuration for OSM Navigator services.
 * All endpoints have public defaults and can be overridden by the user.
 *
 * The public Valhalla and Photon instances are run by volunteers under fair-use
 * policies. Production apps should use their own instances, or at least send an
 * identifying `userAgent`.
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

  /**
   * Timeout for each routing/geocoding request, in milliseconds.
   * @default 15000
   */
  requestTimeoutMs?: number;

  /**
   * User-Agent sent with every request. Identify your app here.
   * @default "osm-navigator/<version>"
   */
  userAgent?: string;

  /** Extra headers sent with every request (e.g. an API key for a hosted instance). */
  headers?: Record<string, string>;
}

export type ResolvedOSMNavigatorConfig = Readonly<
  Required<Omit<OSMNavigatorConfig, "headers">> & { headers: Readonly<Record<string, string>> }
>;

const DEFAULT_CONFIG: ResolvedOSMNavigatorConfig = Object.freeze({
  valhallaEndpoint: "https://valhalla1.openstreetmap.de",
  photonEndpoint: "https://photon.komoot.io",
  mapStyleURL: "https://tiles.openfreemap.org/styles/liberty",
  requestTimeoutMs: 15_000,
  userAgent: `osm-navigator/${SDK_VERSION}`,
  headers: Object.freeze({}),
});

let _config: ResolvedOSMNavigatorConfig = DEFAULT_CONFIG;

// RN's URL polyfill doesn't implement all getters, so validate with a pattern instead.
const HTTP_URL = /^https?:\/\/[^\s/?#]+[^\s]*$/i;

function normalizeEndpoint(name: string, value: string): string {
  if (!HTTP_URL.test(value)) {
    throw new ConfigError(`${name} must be an http(s) URL, got "${value}"`);
  }
  return value.replace(/\/+$/, "");
}

/**
 * Initialize OSM Navigator with optional user-supplied endpoints.
 * Call this once at app startup before using any SDK features.
 *
 * @throws {ConfigError} if a value is invalid.
 *
 * @example
 * initOSMNavigator({
 *   valhallaEndpoint: "https://my-valhalla.example.com",
 *   userAgent: "MyApp/1.2 (contact@example.com)",
 * });
 */
export function initOSMNavigator(config: OSMNavigatorConfig = {}): void {
  // `??` rather than spread, so an explicit `undefined` falls back to the default.
  const requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_CONFIG.requestTimeoutMs;
  const mapStyleURL = config.mapStyleURL ?? DEFAULT_CONFIG.mapStyleURL;

  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new ConfigError(`requestTimeoutMs must be a positive number, got ${requestTimeoutMs}`);
  }
  if (mapStyleURL.trim() === "") {
    throw new ConfigError("mapStyleURL must not be empty");
  }

  _config = Object.freeze({
    valhallaEndpoint: normalizeEndpoint(
      "valhallaEndpoint",
      config.valhallaEndpoint ?? DEFAULT_CONFIG.valhallaEndpoint,
    ),
    photonEndpoint: normalizeEndpoint(
      "photonEndpoint",
      config.photonEndpoint ?? DEFAULT_CONFIG.photonEndpoint,
    ),
    mapStyleURL,
    requestTimeoutMs,
    userAgent: config.userAgent ?? DEFAULT_CONFIG.userAgent,
    headers: Object.freeze({ ...config.headers }),
  });
}

/** The active configuration. Frozen; call `initOSMNavigator` to change it. */
export function getConfig(): ResolvedOSMNavigatorConfig {
  return _config;
}
