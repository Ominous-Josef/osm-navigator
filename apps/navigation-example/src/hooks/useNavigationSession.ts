import {
  AbortError,
  fetchRoute,
  type LngLat,
  NavigationEngine,
  type NavigationState,
  type Route,
} from '@osm-navigator/core';
import { formatDistance, type Units } from '@osm-navigator/ui-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from '../lib/errors';
import { type Fix, getStartPosition, isUsableFix } from '../lib/location';
import { upcomingManeuver } from '../lib/maneuver';
import { speak, stopSpeaking } from '../lib/speech';
import { useLocationTracking, useSimulatedLocation } from './useLocationTracking';

export type SessionPhase = 'idle' | 'starting' | 'navigating' | 'arrived';

export interface Destination {
  coordinates: LngLat;
  name: string;
}

/** Stay off-route this long before rerouting automatically (filters brief detours). */
export const REROUTE_AFTER_MS = 5_000;
/** Never reroute more often than this (fair use of the public Valhalla instance). */
export const MIN_REROUTE_INTERVAL_MS = 15_000;
/** Repeat the upcoming instruction once when it gets this close. */
export const NEAR_PROMPT_METERS = 150;

export interface NavigationSessionOptions {
  /** Drive along the route instead of using GPS (dev tool). */
  simulate?: boolean;
  units?: Units;
}

/**
 * One navigation session: fetches the route, feeds GPS fixes to `NavigationEngine`,
 * speaks each instruction once, and reroutes after being off-route for a while.
 */
export function useNavigationSession({ simulate = false, units = 'metric' }: NavigationSessionOptions = {}) {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [route, setRoute] = useState<Route | undefined>(undefined);
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const engineRef = useRef<NavigationEngine | null>(null);
  const destinationRef = useRef<Destination | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const lastFixRef = useRef<Fix | null>(null);
  const offRouteSinceRef = useRef<number | null>(null);
  const lastRerouteAtRef = useRef(0);
  const reroutingRef = useRef(false);
  const promptedStepRef = useRef(-1);
  const unitsRef = useRef(units);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  const upcomingPrompt = useCallback((state: NavigationState): string | undefined => {
    const upcoming = upcomingManeuver(state);
    if (!upcoming || state.route.steps.length < 2) return undefined;
    return `In ${formatDistance(upcoming.distanceMeters, unitsRef.current)}, ${upcoming.instruction}`;
  }, []);

  const installRoute = useCallback(
    (next: Route) => {
      const engine = new NavigationEngine(next, {
        onStepChange: (_step, index, state) => {
          // Close maneuvers are covered by this prompt; don't repeat them as "near".
          promptedStepRef.current = state.distanceToNextStepMeters <= NEAR_PROMPT_METERS ? index : -1;
          const prompt = upcomingPrompt(state);
          if (prompt && index < next.steps.length - 1) speak(prompt);
        },
        onArrive: () => {
          speak('You have arrived at your destination.');
          setPhase('arrived');
        },
        onOffRouteChange: (isOffRoute) => {
          offRouteSinceRef.current = isOffRoute ? Date.now() : null;
        },
      });
      engineRef.current = engine;
      offRouteSinceRef.current = null;
      promptedStepRef.current = -1;
      setRoute(next);
      setNavState(engine.state);
    },
    [upcomingPrompt],
  );

  const reroute = useCallback(
    async (origin: LngLat) => {
      const target = destinationRef.current;
      if (!target || reroutingRef.current) return;
      reroutingRef.current = true;
      lastRerouteAtRef.current = Date.now();
      setIsRerouting(true);
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      speak('Rerouting.');
      try {
        const next = await fetchRoute({ origin, destination: target.coordinates, signal: controller.signal });
        if (controller.signal.aborted) return;
        installRoute(next);
        const prompt = upcomingPrompt(engineRef.current!.state);
        speak(prompt ? `Route updated. ${prompt}` : 'Route updated.');
      } catch (e: unknown) {
        if (controller.signal.aborted || e instanceof AbortError) return;
        setError(describeError(e));
      } finally {
        if (requestRef.current === controller) {
          reroutingRef.current = false;
          setIsRerouting(false);
        }
      }
    },
    [installRoute, upcomingPrompt],
  );

  const handleFix = useCallback(
    (next: Fix) => {
      const engine = engineRef.current;
      if (!engine) return;
      setFix(next);
      // Too inaccurate (e.g. indoors): show it, but don't let it move or reroute us.
      if (!isUsableFix(next)) return;
      lastFixRef.current = next;
      const state = engine.update(next.position, next.accuracy ?? undefined);
      setNavState(state);
      if (state.isArrived) return;

      const hasUpcoming = state.currentStepIndex < state.route.steps.length - 1;
      if (hasUpcoming && state.distanceToNextStepMeters <= NEAR_PROMPT_METERS && promptedStepRef.current !== state.currentStepIndex) {
        promptedStepRef.current = state.currentStepIndex;
        const prompt = upcomingPrompt(state);
        if (prompt) speak(prompt);
      }

      const since = offRouteSinceRef.current;
      const now = Date.now();
      if (
        state.isOffRoute &&
        since !== null &&
        now - since >= REROUTE_AFTER_MS &&
        now - lastRerouteAtRef.current >= MIN_REROUTE_INTERVAL_MS
      ) {
        void reroute(next.position);
      }
    },
    [reroute, upcomingPrompt],
  );

  const start = useCallback(
    async (target: Destination) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      destinationRef.current = target;
      setDestination(target);
      setError(null);
      setPhase('starting');
      try {
        const origin = await getStartPosition();
        if (controller.signal.aborted) return;
        const next = await fetchRoute({ origin, destination: target.coordinates, signal: controller.signal });
        if (controller.signal.aborted) return;
        installRoute(next);
        lastFixRef.current = null;
        setFix(null);
        setPhase('navigating');
        const first = next.steps[0]?.instruction ?? '';
        const prompt = upcomingPrompt(engineRef.current!.state);
        speak([`Starting navigation to ${target.name}.`, first, prompt ? `Then, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}` : ''].filter(Boolean).join(' '));
      } catch (e: unknown) {
        if (controller.signal.aborted || e instanceof AbortError) return;
        destinationRef.current = null;
        setDestination(null);
        setError(describeError(e));
        setPhase('idle');
      }
    },
    [installRoute, upcomingPrompt],
  );

  const stop = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    engineRef.current = null;
    destinationRef.current = null;
    lastFixRef.current = null;
    reroutingRef.current = false;
    stopSpeaking();
    setPhase('idle');
    setRoute(undefined);
    setNavState(null);
    setFix(null);
    setDestination(null);
    setIsRerouting(false);
  }, []);

  /** Reroute now from the latest fix (the off-route banner's button). */
  const rerouteNow = useCallback(() => {
    if (lastFixRef.current) void reroute(lastFixRef.current.position);
  }, [reroute]);

  const dismissError = useCallback(() => setError(null), []);

  const onTrackingError = useCallback((e: unknown) => setError(describeError(e)), []);

  const tracking = phase === 'navigating';
  useLocationTracking(tracking && !simulate, handleFix, onTrackingError);
  useSimulatedLocation(tracking && simulate ? route?.geometry : undefined, handleFix);

  // Leaving the screen mid-request or mid-route: cancel and go quiet.
  useEffect(
    () => () => {
      requestRef.current?.abort();
      stopSpeaking();
    },
    [],
  );

  return {
    phase,
    route,
    navState,
    fix,
    destination,
    error,
    isRerouting,
    start,
    stop,
    rerouteNow,
    dismissError,
  };
}
