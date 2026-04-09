// ValhallaClient.ts
// Turn-by-turn routing client for Valhalla REST API

import { ValhallaRouteRequest, ValhallaRouteResponse } from "../types/valhalla";

export interface ValhallaClientOptions {
	endpoint?: string; // Optional custom endpoint
}

export class ValhallaClient {
	private endpoint: string;

	constructor(options: ValhallaClientOptions = {}) {
		this.endpoint = options.endpoint || "https://valhalla1.openstreetmap.de";
	}

	async route(request: ValhallaRouteRequest): Promise<ValhallaRouteResponse> {
		try {
			const res = await fetch(`${this.endpoint}/route`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(request),
			});
			if (!res.ok) throw new Error(`Valhalla error: ${res.status}`);
			return await res.json();
		} catch (err) {
			throw new Error(`ValhallaClient.route failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}