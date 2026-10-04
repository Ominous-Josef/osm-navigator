import { ConfigError } from "../errors";
import { bearing, cumulativeDistances, haversineDistance, projectOntoSegment } from "../geo";
import type { Route } from "../routing/types";
import type { LngLat } from "../types";
import type { NavigationEngineOptions, NavigationState } from "./types";

type Thresholds = Required<
  Pick<
    NavigationEngineOptions,
    | "offRouteThresholdMeters"
    | "onRouteThresholdMeters"
    | "offRouteConfirmations"
    | "arrivalThresholdMeters"
    | "lookAheadMeters"
  >
>;

const DEFAULTS: Thresholds = {
  offRouteThresholdMeters: 30,
  onRouteThresholdMeters: 15,
  offRouteConfirmations: 3,
  arrivalThresholdMeters: 20,
  lookAheadMeters: 500,
};

/**
 * When two candidate segments are within this distance of each other, the earlier one
 * wins. On out-and-back routes the outbound and return lines coincide, and the user is
 * on the outbound one until they turn around.
 */
const TIE_TOLERANCE_METERS = 3;

interface Match {
  segmentIndex: number;
  /** Along-route distance of `point`. */
  along: number;
  point: LngLat;
  distance: number;
}

function resolveThresholds(options: NavigationEngineOptions): Thresholds {
  const t: Thresholds = {
    offRouteThresholdMeters: options.offRouteThresholdMeters ?? DEFAULTS.offRouteThresholdMeters,
    onRouteThresholdMeters: options.onRouteThresholdMeters ?? DEFAULTS.onRouteThresholdMeters,
    offRouteConfirmations: options.offRouteConfirmations ?? DEFAULTS.offRouteConfirmations,
    arrivalThresholdMeters: options.arrivalThresholdMeters ?? DEFAULTS.arrivalThresholdMeters,
    lookAheadMeters: options.lookAheadMeters ?? DEFAULTS.lookAheadMeters,
  };
  for (const [name, value] of Object.entries(t)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new ConfigError(`${name} must be a positive number, got ${value}`);
    }
  }
  if (!Number.isInteger(t.offRouteConfirmations)) {
    throw new ConfigError(`offRouteConfirmations must be an integer, got ${t.offRouteConfirmations}`);
  }
  if (t.onRouteThresholdMeters > t.offRouteThresholdMeters) {
    throw new ConfigError("onRouteThresholdMeters must not exceed offRouteThresholdMeters");
  }
  return t;
}

/**
 * Turns raw GPS fixes into progress along a route.
 *
 * Pure and framework-agnostic: feed it positions with `update()`, read the returned
 * `NavigationState`, and react to the optional callbacks.
 *
 * - Snaps to the nearest route *segment* within a forward-looking window, so progress
 *   only moves forward and routes that loop back near themselves don't cause jumps.
 * - Distances are measured along the route, not in a straight line.
 * - Off-route detection uses a distance threshold, a confirmation count and hysteresis.
 * - Arrival is latched: `onArrive` fires once and later updates are ignored.
 */
export class NavigationEngine {
  readonly route: Route;
  private readonly thresholds: Thresholds;
  private readonly callbacks: NavigationEngineOptions;
  /** Along-route distance of each geometry point. */
  private readonly cumulative: number[];
  private readonly totalMeters: number;
  /** Along-route distance at which each step starts. */
  private readonly stepStartMeters: number[];

  private segmentIndex = 0;
  private progressMeters = 0;
  private snapped: LngLat;
  private offRouteStreak = 0;
  private current: NavigationState;

  /** @throws {ConfigError} if the route has no geometry or an option is invalid. */
  constructor(route: Route, options: NavigationEngineOptions = {}) {
    if (route.geometry.length === 0) {
      throw new ConfigError("Route has no geometry");
    }
    this.route = route;
    this.thresholds = resolveThresholds(options);
    this.callbacks = options;
    this.cumulative = cumulativeDistances(route.geometry);
    this.totalMeters = this.cumulative[this.cumulative.length - 1];
    const lastIndex = route.geometry.length - 1;
    this.stepStartMeters = route.steps.map((s) => this.cumulative[Math.min(s.geometryIndex, lastIndex)]);
    this.snapped = route.geometry[0];
    this.current = this.buildState(0, false, false);
  }

  /** The latest state (the initial state before the first `update`). */
  get state(): NavigationState {
    return this.current;
  }

