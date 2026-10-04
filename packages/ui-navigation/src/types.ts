// types.ts
// Types for UI navigation components

import type { ManeuverType, NavigationState } from "@osm-navigator/core";
import type { ReactNode } from "react";

export type { ManeuverType, NavigationState };

export interface Maneuver {
	instruction: string;
	distance: number;
	icon?: ReactNode;
}
