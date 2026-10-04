// Build test geometry in a local metric frame (x east, y north, in meters) near Berlin.
import { EARTH_RADIUS_METERS } from "../geo";
import type { Route, RouteStep } from "../routing/types";
import type { LngLat, ManeuverType } from "../types";

const ORIGIN: LngLat = [13.4, 52.5];
const METERS_PER_DEGREE = (EARTH_RADIUS_METERS * Math.PI) / 180;

/** Local (x, y) meters → [lng, lat]. */
export function at(x: number, y: number): LngLat {
  return [
    ORIGIN[0] + x / (METERS_PER_DEGREE * Math.cos((ORIGIN[1] * Math.PI) / 180)),
    ORIGIN[1] + y / METERS_PER_DEGREE,
  ];
}

export interface StepSpec {
  at: number; // geometry index
  type: ManeuverType;
  duration?: number;
}

export function makeRoute(points: Array<[number, number]>, steps: StepSpec[]): Route {
  const geometry = points.map(([x, y]) => at(x, y));
  return {
    geometry,
    distanceMeters: 0,
    durationSeconds: steps.reduce((sum, s) => sum + (s.duration ?? 0), 0),
    steps: steps.map(
      (s): RouteStep => ({
        instruction: s.type,
        distance: 0,
        duration: s.duration ?? 0,
        maneuverType: s.type,
        startLocation: geometry[s.at]!,
        geometryIndex: s.at,
      }),
    ),
    raw: { trip: { units: "kilometers", summary: { length: 0, time: 0 }, legs: [] } },
  };
}
