import { bearing, cumulativeDistances, type LngLat } from '@osm-navigator/core';

export interface SimulatedPoint {
  position: LngLat;
  /** Direction of the segment being travelled, in degrees. */
  heading: number;
  /** True once `distance` reaches the end of the line. */
  done: boolean;
}

/** Precompute a line for repeated `pointAlong` calls. */
export function prepareLine(line: readonly LngLat[]) {
  return { line, cumulative: cumulativeDistances(line) };
}

/** The point `distance` meters along the line, linearly interpolated within a segment. */
export function pointAlong(
  { line, cumulative }: ReturnType<typeof prepareLine>,
  distance: number,
): SimulatedPoint {
  const total = cumulative[cumulative.length - 1] ?? 0;
  if (line.length < 2 || distance >= total) {
    const last = line[line.length - 1];
    const prev = line[line.length - 2] ?? last;
    return { position: last, heading: line.length < 2 ? 0 : bearing(prev, last), done: true };
  }
  const d = Math.max(0, distance);
  let i = 0;
  while (i < cumulative.length - 2 && cumulative[i + 1] <= d) i++;
  const a = line[i];
  const b = line[i + 1];
  const segment = cumulative[i + 1] - cumulative[i];
  const t = segment > 0 ? (d - cumulative[i]) / segment : 0;
  return {
    position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    heading: bearing(a, b),
    done: false,
  };
}
