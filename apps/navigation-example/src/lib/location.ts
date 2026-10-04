import { haversineDistance, type LngLat } from '@osm-navigator/core';
import * as Location from 'expo-location';

export interface Fix {
  position: LngLat;
  /** Meters per second, when known. */
  speed: number | null;
  /** Direction of travel in degrees, when known. */
  heading: number | null;
  /** Horizontal accuracy in meters, when known. */
  accuracy: number | null;
  timestamp: number;
}

export function toFix(location: Location.LocationObject): Fix {
  const { coords } = location;
  return {
    position: [coords.longitude, coords.latitude],
    speed: coords.speed != null && coords.speed >= 0 ? coords.speed : null,
    heading: coords.heading != null && coords.heading >= 0 ? coords.heading : null,
    accuracy: coords.accuracy ?? null,
    timestamp: location.timestamp,
  };
}

export class LocationUnavailableError extends Error {
  constructor() {
    super("Couldn't get your location. Move somewhere with a clear view of the sky and try again.");
    this.name = 'LocationUnavailableError';
  }
}

/** Reject with `onTimeout()` if `promise` hasn't settled within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * A position to route from: a fresh fix if one arrives within `timeoutMs` (indoors it
 * may never come), otherwise the last known position if it's recent enough.
 */
export async function getStartPosition(timeoutMs = 10_000, maxLastKnownAgeMs = 5 * 60_000): Promise<LngLat> {
  try {
    const fix = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeoutMs,
      () => new LocationUnavailableError(),
    );
    return toFix(fix).position;
  } catch {
    const last = await Location.getLastKnownPositionAsync({ maxAge: maxLastKnownAgeMs });
    if (last) return toFix(last).position;
    throw new LocationUnavailableError();
  }
}

/** Fixes at least this accurate are good enough for turn-by-turn. */
export const GOOD_ACCURACY_METERS = 20;
/**
 * Fixes less accurate than this are not used for navigation. Indoors, phones fall back
 * to Wi-Fi/cell positions that are often 50–500 m off and would cause false
 * off-route reroutes.
 */
export const MAX_USABLE_ACCURACY_METERS = 50;
/** No fix for this long while tracking counts as having lost the signal. */
export const SIGNAL_LOST_AFTER_MS = 15_000;

export type SignalQuality = 'good' | 'weak' | 'poor' | 'lost';

export function signalQuality(accuracy: number | null | undefined): SignalQuality {
  if (accuracy == null) return 'weak';
  if (accuracy <= GOOD_ACCURACY_METERS) return 'good';
  if (accuracy <= MAX_USABLE_ACCURACY_METERS) return 'weak';
  return 'poor';
}

export function isUsableFix(fix: Fix): boolean {
  return fix.accuracy == null || fix.accuracy <= MAX_USABLE_ACCURACY_METERS;
}

/** Above this speed the GPS course is reliable; below it, use the compass. */
export const COURSE_SPEED_MPS = 2.5;
/** Never treat moves smaller than this as real, however good the accuracy claims to be. */
export const MIN_DRIFT_METERS = 5;

/**
 * Really moving: fast enough for the GPS course to mean something, on a fix accurate
 * enough for its speed to be trusted (indoors, Wi-Fi positions hop around and come
 * with made-up speeds).
 */
export function isMoving(fix: Fix | null): fix is Fix & { heading: number } {
  return (
    fix !== null &&
    fix.heading !== null &&
    (fix.speed ?? 0) >= COURSE_SPEED_MPS &&
    (fix.accuracy == null || fix.accuracy <= GOOD_ACCURACY_METERS)
  );
}

/**
 * Holds the position still against GPS drift: a new fix only moves it when it lands
 * outside the uncertainty (or is much more accurate). A held fix keeps the old
 * position, takes the new accuracy and counts as stationary.
 */
export function steadyFix(previous: Fix | null, next: Fix): Fix {
  if (!previous || isMoving(next)) return next;
  const noise = Math.max(next.accuracy ?? 0, MIN_DRIFT_METERS);
  const moved = haversineDistance(previous.position, next.position) > noise;
  const muchBetter = next.accuracy != null && previous.accuracy != null && next.accuracy < previous.accuracy / 2;
  if (moved || muchBetter) return next;
  return { ...next, position: previous.position, speed: 0, heading: null };
}
