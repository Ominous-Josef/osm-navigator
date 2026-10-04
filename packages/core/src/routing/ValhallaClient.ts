import { getConfig } from "../config";
import { InvalidResponseError } from "../errors";
import { requestJson } from "../http";
import type { LngLat } from "../types";
import { isValhallaRouteResponse } from "./guards";
import { mapValhallaManeuverType } from "./maneuvers";
import { decodePolyline } from "./polyline";
import type { Route, RouteRequest, RouteStep, ValhallaRouteResponse } from "./types";

const METERS_PER_KILOMETER = 1000;

function samePoint(a: LngLat, b: LngLat): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Flatten all legs into one geometry and one step list.
 *
 * Each leg's shape starts at the previous leg's last point, and its maneuvers'
 * shape indices are relative to that leg, so later legs are offset accordingly.
 */
export function buildRoute(data: ValhallaRouteResponse): Route {
  const geometry: LngLat[] = [];
  const steps: RouteStep[] = [];

  for (const leg of data.trip.legs) {
    const shape = decodePolyline(leg.shape, 6);
    const last = geometry[geometry.length - 1];
    const skipFirst = last !== undefined && shape[0] !== undefined && samePoint(last, shape[0]);
    const offset = geometry.length - (skipFirst ? 1 : 0);
    // A loop rather than push(...shape): long routes can exceed the engine's argument limit.
    for (let i = skipFirst ? 1 : 0; i < shape.length; i++) geometry.push(shape[i]);

    for (const maneuver of leg.maneuvers) {
      const geometryIndex = offset + maneuver.begin_shape_index;
      const startLocation = geometry[geometryIndex];
      if (startLocation === undefined) {
        throw new InvalidResponseError(
          `Maneuver begin_shape_index ${maneuver.begin_shape_index} is outside the leg shape`,
        );
      }
      steps.push({
        instruction: maneuver.instruction,
        distance: maneuver.length * METERS_PER_KILOMETER,
        duration: maneuver.time,
        maneuverType: mapValhallaManeuverType(maneuver.type),
        startLocation,
        geometryIndex,
      });
    }
  }

  return {
    geometry,
    distanceMeters: data.trip.summary.length * METERS_PER_KILOMETER,
    durationSeconds: data.trip.summary.time,
    steps,
    raw: data,
  };
}

/**
 * Fetch a route from the Valhalla routing engine.
 *
 * @throws {OSMNavigatorError} subclasses from `requestJson` (`TimeoutError`, `AbortError`,
 *   `NetworkError`, `ServiceError`, `InvalidResponseError`).
 */
export async function fetchRoute(request: RouteRequest): Promise<Route> {
  const { valhallaEndpoint } = getConfig();
  const { origin, destination, costing = "auto", waypoints = [], signal } = request;

  const body = {
    locations: [
      { lon: origin[0], lat: origin[1], type: "break" },
      ...waypoints.map((wp) => ({ lon: wp[0], lat: wp[1], type: "through" })),
      { lon: destination[0], lat: destination[1], type: "break" },
    ],
    costing,
    directions_options: { units: "kilometers" },
  };

  const data = await requestJson(
    `${valhallaEndpoint}/route`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    isValhallaRouteResponse,
    { signal },
  );

  return buildRoute(data);
}
