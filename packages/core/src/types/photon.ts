// photon.ts
// TypeScript types for Photon REST API

export interface PhotonSearchRequest {
  q: string;
  lat?: number;
  lon?: number;
  limit?: number;
  lang?: string;
  [key: string]: unknown;
}

export interface PhotonSearchResponse {
  features: Array<object>;
  [key: string]: unknown;
}
