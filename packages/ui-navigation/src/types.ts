// types.ts
// Types for UI navigation components

export interface Maneuver {
	instruction: string;
	distance: number;
	icon?: React.ReactNode;
}

export type ManeuverType = "turn-left" | "turn-right" | "straight" | "u-turn" | string;

import type { Route } from "@osm-navigator/core";

export interface NavigationState {
	route: Route;
	currentStepIndex: number;
	distanceToNextStepMeters: number;
	timeRemainingSeconds: number;
	isArrived: boolean;
}

