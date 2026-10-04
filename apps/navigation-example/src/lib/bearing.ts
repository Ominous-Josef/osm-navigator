/** Smallest signed difference from `from` to `to`, in degrees (−180, 180]. */
export function bearingDelta(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/**
 * Keep the camera steady: ignore bearing changes smaller than `thresholdDegrees`
 * (GPS and snapping noise), follow larger ones.
 */
export function smoothBearing(previous: number | undefined, next: number, thresholdDegrees = 8): number {
  if (previous === undefined) return next;
  return Math.abs(bearingDelta(previous, next)) < thresholdDegrees ? previous : next;
}
