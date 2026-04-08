// valhalla.ts
// TypeScript types for Valhalla REST API

export interface ValhallaRouteRequest {
  locations: Array<{ lat: number; lon: number }>;
  costing: string;
  directions_options?: object;
  [key: string]: unknown;
}

export interface ValhallaRouteResponse {
  trip: object;
  [key: string]: unknown;
}
