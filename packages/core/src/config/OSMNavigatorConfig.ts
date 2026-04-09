// OSMNavigatorConfig.ts
// Configuration types for OSM Navigator SDK

import { PhotonClientOptions } from "../clients/PhotonClient";
import { ValhallaClientOptions } from "../clients/ValhallaClient";

export interface OSMNavigatorConfig {
	valhalla?: ValhallaClientOptions;
	photon?: PhotonClientOptions;
}