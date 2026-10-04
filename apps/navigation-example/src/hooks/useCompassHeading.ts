import { bearingDelta } from '../lib/bearing';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

/** Ignore compass changes smaller than this (sensor noise, re-render cost). */
export const COMPASS_STEP_DEGREES = 5;

/**
 * Where the phone points, in degrees clockwise from true north (magnetic north when
 * true north is unavailable). `undefined` until the first reading or when disabled.
 */
export function useCompassHeading(enabled: boolean): number | undefined {
  const [heading, setHeading] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    Location.watchHeadingAsync((reading) => {
      if (cancelled) return;
      const next = reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading;
      if (!Number.isFinite(next) || next < 0) return;
      setHeading((prev) =>
        prev === undefined || Math.abs(bearingDelta(prev, next)) >= COMPASS_STEP_DEGREES ? next : prev,
      );
    }).then(
      (sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      },
      () => {
        // No magnetometer: the marker falls back to the GPS course.
      },
    );

    return () => {
      cancelled = true;
      subscription?.remove();
      setHeading(undefined);
    };
  }, [enabled]);

  return heading;
}
