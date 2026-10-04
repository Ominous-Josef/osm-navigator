import type { NavigationState } from '@osm-navigator/core';
import { renderHook } from '@testing-library/react-native';
import type { Fix } from '../../lib/location';
import { useFollowCamera } from '../useFollowCamera';

function nav(partial: Partial<NavigationState>): NavigationState {
  return {
    route: { steps: [] },
    currentStepIndex: 0,
    distanceToNextStepMeters: 0,
    distanceRemainingMeters: 0,
    timeRemainingSeconds: 0,
    progress: 0,
    snappedPosition: [5.7, 5.5],
    distanceFromRouteMeters: 2,
    routeBearing: 90,
    isOffRoute: false,
    isArrived: false,
    ...partial,
  } as NavigationState;
}

const fix = (speed: number | null, heading: number | null = 200): Fix => ({
  position: [5.71, 5.51],
  speed,
  heading,
  accuracy: 5,
  timestamp: 0,
});

describe('useFollowCamera', () => {
  it('draws nothing without a fix outside navigation', async () => {
    const { result } = await renderHook(() => useFollowCamera(null, null, 30));
    expect(result.current).toEqual({});
  });

  it('outside navigation: raw fix with accuracy; compass arrow when slow, GPS course when moving', async () => {
    const slow = await renderHook(() => useFollowCamera(null, fix(0.5), 30));
    expect(slow.result.current).toEqual({ marker: [5.71, 5.51], markerHeading: 30, markerAccuracy: 5, markerStyle: 'dot' });
    const moving = await renderHook(() => useFollowCamera(null, fix(10, 200), 30));
    expect(moving.result.current.markerHeading).toBe(200);
    expect(moving.result.current.markerStyle).toBe('arrow');
    const noCompass = await renderHook(() => useFollowCamera(null, { ...fix(0), accuracy: null }));
    expect(noCompass.result.current).toEqual({
      marker: [5.71, 5.51],
      markerHeading: undefined,
      markerAccuracy: undefined,
      markerStyle: 'dot',
    });
  });

  it('follows the snapped position and route bearing on route; arrow follows the route when moving', async () => {
    const { result } = await renderHook(() => useFollowCamera(nav({}), fix(10), 300));
    expect(result.current.marker).toEqual([5.7, 5.5]);
    expect(result.current.markerHeading).toBe(90);
    expect(result.current.markerAccuracy).toBe(5);
    expect(result.current.camera).toEqual({ longitude: 5.7, latitude: 5.5, zoom: 17, pitch: 55, bearing: 90 });
  });

  it('points the arrow where the phone faces when standing still', async () => {
    const { result } = await renderHook(() => useFollowCamera(nav({}), fix(0), 300));
    expect(result.current.markerHeading).toBe(300);
    // Still an arrow: there's a destination.
    expect(result.current.markerStyle).toBe('arrow');
    expect(result.current.camera?.bearing).toBe(90);
    const noCompass = await renderHook(() => useFollowCamera(nav({}), fix(0)));
    expect(noCompass.result.current.markerHeading).toBe(90);
  });

  it('ignores small bearing changes and follows large ones', async () => {
    const { result, rerender } = await renderHook(({ s }: { s: NavigationState }) => useFollowCamera(s, fix(10)), {
      initialProps: { s: nav({ routeBearing: 90 }) },
    });
    await rerender({ s: nav({ routeBearing: 94 }) });
    expect(result.current.camera?.bearing).toBe(90);
    await rerender({ s: nav({ routeBearing: 130 }) });
    expect(result.current.camera?.bearing).toBe(130);
  });

  it('uses the raw fix and GPS course when off-route', async () => {
    const { result } = await renderHook(() => useFollowCamera(nav({ isOffRoute: true }), fix(10, 200), 30));
    expect(result.current.marker).toEqual([5.71, 5.51]);
    expect(result.current.markerHeading).toBe(200);
    expect(result.current.camera?.bearing).toBe(200);
  });

  it('falls back to the route bearing off-route without a GPS course, and the snapped point without a fix', async () => {
    const { result } = await renderHook(() => useFollowCamera(nav({ isOffRoute: true, routeBearing: 45 }), fix(null, null)));
    expect(result.current.camera?.bearing).toBe(45);
    expect(result.current.markerHeading).toBe(45);
    const noFix = await renderHook(() => useFollowCamera(nav({ isOffRoute: true }), null));
    expect(noFix.result.current.marker).toEqual([5.7, 5.5]);
    expect(noFix.result.current.markerAccuracy).toBeUndefined();
  });

  it('stops following on arrival but keeps showing the user', async () => {
    const { result } = await renderHook(() => useFollowCamera(nav({ isArrived: true }), fix(0), 10));
    expect(result.current.camera).toBeUndefined();
    expect(result.current.marker).toEqual([5.71, 5.51]);
    expect(result.current.markerHeading).toBe(10);
    expect(result.current.markerStyle).toBe('dot');
  });
});
