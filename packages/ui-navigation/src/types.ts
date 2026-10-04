// types.ts
// Types for UI navigation components

import type { ManeuverType, Route } from "@osm-navigator/core";
import type { ReactNode } from "react";

export type { ManeuverType };

export interface Maneuver {
	instruction: string;
	distance: number;
	icon?: ReactNode;
}

export interface NavigationState {
	route: Route;
	currentStepIndex: number;
	distanceToNextStepMeters: number;
	timeRemainingSeconds: number;
	isArrived: boolean;
}

