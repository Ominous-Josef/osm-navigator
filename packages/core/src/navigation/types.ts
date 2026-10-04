import type { Route, RouteStep } from "../routing/types";
import type { LngLat } from "../types";

/** Snapshot of navigation progress along a route, produced by `NavigationEngine`. */
export interface NavigationState {
  route: Route;
  /** Index into `route.steps` of the step being travelled (its maneuver is behind the user). */
  currentStepIndex: number;
  /** Along-route distance to the start of the next step (the upcoming maneuver), or to the destination on the last step. */
  distanceToNextStepMeters: number;
  /** Along-route distance to the destination. */
  distanceRemainingMeters: number;
  /** Estimated time to the destination, prorated from the steps' durations. */
  timeRemainingSeconds: number;
  /** Fraction of the route completed, from 0 to 1. */
  progress: number;
  /** The user's position snapped onto the route. */
  snappedPosition: LngLat;
  /** Distance from the latest raw position to the route. */
  distanceFromRouteMeters: number;
  /** Bearing of the route at the snapped position, in degrees clockwise from north. */
  routeBearing: number;
  /** True once the user has been away from the route long enough to count as off-route. */
  isOffRoute: boolean;
  /** Latched: once true, the engine stops updating. */
  isArrived: boolean;
}

export interface NavigationEngineOptions {
  /** Distance from the route beyond which a fix counts towards going off-route. @default 30 */
  offRouteThresholdMeters?: number;
  /**
   * Distance within which an off-route user counts as back on route. Lower than
   * `offRouteThresholdMeters` so the state doesn't flap at the boundary. @default 15
   */
  onRouteThresholdMeters?: number;
  /** Consecutive far-off fixes needed before declaring off-route (filters GPS spikes). @default 3 */
  offRouteConfirmations?: number;
  /** Remaining distance at which the user has arrived. @default 20 */
  arrivalThresholdMeters?: number;
  /**
   * How far ahead along the route a fix may snap. Keeps progress from jumping to a later
   * part of a route that loops back near itself. @default 500
   */
  lookAheadMeters?: number;

  /** Called when the user moves onto a new step (not for the initial step). */
  onStepChange?: (step: RouteStep, index: number, state: NavigationState) => void;
  /** Called exactly once, when the user arrives. */
  onArrive?: (state: NavigationState) => void;
  /** Called when the user goes off-route and when they rejoin it. Rerouting is up to the app. */
  onOffRouteChange?: (isOffRoute: boolean, state: NavigationState) => void;
}
