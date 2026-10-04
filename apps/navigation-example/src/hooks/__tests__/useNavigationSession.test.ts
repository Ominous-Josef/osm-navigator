import * as core from '@osm-navigator/core';
import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import {
  MIN_REROUTE_INTERVAL_MS,
  REROUTE_AFTER_MS,
  useNavigationSession,
} from '../useNavigationSession';

jest.mock('@osm-navigator/core', () => ({ ...jest.requireActual('@osm-navigator/core'), fetchRoute: jest.fn() }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4, BestForNavigation: 6 },
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const fetchRoute = jest.mocked(core.fetchRoute);
const speak = jest.mocked(Speech.speak);
const loc = jest.mocked(Location);

// Local metric frame near Warri: x east, y north, in meters.
const ORIGIN: core.LngLat = [5.7, 5.5];
const M = (core.EARTH_RADIUS_METERS * Math.PI) / 180;
const at = (x: number, y: number): core.LngLat => [ORIGIN[0] + x / (M * Math.cos((ORIGIN[1] * Math.PI) / 180)), ORIGIN[1] + y / M];

/** 600 m east, then left and 400 m north. */
function lRoute(offsetY = 0): core.Route {
  const geometry = [at(0, offsetY), at(600, offsetY), at(600, offsetY + 400)];
  const step = (instruction: string, maneuverType: core.ManeuverType, i: number, duration: number): core.RouteStep => ({
    instruction, maneuverType, distance: 0, duration, startLocation: geometry[i], geometryIndex: i,
  });
  return {
    geometry,
    distanceMeters: 1000,
    durationSeconds: 100,
    steps: [step('Drive east.', 'depart', 0, 60), step('Turn left.', 'left', 1, 40), step('You have arrived.', 'arrive', 2, 0)],
    raw: {} as core.ValhallaRouteResponse,
  };
}

const DEST = { coordinates: at(600, 400), name: 'PTI' };

let emit: (l: Location.LocationObject) => void;
const remove = jest.fn();

function fixAt(x: number, y: number, speed = 10, accuracy = 5) {
  const [longitude, latitude] = at(x, y);
  return { timestamp: Date.now(), coords: { longitude, latitude, altitude: null, accuracy, altitudeAccuracy: null, heading: 90, speed } };
}

beforeEach(() => {
  jest.useFakeTimers({ now: 1_000_000 });
  jest.clearAllMocks();
  loc.getCurrentPositionAsync.mockResolvedValue(fixAt(0, 0));
  loc.watchPositionAsync.mockImplementation(async (_o, cb) => {
    emit = cb;
    return { remove };
  });
  fetchRoute.mockResolvedValue(lRoute());
});
afterEach(() => jest.useRealTimers());

async function startedSession() {
  const hook = await renderHook(() => useNavigationSession());
  await act(async () => hook.result.current.start(DEST));
  return hook;
}

describe('useNavigationSession', () => {
  it('starts: routes from the current position and announces the trip once', async () => {
    const { result } = await startedSession();
    expect(fetchRoute).toHaveBeenCalledWith(expect.objectContaining({ origin: at(0, 0), destination: DEST.coordinates }));
    expect(result.current.phase).toBe('navigating');
    expect(result.current.destination).toEqual(DEST);
    expect(result.current.navState?.currentStepIndex).toBe(0);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toBe('Starting navigation to PTI. Drive east. Then, in 600 m, Turn left.');
    expect(loc.watchPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('speaks the upcoming turn once when it gets close, then again after each step', async () => {
    const { result } = await startedSession();
    speak.mockClear();
    await act(async () => emit(fixAt(300, 0)));
    expect(speak).not.toHaveBeenCalled();
    await act(async () => emit(fixAt(480, 0)));
    await act(async () => emit(fixAt(500, 0)));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toBe('In 120 m, Turn left.');

    await act(async () => emit(fixAt(600, 50)));
    expect(result.current.navState?.currentStepIndex).toBe(1);
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak.mock.calls[1][0]).toBe('In 350 m, You have arrived.');
  });

  it('latches arrival: speaks once, stops tracking, ignores later fixes', async () => {
    const { result } = await startedSession();
    // Drive through the turn (fixes beyond the engine's look-ahead window don't snap).
    for (const [x, y] of [[300, 0], [600, 0], [600, 200], [600, 395]]) {
      await act(async () => emit(fixAt(x, y)));
    }
    expect(result.current.phase).toBe('arrived');
    expect(result.current.navState?.isArrived).toBe(true);
    const arrivals = speak.mock.calls.filter(([t]) => t === 'You have arrived at your destination.');
    expect(arrivals).toHaveLength(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('shows but does not navigate on fixes too inaccurate to trust (indoors)', async () => {
    const { result } = await startedSession();
    await act(async () => emit(fixAt(100, 0)));
    const before = result.current.navState;
    // Wi-Fi/cell fallback indoors: far away and ±150 m.
    for (let i = 0; i < 5; i++) await act(async () => emit(fixAt(300, 200, 0, 150)));
    await act(async () => jest.advanceTimersByTime(REROUTE_AFTER_MS));
    await act(async () => emit(fixAt(300, 200, 0, 150)));
    expect(result.current.fix?.accuracy).toBe(150);
    expect(result.current.navState).toBe(before);
    expect(fetchRoute).toHaveBeenCalledTimes(1);

    // Moderately inaccurate fixes count, but their uncertainty keeps them on route.
    for (let i = 0; i < 3; i++) await act(async () => emit(fixAt(200, 40, 3, 45)));
    expect(result.current.navState?.isOffRoute).toBe(false);
  });

  it('reroutes automatically only after being off-route for a while, and not too often', async () => {
    const { result } = await startedSession();
    await act(async () => emit(fixAt(100, 0)));
    // Three far-off fixes make the engine declare off-route.
    for (let i = 0; i < 3; i++) {
      await act(async () => emit(fixAt(150 + i * 10, 80)));
    }
    expect(result.current.navState?.isOffRoute).toBe(true);
    expect(fetchRoute).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(REROUTE_AFTER_MS));
    fetchRoute.mockResolvedValueOnce(lRoute(80));
    await act(async () => emit(fixAt(200, 80)));
    await flush();
    expect(fetchRoute).toHaveBeenCalledTimes(2);
    expect(fetchRoute.mock.calls[1][0]).toMatchObject({ origin: at(200, 80), destination: DEST.coordinates });
    expect(result.current.isRerouting).toBe(false);
    expect(result.current.navState?.isOffRoute).toBe(false);
    expect(result.current.route?.geometry[0]).toEqual(at(0, 80));
    expect(speak).toHaveBeenCalledWith('Rerouting.');

    // Off the new route straight away: no second reroute within the minimum interval.
    for (let i = 0; i < 3; i++) await act(async () => emit(fixAt(250, 200)));
    await act(async () => jest.advanceTimersByTime(REROUTE_AFTER_MS));
    await act(async () => emit(fixAt(250, 200)));
    expect(fetchRoute).toHaveBeenCalledTimes(2);
    await act(async () => jest.advanceTimersByTime(MIN_REROUTE_INTERVAL_MS));
    await act(async () => emit(fixAt(250, 200)));
    await flush();
    expect(fetchRoute).toHaveBeenCalledTimes(3);
  });

  it('manual reroute uses the latest fix and surfaces failures', async () => {
    const { result } = await startedSession();
    await act(async () => result.current.rerouteNow());
    expect(fetchRoute).toHaveBeenCalledTimes(1);

    await act(async () => emit(fixAt(100, 30)));
    fetchRoute.mockRejectedValueOnce(new core.ServiceError('u', 400, '{"error":"No path could be found for input"}'));
    await act(async () => result.current.rerouteNow());
    await flush();
    expect(fetchRoute).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe('No path could be found for input');
    expect(result.current.isRerouting).toBe(false);
    await act(async () => result.current.dismissError());
    expect(result.current.error).toBeNull();
  });

  it('exit during start cancels the request and never starts tracking', async () => {
    let resolveRoute!: (r: core.Route) => void;
    fetchRoute.mockReturnValueOnce(new Promise((r) => (resolveRoute = r)));
    const { result } = await renderHook(() => useNavigationSession());
    let starting!: Promise<void>;
    await act(async () => {
      starting = result.current.start(DEST);
    });
    expect(result.current.phase).toBe('starting');
    const signal = fetchRoute.mock.calls[0][0].signal!;

    await act(async () => result.current.stop());
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolveRoute(lRoute());
      await starting;
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.route).toBeUndefined();
    expect(loc.watchPositionAsync).not.toHaveBeenCalled();
  });

  it('shows a friendly error when the route cannot be found', async () => {
    fetchRoute.mockRejectedValueOnce(new core.ServiceError('u', 400, '{"error":"Path distance exceeds the max distance limit: 1500000 meters"}'));
    const { result } = await startedSessionExpectingFailure();
    expect(result.current.phase).toBe('idle');
    expect(result.current.destination).toBeNull();
    expect(result.current.error).toBe('Path distance exceeds the max distance limit: 1500000 meters');
  });

  it('ignores an AbortError from a superseded start', async () => {
    fetchRoute.mockRejectedValueOnce(new core.AbortError('u'));
    const { result } = await startedSessionExpectingFailure();
    expect(result.current.phase).toBe('starting');
    expect(result.current.error).toBeNull();
  });

  it('reports tracking errors', async () => {
    loc.watchPositionAsync.mockRejectedValueOnce(new core.NetworkError('x'));
    const { result } = await startedSession();
    await act(async () => {});
    expect(result.current.error).toBe("Can't reach the server. Check your connection.");
  });

  it('stop resets everything and goes quiet', async () => {
    const { result } = await startedSession();
    await act(async () => result.current.stop());
    expect(result.current).toMatchObject({ phase: 'idle', route: undefined, navState: null, fix: null, destination: null });
    expect(Speech.stop).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });

  it('simulate mode drives along the route without GPS', async () => {
    const { result } = await renderHook(() => useNavigationSession({ simulate: true }));
    await act(async () => result.current.start(DEST));
    expect(loc.watchPositionAsync).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(120_000));
    expect(result.current.phase).toBe('arrived');
  });

  it('cancels and goes quiet on unmount', async () => {
    fetchRoute.mockReturnValueOnce(new Promise(() => {}));
    const { result, unmount } = await renderHook(() => useNavigationSession());
    await act(async () => {
      void result.current.start(DEST);
    });
    const signal = fetchRoute.mock.calls[0][0].signal!;
    await unmount();
    expect(signal.aborted).toBe(true);
    expect(Speech.stop).toHaveBeenCalled();
  });
});

/** Let async work started inside the last act() (e.g. a reroute's fetch) settle and render. */
async function flush() {
  await act(async () => {});
}

async function startedSessionExpectingFailure() {
  const hook = await renderHook(() => useNavigationSession());
  await act(async () => hook.result.current.start(DEST));
  return hook;
}
