export interface GeocodeRequest {
  /** Free-form search query. */
  query: string;
  /** Maximum number of results to return. @default 5 */
  limit?: number;
  /** Optional bias point to prefer nearby results [lng, lat]. */
  locationBias?: [number, number];
}

export interface GeocodeResult {
  /** Display name of the place. */
  name: string;
  /** Full formatted address. */
  address: string;
  /** Coordinate [lng, lat]. */
  coordinates: [number, number];
  /** Photon place type (e.g. "city", "street", "house"). */
  type: string;
  /** Confidence score (0–1) if available. */
  score?: number;
  /** Raw Photon feature, preserved for advanced use. */
  raw: PhotonFeature;
}

export interface ReverseGeocodeRequest {
  coordinates: [number, number];
  /** Maximum number of results. @default 1 */
  limit?: number;
}

// ---------- Raw Photon API shapes ----------
export interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  type?: string;
  osm_type?: string;
  osm_id?: number;
}

export interface PhotonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: PhotonProperties;
}

export interface PhotonResponse {
  type: "FeatureCollection";
  features: PhotonFeature[];
}
