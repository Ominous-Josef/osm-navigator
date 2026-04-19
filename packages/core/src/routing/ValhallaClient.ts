import { getConfig } from "../config";
import type {
  RouteRequest,
  Route,
  RouteStep,
  LngLat,
  ValhallaRouteResponse,
  ValhallaManeuver,
} from "./types";

/** Decode a Valhalla polyline6-encoded string into [lng, lat] pairs. */
function decodePolyline6(encoded: string): LngLat[] {
  const points: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push([lng / 1e6, lat / 1e6]);
  }

  return points;
}

function metersFromMiles(miles: number): number {
  return miles * 1609.344;
}

/**
 * Map Valhalla integer maneuver types to human-readable string labels
 * that match the ManeuverType union in @osm-navigator/ui-navigation.
 *
 * Reference: https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/#maneuver-types
 */
function mapValhallaManeuverType(type: number): string {
  switch (type) {
    case 0: return 'straight';       // kNone
    case 1: return 'straight';       // kStart
    case 2: return 'straight';       // kStartRight
    case 3: return 'straight';       // kStartLeft
    case 4: return 'arrive';         // kDestination
    case 5: return 'arrive';         // kDestinationRight
    case 6: return 'arrive';         // kDestinationLeft
    case 7: return 'straight';       // kBecomes
    case 8: return 'straight';       // kContinue
    case 9: return 'slight-right';   // kSlightRight
    case 10: return 'right';         // kRight
    case 11: return 'right';         // kSharpRight
    case 12: return 'u-turn';        // kUturnRight
    case 13: return 'u-turn';        // kUturnLeft
    case 14: return 'left';          // kSharpLeft
    case 15: return 'left';          // kLeft
    case 16: return 'slight-left';   // kSlightLeft
    case 17: return 'straight';      // kRampStraight
    case 18: return 'slight-right';  // kRampRight
    case 19: return 'slight-left';   // kRampLeft
    case 20: return 'straight';      // kExitRight
    case 21: return 'straight';      // kExitLeft
    case 22: return 'straight';      // kStayStraight
    case 23: return 'slight-right';  // kStayRight
    case 24: return 'slight-left';   // kStayLeft
    case 25: return 'straight';      // kMerge
    case 26: return 'straight';      // kRoundaboutEnter
    case 27: return 'straight';      // kRoundaboutExit
    default: return 'straight';
  }
}

function mapManeuver(
  maneuver: ValhallaManeuver,
  shape: LngLat[]
): RouteStep {
  return {
    instruction: maneuver.instruction,
    distance: metersFromMiles(maneuver.length),
    duration: maneuver.time,
    maneuverType: mapValhallaManeuverType(maneuver.type),
    startLocation: shape[maneuver.begin_shape_index] ?? [0, 0],
  };
}

/**
 * Fetch a route from the Valhalla routing engine.
 *
 * @throws {Error} if the network request fails or Valhalla returns an error.
 */
export async function fetchRoute(request: RouteRequest): Promise<Route> {
  const { valhallaEndpoint } = getConfig();
  const { origin, destination, costing = "auto", waypoints = [] } = request;

  const locations = [
    { lon: origin[0], lat: origin[1], type: "break" },
    ...waypoints.map((wp) => ({ lon: wp[0], lat: wp[1], type: "through" })),
    { lon: destination[0], lat: destination[1], type: "break" },
  ];

  const body = {
    locations,
    costing,
    directions_options: { units: "miles" },
  };

  const url = `${valhallaEndpoint}/route`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Valhalla error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as ValhallaRouteResponse;
  const leg = data.trip.legs[0];

  if (!leg) {
    throw new Error("Valhalla returned no route legs.");
  }

  const geometry = decodePolyline6(leg.shape);
  const steps = leg.maneuvers.map((m) => mapManeuver(m, geometry));

  return {
    geometry,
    distanceMeters: metersFromMiles(data.trip.length),
    durationSeconds: data.trip.time,
    steps,
    raw: data,
  };
}