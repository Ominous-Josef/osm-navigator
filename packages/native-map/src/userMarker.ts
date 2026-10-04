import { ARROW_FILL, CONE_FILL } from "./markerImages";
import type { LngLat } from "./types";

type ZoomInterpolation = ["interpolate", ["exponential", number], ["zoom"], number, number, number, number];

export const USER_MARKER_IMAGES = {
  "osm-navigator-arrow-fill": ARROW_FILL,
  "osm-navigator-cone-fill": CONE_FILL,
};

/** Metres per pixel at zoom 0 on the equator (512 px tiles). */
const METERS_PER_PIXEL_Z0 = 78271.517;

/**
 * `circle-radius` expression that keeps a circle `meters` wide on the ground at every
 * zoom level (the radius doubles with each zoom step).
 */
export function metersToPixelsExpression(meters: number, latitude: number): ZoomInterpolation {
  const atZ0 = meters / (METERS_PER_PIXEL_Z0 * Math.cos((latitude * Math.PI) / 180));
  return ["interpolate", ["exponential", 2], ["zoom"], 0, atZ0, 22, atZ0 * 2 ** 22];
}

export interface UserMarkerProperties {
  heading?: number;
  accuracy?: number;
}

export function userMarkerFeature(
  position: LngLat,
  heading: number | undefined,
  accuracy: number | undefined,
): GeoJSON.Feature<GeoJSON.Point, UserMarkerProperties> {
  const properties: UserMarkerProperties = {};
  if (heading !== undefined && Number.isFinite(heading)) properties.heading = heading;
  if (accuracy !== undefined && Number.isFinite(accuracy) && accuracy > 0) properties.accuracy = accuracy;
  return { type: "Feature", properties, geometry: { type: "Point", coordinates: position } };
}

/** Drops consecutive duplicate points; MapLibre can't draw a zero-length line segment. */
export function dedupeLine(line: readonly LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  for (const p of line) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
}
