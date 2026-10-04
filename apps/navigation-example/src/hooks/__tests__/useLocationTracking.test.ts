import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import type { Fix } from '../../lib/location';
import { useLocationTracking, useSimulatedLocation } from '../useLocationTracking';

jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6 },
  watchPositionAsync: jest.fn(),
}));
const watch = jest.mocked(Location.watchPositionAsync);

function loc(lng: number, lat: number): Location.LocationObject {
  return {
    timestamp: 1,
    coords: { longitude: lng, latitude: lat, altitude: null, accuracy: 4, altitudeAccuracy: null, heading: 10, speed: 5 },
  };
}

describe('useLocationTracking', () => {
  beforeEach(() => watch.mockReset());

  it('delivers fixes and removes the subscription on cleanup', async () => {
    const remove = jest.fn();
    let emit!: (l: Location.LocationObject) => void;
    watch.mockImplementation(async (_opts, cb) => {
      emit = cb;
      return { remove };
    });
    const onFix = jest.fn();
    const { rerender } = await renderHook(({ enabled }: { enabled: boolean }) => useLocationTracking(enabled, onFix), {
      initialProps: { enabled: true },
    });
    await act(async () => emit(loc(5.7, 5.5)));
    expect(onFix).toHaveBeenCalledWith(expect.objectContaining({ position: [5.7, 5.5], speed: 5 }));

    await rerender({ enabled: false });
    expect(remove).toHaveBeenCalledTimes(1);
    emit(loc(1, 1));
    expect(onFix).toHaveBeenCalledTimes(1);
  });

  it('removes a subscription that resolves after cleanup (exit mid-start leak)', async () => {
    const remove = jest.fn();
    let resolveWatch!: (s: Location.LocationSubscription) => void;
    let emit!: (l: Location.LocationObject) => void;
    watch.mockImplementation((_opts, cb) => {
      emit = cb;
      return new Promise((resolve) => {
        resolveWatch = resolve;
      });
    });
    const onFix = jest.fn();
    const { unmount } = await renderHook(() => useLocationTracking(true, onFix));
    await unmount();
    expect(remove).not.toHaveBeenCalled();

    await act(async () => resolveWatch({ remove }));
    expect(remove).toHaveBeenCalledTimes(1);
    emit(loc(1, 1));
    expect(onFix).not.toHaveBeenCalled();
  });

  it('reports subscription errors, but not after cleanup', async () => {
    const onError = jest.fn();
    watch.mockRejectedValueOnce(new Error('denied'));
    await renderHook(() => useLocationTracking(true, jest.fn(), onError));
    await act(async () => {});
    expect(onError).toHaveBeenCalledWith(new Error('denied'));

    let rejectWatch!: (e: unknown) => void;
    watch.mockReturnValueOnce(new Promise((_res, rej) => (rejectWatch = rej)));
    const late = jest.fn();
    const { unmount } = await renderHook(() => useLocationTracking(true, jest.fn(), late));
    await unmount();
    await act(async () => rejectWatch(new Error('late')));
    expect(late).not.toHaveBeenCalled();
  });

  it('does nothing while disabled', async () => {
    await renderHook(() => useLocationTracking(false, jest.fn()));
    expect(watch).not.toHaveBeenCalled();
  });
});

describe('useSimulatedLocation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('drives along the line at the given speed and stops at the end', async () => {
    const fixes: Fix[] = [];
    // ~111 m due north.
    const line: [number, number][] = [[0, 0], [0, 0.001]];
    await renderHook(() => useSimulatedLocation(line, (f) => fixes.push(f), { speedMetersPerSecond: 50, intervalMs: 1000 }));
    expect(fixes[0].position).toEqual([0, 0]);
    expect(fixes[0].speed).toBe(50);

    await act(async () => jest.advanceTimersByTime(5000));
    expect(fixes[1].position[1]).toBeCloseTo(50 / 111_195, 6);
    const last = fixes[fixes.length - 1];
    expect(last.position).toEqual([0, 0.001]);
    expect(last.speed).toBe(0);
    const count = fixes.length;
    await act(async () => jest.advanceTimersByTime(5000));
    expect(fixes).toHaveLength(count);
  });

  it('does nothing without a line', async () => {
    const onFix = jest.fn();
    await renderHook(() => useSimulatedLocation(undefined, onFix));
    await renderHook(() => useSimulatedLocation([], onFix));
    expect(onFix).not.toHaveBeenCalled();
  });

  it('stops ticking on unmount', async () => {
    const onFix = jest.fn();
    const { unmount } = await renderHook(() => useSimulatedLocation([[0, 0], [0, 1]], onFix));
    await unmount();
    const calls = onFix.mock.calls.length;
    await act(async () => jest.advanceTimersByTime(5000));
    expect(onFix).toHaveBeenCalledTimes(calls);
  });
});
