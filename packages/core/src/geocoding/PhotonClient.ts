import { getConfig } from "../config";
import type {
  GeocodeRequest,
  GeocodeResult,
  ReverseGeocodeRequest,
  PhotonFeature,
  PhotonResponse,
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

/**
 * Forward geocode: text query → coordinates.
 */
export async function geocode(request: GeocodeRequest): Promise<GeocodeResult[]> {
  const { photonEndpoint } = getConfig();
  const { query, limit = 5, locationBias } = request;

  const params = new URLSearchParams({ q: query, limit: String(limit) });

  if (locationBias) {
    params.set("lon", String(locationBias[0]));
    params.set("lat", String(locationBias[1]));
  }

  const url = `${photonEndpoint}/api?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Photon geocode error ${response.status}`);
  }

  const data = (await response.json()) as PhotonResponse;
  return data.features.map(featureToResult);
}

/**
 * Reverse geocode: coordinates → place name/address.
 */
export async function reverseGeocode(
  request: ReverseGeocodeRequest
): Promise<GeocodeResult[]> {
  const { photonEndpoint } = getConfig();
  const { coordinates, limit = 1 } = request;

  const params = new URLSearchParams({
    lon: String(coordinates[0]),
    lat: String(coordinates[1]),
    limit: String(limit),
  });

  const url = `${photonEndpoint}/reverse?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Photon reverse geocode error ${response.status}`);
  }

  const data = (await response.json()) as PhotonResponse;
  return data.features.map(featureToResult);
}