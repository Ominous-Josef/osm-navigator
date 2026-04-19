// types.ts
// Types for UI navigation components

import type { ManeuverType } from './components/ManeuverIcons';
import type { Route } from "@osm-navigator/core";

export type { ManeuverType };

export interface Maneuver {
	instruction: string;
	distance: number;
	icon?: React.ReactNode;
}

export interface NavigationState {
	route: Route;
	currentStepIndex: number;
	distanceToNextStepMeters: number;
	timeRemainingSeconds: number;
	isArrived: boolean;
}

