import type { LngLat } from "../types";

/** Mean Earth radius in meters (IUGG). */
export const EARTH_RADIUS_METERS = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance between two points, in meters. */
export function haversineDistance(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Initial bearing from `from` to `to`, in degrees clockwise from north, in [0, 360). */
export function bearing(from: LngLat, to: LngLat): number {
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLng = toRad(to[0] - from[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export interface SegmentProjection {
  /** Closest point on the segment. */
  point: LngLat;
  /** Position of `point` along the segment: 0 at `a`, 1 at `b`. */
  t: number;
  /** Distance from the input point to `point`, in meters. */
  distance: number;
}

/**
 * Project `p` onto the segment a→b.
 *
 * Uses a local equirectangular approximation centred on `p`, which is accurate to well
 * under a meter for route segments (tens to hundreds of meters long).
 */
export function projectOntoSegment(p: LngLat, a: LngLat, b: LngLat): SegmentProjection {
  const kx = Math.cos(toRad(p[1]));
  const ax = (a[0] - p[0]) * kx;
  const ay = a[1] - p[1];
  const bx = (b[0] - p[0]) * kx;
  const by = b[1] - p[1];
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;

  // Parameter of the closest point to the origin (p) on the infinite line, clamped to the segment.
  const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSq));
  const point: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { point, t, distance: haversineDistance(p, point) };
}

/** Running distance along a line: `result[i]` is the distance from `line[0]` to `line[i]`, in meters. */
export function cumulativeDistances(line: readonly LngLat[]): number[] {
  const result: number[] = [];
  let total = 0;
  for (let i = 0; i < line.length; i++) {
    if (i > 0) total += haversineDistance(line[i - 1], line[i]);
    result.push(total);
  }
  return result;
}
