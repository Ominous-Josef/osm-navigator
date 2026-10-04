import type { CameraState, LngLat, NavigationState } from '@osm-navigator/core';
import type { UserMarkerStyle } from '@osm-navigator/native-map';
import { useState } from 'react';
import { smoothBearing } from '../lib/bearing';
import { type Fix, isMoving } from '../lib/location';

export interface FollowCamera {
  camera?: CameraState;
  /** Where to draw the user: snapped onto the route while on it, raw otherwise. */
  marker?: LngLat;
  /** Direction the marker's arrow points; undefined draws a plain dot. */
  markerHeading?: number;
  /** Accuracy circle radius in meters. */
  markerAccuracy?: number;
  /** A navigation arrow while navigating or moving, a dot with a facing cone otherwise. */
  markerStyle?: UserMarkerStyle;
}

/**
 * Where to draw the user and, while navigating, a camera that follows them.
 *
 * - Position: the engine's snapped position while on route (no sideways GPS jitter),
 *   the raw fix otherwise.
 * - Arrow: the route's direction when moving along it, the GPS course when moving off
 *   it, and the compass when standing or walking slowly (the GPS course is noise then).
 * - Camera bearing: the route's direction while on route, the GPS course when off it;
 *   small changes are ignored so the map doesn't wobble.
 */
export function useFollowCamera(
  navState: NavigationState | null,
  fix: Fix | null,
  compassHeading?: number,
): FollowCamera {
  const [bearing, setBearing] = useState<number | undefined>(undefined);
  const active = navState !== null && !navState.isArrived;
  const onRoute = active && !navState.isOffRoute;
  const course = isMoving(fix) ? fix.heading : undefined;

  let next: number | undefined;
  if (active) {
    const target = onRoute ? navState.routeBearing : (fix?.heading ?? bearing ?? navState.routeBearing);
    next = smoothBearing(bearing, target);
  }
  // Adjusting state while rendering (React's documented pattern for derived state).
  if (next !== bearing) setBearing(next);

  const markerAccuracy = fix?.accuracy ?? undefined;

  if (!active) {
    return fix
      ? {
          marker: fix.position,
          markerHeading: course ?? compassHeading,
          markerAccuracy,
          markerStyle: course !== undefined ? 'arrow' : 'dot',
        }
      : {};
  }

  const marker = onRoute || !fix ? navState.snappedPosition : fix.position;
  const markerHeading =
    course !== undefined ? (onRoute ? navState.routeBearing : course) : (compassHeading ?? navState.routeBearing);
  return {
    camera: { longitude: marker[0], latitude: marker[1], zoom: 17, pitch: 55, bearing: next },
    marker,
    markerHeading,
    markerAccuracy,
    markerStyle: 'arrow',
  };
}
