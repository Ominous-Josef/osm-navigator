import { InvalidResponseError } from "../errors";
import type { LngLat } from "../types";

/**
 * Decode an encoded polyline (Valhalla uses precision 6) into [lng, lat] pairs.
 *
 * @throws {InvalidResponseError} if the string is truncated or contains invalid characters.
 */
export function decodePolyline(encoded: string, precision = 6): LngLat[] {
  const factor = 10 ** precision;
  const points: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const readValue = (): number => {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      if (index >= encoded.length) {
        throw new InvalidResponseError("Encoded polyline is truncated");
      }
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 0x3f) {
        throw new InvalidResponseError("Encoded polyline contains an invalid character");
      }
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += readValue();
    lng += readValue();
    points.push([lng / factor, lat / factor]);
  }

  return points;
}
