// types.ts
// Types for UI navigation components

export interface Maneuver {
	instruction: string;
	distance: number;
	icon?: React.ReactNode;
}

export type ManeuverType = "turn-left" | "turn-right" | "straight" | "u-turn" | string;