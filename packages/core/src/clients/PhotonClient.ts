// PhotonClient.ts
// Geocoding client for Photon REST API

import { PhotonSearchRequest, PhotonSearchResponse } from "../types/photon";

export interface PhotonClientOptions {
  endpoint?: string; // Optional custom endpoint
}

export class PhotonClient {
  private endpoint: string;

  constructor(options: PhotonClientOptions = {}) {
    this.endpoint = options.endpoint || "https://photon.komoot.io/api";
  }

  async search(request: PhotonSearchRequest): Promise<PhotonSearchResponse> {
    try {
      const params = new URLSearchParams(request as any).toString();
      const res = await fetch(`${this.endpoint}/?${params}`);
      if (!res.ok) throw new Error(`Photon error: ${res.status}`);
      return await res.json();
    } catch (err) {
      throw new Error(`PhotonClient.search failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
