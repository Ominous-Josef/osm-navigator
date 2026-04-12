/** WGS84 coordinate pair [longitude, latitude] — GeoJSON convention. */
export type LngLat = [number, number];

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
  /** Optional waypoints between origin and destination. */
  waypoints?: LngLat[];
}

export interface RouteStep {
  instruction: string;
  /** Distance for this step in meters. */
  distance: number;
  /** Duration for this step in seconds. */
  duration: number;
  /** Maneuver type from Valhalla. */
  maneuverType: number;
  /** Start coordinate of this step. */
  startLocation: LngLat;
}

export interface Route {
  /** GeoJSON LineString coordinates for the full route. */
  geometry: LngLat[];
  /** Total distance in meters. */
  distanceMeters: number;
  /** Total duration in seconds. */
  durationSeconds: number;
  /** Step-by-step maneuver instructions. */
  steps: RouteStep[];
  /** Raw Valhalla response, preserved for advanced use. */
  raw: ValhallaRouteResponse;
}

// ---------- Raw Valhalla API shapes ----------
export interface ValhallaLocation {
  lon: number;
  lat: number;
}

export interface ValhallaManeuver {
  type: number;
  instruction: string;
  length: number;       // miles
  time: number;         // seconds
  begin_shape_index: number;
  end_shape_index: number;
}

export interface ValhallaLeg {
  maneuvers: ValhallaManeuver[];
  shape: string;        // encoded polyline6
  length: number;       // miles
  duration: number;     // seconds
}

export interface ValhallaTrip {
  legs: ValhallaLeg[];
  length: number;
  time: number;
  units: string;
}

export interface ValhallaRouteResponse {
  trip: ValhallaTrip;
}
