/** WGS84 coordinate pair [longitude, latitude] — GeoJSON convention. */
export type LngLat = [number, number];

/** Map camera position. */
export interface CameraState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

/** Normalised maneuver kinds, mapped from routing-engine specific codes. */
export type ManeuverType =
  | "depart"
  | "straight"
  | "slight-left"
  | "slight-right"
  | "left"
  | "right"
  | "sharp-left"
  | "sharp-right"
  | "keep-left"
  | "keep-right"
  | "u-turn"
  | "merge"
  | "roundabout"
  | "ferry"
  | "arrive";
