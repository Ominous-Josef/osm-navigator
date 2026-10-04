import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import type { Fix } from '../../lib/location';
import { SIGNAL_LOST_AFTER_MS } from '../../lib/location';
import { COMPASS_STEP_DEGREES, useCompassHeading } from '../useCompassHeading';
import { useGpsSignal } from '../useGpsSignal';

jest.mock('expo-location', () => ({ watchHeadingAsync: jest.fn() }));
const watchHeading = jest.mocked(Location.watchHeadingAsync);

const fix = (accuracy: number | null): Fix => ({ position: [5.7, 5.5], speed: 0, heading: null, accuracy, timestamp: 0 });

describe('useGpsSignal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is undefined when not tracking or before the first fix', async () => {
    const off = await renderHook(() => useGpsSignal(fix(5), false));
    expect(off.result.current).toBeUndefined();
    const waiting = await renderHook(() => useGpsSignal(null, true));
    expect(waiting.result.current).toBeUndefined();
  });

  it('rates each fix by accuracy and reports "lost" when fixes stop coming', async () => {
    const { result, rerender } = await renderHook(({ f }: { f: Fix | null }) => useGpsSignal(f, true), {
      initialProps: { f: fix(8) },
    });
    expect(result.current).toBe('good');
    await rerender({ f: fix(35) });
    expect(result.current).toBe('weak');
    await rerender({ f: fix(200) });
    expect(result.current).toBe('poor');

    await act(async () => jest.advanceTimersByTime(SIGNAL_LOST_AFTER_MS - 1));
    expect(result.current).toBe('poor');
    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current).toBe('lost');

    await rerender({ f: fix(6) });
    expect(result.current).toBe('good');
  });

  it('reports "lost" when no fix ever arrives, and forgets it when tracking stops', async () => {
    const { result, rerender } = await renderHook(({ on }: { on: boolean }) => useGpsSignal(null, on), {
      initialProps: { on: true },
    });
    await act(async () => jest.advanceTimersByTime(SIGNAL_LOST_AFTER_MS));
    expect(result.current).toBe('lost');
    await rerender({ on: false });
    expect(result.current).toBeUndefined();
    await rerender({ on: true });
    expect(result.current).toBeUndefined();
  });
});

describe('useCompassHeading', () => {
  let emit: (h: Location.LocationHeadingObject) => void;
  const remove = jest.fn();
  const reading = (trueHeading: number, magHeading = 0) => ({ trueHeading, magHeading, accuracy: 3 });

  beforeEach(() => {
    jest.clearAllMocks();
    watchHeading.mockImplementation(async (cb) => {
      emit = cb;
      return { remove };
    });
  });

  it('follows the compass, ignoring jitter below the step', async () => {
    const { result, unmount } = await renderHook(() => useCompassHeading(true));
    expect(result.current).toBeUndefined();
    await act(async () => emit(reading(100)));
    expect(result.current).toBe(100);
    await act(async () => emit(reading(100 + COMPASS_STEP_DEGREES - 1)));
    expect(result.current).toBe(100);
    await act(async () => emit(reading(120)));
    expect(result.current).toBe(120);
    // No true north (e.g. no location yet for declination): magnetic heading.
    await act(async () => emit(reading(-1, 200)));
    expect(result.current).toBe(200);
    // Garbage readings are ignored.
    await act(async () => emit(reading(-1, -1)));
    expect(result.current).toBe(200);
    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled and resets when turned off', async () => {
    const { result, rerender } = await renderHook(({ on }: { on: boolean }) => useCompassHeading(on), {
      initialProps: { on: false },
    });
    expect(watchHeading).not.toHaveBeenCalled();
    await rerender({ on: true });
    await act(async () => emit(reading(45)));
    expect(result.current).toBe(45);
    await rerender({ on: false });
    expect(result.current).toBeUndefined();
  });

  it('removes a subscription that resolves after unmount, and survives a missing sensor', async () => {
    let resolve!: (s: { remove: () => void }) => void;
    watchHeading.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const early = await renderHook(() => useCompassHeading(true));
    await early.unmount();
    await act(async () => resolve({ remove }));
    expect(remove).toHaveBeenCalledTimes(1);

    watchHeading.mockRejectedValueOnce(new Error('no magnetometer'));
    const missing = await renderHook(() => useCompassHeading(true));
    await act(async () => {});
    expect(missing.result.current).toBeUndefined();
  });
});
