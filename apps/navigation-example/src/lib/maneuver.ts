import type { ManeuverType, NavigationState } from '@osm-navigator/core';

export interface UpcomingManeuver {
  instruction: string;
  type: ManeuverType;
  /** Along-route distance to it, in meters. */
  distanceMeters: number;
  /** The maneuver after it, if any. */
  thenInstruction?: string;
}

/**
 * The maneuver the user should prepare for: the start of the *next* step.
 * (The current step's own maneuver is already behind them.)
 */
export function upcomingManeuver(state: NavigationState): UpcomingManeuver | undefined {
  const { steps } = state.route;
  const next = steps[state.currentStepIndex + 1];
  if (!next) {
    const current = steps[state.currentStepIndex];
    return current
      ? { instruction: current.instruction, type: current.maneuverType, distanceMeters: state.distanceToNextStepMeters }
      : undefined;
  }
  return {
    instruction: next.instruction,
    type: next.maneuverType,
    distanceMeters: state.distanceToNextStepMeters,
    thenInstruction: steps[state.currentStepIndex + 2]?.instruction,
  };
}
