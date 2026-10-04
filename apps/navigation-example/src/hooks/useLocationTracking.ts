import type { LngLat } from '@osm-navigator/core';
import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { type Fix, toFix } from '../lib/location';
import { pointAlong, prepareLine } from '../lib/simulate';

/** Keep a callback in a ref so effects don't resubscribe when it changes. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

/**
 * Real GPS fixes while `enabled`.
 *
 * `watchPositionAsync` resolves asynchronously; if the effect is cleaned up before it
 * resolves (e.g. the user exits right after starting), the subscription is removed as
 * soon as it arrives instead of leaking and keeping GPS on in the background.
 */
export function useLocationTracking(
  enabled: boolean,
  onFix: (fix: Fix) => void,
  onError?: (error: unknown) => void,
) {
  const onFixRef = useLatest(onFix);
  const onErrorRef = useLatest(onError);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
      (location) => {
        if (!cancelled) onFixRef.current(toFix(location));
      },
    ).then(
      (sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      },
      (error: unknown) => {
        if (!cancelled) onErrorRef.current?.(error);
      },
    );

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled, onErrorRef, onFixRef]);
}

export interface SimulationOptions {
  /** @default 12 (≈ 43 km/h) */
  speedMetersPerSecond?: number;
  /** @default 1000 */
  intervalMs?: number;
}

/** Dev tool: emits fixes that drive along `line` (e.g. the route) at a steady speed. */
export function useSimulatedLocation(
  line: readonly LngLat[] | undefined,
  onFix: (fix: Fix) => void,
  { speedMetersPerSecond = 12, intervalMs = 1000 }: SimulationOptions = {},
) {
  const onFixRef = useLatest(onFix);

  useEffect(() => {
    if (!line || line.length === 0) return;
    const prepared = prepareLine(line);
    let travelled = 0;
    const tick = () => {
      const point = pointAlong(prepared, travelled);
      onFixRef.current({
        position: point.position,
        speed: point.done ? 0 : speedMetersPerSecond,
        heading: point.heading,
        accuracy: 5,
        timestamp: Date.now(),
      });
      if (point.done) clearInterval(timer);
      travelled += (speedMetersPerSecond * intervalMs) / 1000;
    };
    const timer = setInterval(tick, intervalMs);
    tick();
    return () => clearInterval(timer);
  }, [intervalMs, line, onFixRef, speedMetersPerSecond]);
}
