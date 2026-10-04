import { isFiniteNumber, isOptionalString, isRecord } from "../guards";
import type { PhotonFeature, PhotonResponse } from "./types";

const STRING_PROPERTIES = [
  "name",
  "street",
  "housenumber",
  "city",
  "state",
  "country",
  "postcode",
  "type",
  "osm_type",
] as const;

function isFeature(value: unknown): value is PhotonFeature {
  if (!isRecord(value) || !isRecord(value.geometry) || !isRecord(value.properties)) return false;
  const { geometry, properties } = value;
  const coords = geometry.coordinates;
  return (
    geometry.type === "Point" &&
    Array.isArray(coords) &&
    coords.length === 2 &&
    isFiniteNumber(coords[0]) &&
    isFiniteNumber(coords[1]) &&
    STRING_PROPERTIES.every((key) => isOptionalString(properties[key]))
  );
}

/** Runtime check for the parts of a Photon `/api` or `/reverse` response that we read. */
export function isPhotonResponse(value: unknown): value is PhotonResponse {
  return isRecord(value) && Array.isArray(value.features) && value.features.every(isFeature);
}