  /** Process a GPS fix and return the new state. */
  update(position: LngLat): NavigationState {
    const previous = this.current;
    if (previous.isArrived) return previous;

    const { offRouteThresholdMeters, onRouteThresholdMeters, offRouteConfirmations } = this.thresholds;
    const match = this.match(position);

    let isOffRoute = previous.isOffRoute;
    if (match.distance > offRouteThresholdMeters) {
      this.offRouteStreak++;
      if (this.offRouteStreak >= offRouteConfirmations) isOffRoute = true;
    } else {
      this.offRouteStreak = 0;
      if (match.distance <= onRouteThresholdMeters) isOffRoute = false;
    }

    // Only advance on fixes that plausibly lie on the route, and never backwards.
    if (match.distance <= offRouteThresholdMeters && match.along > this.progressMeters) {
      this.progressMeters = match.along;
      this.segmentIndex = match.segmentIndex;
      this.snapped = match.point;
    }

    const isArrived = !isOffRoute && this.hasArrived(position, match.distance);
    if (isArrived) {
      this.progressMeters = this.totalMeters;
      this.segmentIndex = Math.max(0, this.route.geometry.length - 2);
      this.snapped = this.route.geometry[this.route.geometry.length - 1];
    }

    const state = this.buildState(match.distance, isOffRoute, isArrived);
    this.current = state;

    if (state.isOffRoute !== previous.isOffRoute) {
      this.callbacks.onOffRouteChange?.(state.isOffRoute, state);
    }
    if (state.currentStepIndex !== previous.currentStepIndex) {
      // The index only changes when the route has steps.
      this.callbacks.onStepChange?.(this.route.steps[state.currentStepIndex], state.currentStepIndex, state);
    }
    if (state.isArrived) {
      this.callbacks.onArrive?.(state);
    }
    return state;
  }

  /** Best snap for `position`, searching forward from the current progress. */
  private match(position: LngLat): Match {
    const g = this.route.geometry;
    const limit = this.progressMeters + this.thresholds.lookAheadMeters;
    let best: Match | undefined;

    for (let i = this.segmentIndex; i < g.length - 1; i++) {
      if (i > this.segmentIndex && this.cumulative[i] > limit) break;
      // On the current segment, only the part ahead of the snapped point is eligible.
      const isCurrent = i === this.segmentIndex;
      const start = isCurrent ? this.snapped : g[i];
      const startAlong = isCurrent ? this.progressMeters : this.cumulative[i];
      const projection = projectOntoSegment(position, start, g[i + 1]);
      if (!best || projection.distance < best.distance - TIE_TOLERANCE_METERS) {
        best = {
          segmentIndex: i,
          along: startAlong + projection.t * (this.cumulative[i + 1] - startAlong),
          point: projection.point,
          distance: projection.distance,
        };
      }
    }

    // Single-point route: nothing to project onto.
    return (
      best ?? {
        segmentIndex: 0,
        along: 0,
        point: g[0],
        distance: haversineDistance(position, g[0]),
      }
    );
  }

  private hasArrived(position: LngLat, distanceFromRoute: number): boolean {
    const { arrivalThresholdMeters, lookAheadMeters, offRouteThresholdMeters } = this.thresholds;
    const remaining = this.totalMeters - this.progressMeters;
    // The fix itself must be near the route too: on very short routes `remaining` starts
    // below the threshold, and a far-off fix shouldn't count as arriving.
    if (remaining <= arrivalThresholdMeters && distanceFromRoute <= offRouteThresholdMeters) return true;
    // Destinations slightly off the road may never snap close enough; accept being near
    // the destination itself, but only once it is within reach along the route (so a
    // route passing near its destination early doesn't end prematurely).
    const destination = this.route.geometry[this.route.geometry.length - 1];
    return remaining <= lookAheadMeters && haversineDistance(position, destination) <= arrivalThresholdMeters;
  }

  private buildState(distanceFromRoute: number, isOffRoute: boolean, isArrived: boolean): NavigationState {
    const { route, progressMeters, totalMeters, stepStartMeters } = this;
    const g = route.geometry;

    let stepIndex = 0;
    while (stepIndex + 1 < stepStartMeters.length && stepStartMeters[stepIndex + 1] <= progressMeters) {
      stepIndex++;
    }
    const nextStepStart = stepStartMeters[stepIndex + 1];
    const distanceRemainingMeters = Math.max(0, totalMeters - progressMeters);

    const segmentEnd = g[Math.min(this.segmentIndex + 1, g.length - 1)];
    return {
      route,
      currentStepIndex: stepIndex,
      distanceToNextStepMeters:
        nextStepStart === undefined ? distanceRemainingMeters : Math.max(0, nextStepStart - progressMeters),
      distanceRemainingMeters,
      timeRemainingSeconds: isArrived ? 0 : this.timeRemaining(stepIndex),
      progress: totalMeters > 0 ? progressMeters / totalMeters : isArrived ? 1 : 0,
      snappedPosition: this.snapped,
      distanceFromRouteMeters: distanceFromRoute,
      routeBearing: bearing(g[this.segmentIndex], segmentEnd),
      isOffRoute,
      isArrived,
    };
  }

  /** Remaining time: the unfinished share of the current step plus all later steps. */
  private timeRemaining(stepIndex: number): number {
    const { route, stepStartMeters, progressMeters, totalMeters } = this;
    if (route.steps.length === 0) {
      return totalMeters > 0 ? route.durationSeconds * (1 - progressMeters / totalMeters) : 0;
    }
    const stepStart = stepStartMeters[stepIndex];
    const stepEnd = stepStartMeters[stepIndex + 1] ?? totalMeters;
    const stepLength = stepEnd - stepStart;
    const fractionLeft = stepLength > 0 ? Math.min(1, Math.max(0, (stepEnd - progressMeters) / stepLength)) : 0;

    let seconds = fractionLeft * route.steps[stepIndex].duration;
    for (let i = stepIndex + 1; i < route.steps.length; i++) seconds += route.steps[i].duration;
    return seconds;
  }
}
