import { getConfig } from "../config";
import { requestJson } from "../http";
import { isPhotonResponse } from "./guards";
import type {
  GeocodeRequest,
  GeocodeResult,
  ReverseGeocodeRequest,
  PhotonFeature,
} from "./types";

function formatAddress(props: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  }
  if (props.city) parts.push(props.city);
  if (props.state) parts.push(props.state);
  if (props.country) parts.push(props.country);
  return parts.join(", ");
}

function featureToResult(feature: PhotonFeature): GeocodeResult {
  const props = feature.properties;
  return {
    name: props.name ?? props.street ?? "Unknown",
    address: formatAddress(props),
    coordinates: feature.geometry.coordinates,
    type: props.type ?? props.osm_type ?? "place",
    raw: feature,
  };
}

async function search(path: string, params: URLSearchParams, signal?: AbortSignal) {
  const { photonEndpoint } = getConfig();
  const data = await requestJson(
    `${photonEndpoint}${path}?${params.toString()}`,
    {},
    isPhotonResponse,
    { signal },
  );
  return data.features.map(featureToResult);
}

/**
 * Forward geocode: text query → coordinates.
 *
 * @throws {OSMNavigatorError} subclasses from `requestJson`.
 */
export async function geocode(request: GeocodeRequest): Promise<GeocodeResult[]> {
  const { query, limit = 5, locationBias, signal } = request;
  const params = new URLSearchParams({ q: query, limit: String(limit) });

  if (locationBias) {
    params.set("lon", String(locationBias[0]));
    params.set("lat", String(locationBias[1]));
  }

  return search("/api", params, signal);
}

/**
 * Reverse geocode: coordinates → place name/address.
 *
 * @throws {OSMNavigatorError} subclasses from `requestJson`.
 */
export async function reverseGeocode(
  request: ReverseGeocodeRequest
): Promise<GeocodeResult[]> {
  const { coordinates, limit = 1, signal } = request;
  const params = new URLSearchParams({
    lon: String(coordinates[0]),
    lat: String(coordinates[1]),
    limit: String(limit),
  });

  return search("/reverse", params, signal);
}
