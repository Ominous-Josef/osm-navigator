// initOSMNavigator.ts
// Initialization/config for OSM Navigator SDK

import { PhotonClient, PhotonClientOptions } from "./clients/PhotonClient";
import { ValhallaClient, ValhallaClientOptions } from "./clients/ValhallaClient";

export interface OSMNavigatorConfig {
  valhalla?: ValhallaClientOptions;
  photon?: PhotonClientOptions;
}

export interface OSMNavigator {
  valhalla: ValhallaClient;
  photon: PhotonClient;
}

export function initOSMNavigator(config: OSMNavigatorConfig = {}): OSMNavigator {
  return {
    valhalla: new ValhallaClient(config.valhalla),
    photon: new PhotonClient(config.photon),
  };
}
