import type { LngLat, ManeuverType } from "../types";

/** Supported Valhalla costing models. */
export type CostingModel =
  | "auto"
  | "bicycle"
  | "pedestrian"
  | "motorcycle"
  | "truck"
  | "transit";

export interface RouteRequest {
  /** Origin coordinate. */
  origin: LngLat;
  /** Destination coordinate. */
  destination: LngLat;
  /** Routing profile. @default "auto" */
  costing?: CostingModel;
  /** Optional waypoints between origin and destination (passed through, not stopped at). */
  waypoints?: LngLat[];
  /** Cancels the request; `fetchRoute` then rejects with `AbortError`. */
  signal?: AbortSignal;
}

export interface RouteStep {
  instruction: string;
  /** Distance for this step in meters. */
  distance: number;
  /** Duration for this step in seconds. */
  duration: number;
  /** Maneuver kind (mapped from Valhalla integer codes). */
  maneuverType: ManeuverType;
  /** Start coordinate of this step. */
  startLocation: LngLat;
  /** Index into `Route.geometry` where this step starts. */
  geometryIndex: number;
}

export interface Route {
  /** GeoJSON LineString coordinates for the full route, across all legs. */
  geometry: LngLat[];
  /** Total distance in meters. */
  distanceMeters: number;
  /** Total duration in seconds. */
  durationSeconds: number;
  /** Step-by-step maneuver instructions, across all legs. */
  steps: RouteStep[];
  /** Raw Valhalla response, preserved for advanced use. */
  raw: ValhallaRouteResponse;
}

// ---------- Raw Valhalla API shapes (only the fields we read) ----------
// Requested with `units: "kilometers"`.

export interface ValhallaSummary {
  length: number;       // kilometers
  time: number;         // seconds
}

export interface ValhallaManeuver {
  type: number;
  instruction: string;
  length: number;       // kilometers
  time: number;         // seconds
  /** Index into this leg's decoded shape. */
  begin_shape_index: number;
  end_shape_index: number;
}

export interface ValhallaLeg {
  maneuvers: ValhallaManeuver[];
  shape: string;        // encoded polyline6
  summary: ValhallaSummary;
}

export interface ValhallaTrip {
  legs: ValhallaLeg[];
  summary: ValhallaSummary;
  units: string;
}

export interface ValhallaRouteResponse {
  trip: ValhallaTrip;
}
