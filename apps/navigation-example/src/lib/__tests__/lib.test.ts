import {
  AbortError,
  InvalidResponseError,
  NetworkError,
  ServiceError,
  TimeoutError,
  haversineDistance,
  type NavigationState,
  type Route,
} from '@osm-navigator/core';
import * as Location from 'expo-location';
import { bearingDelta, smoothBearing } from '../bearing';
import { describeError } from '../errors';
import {
  type Fix,
  getStartPosition,
  isMoving,
  isUsableFix,
  LocationUnavailableError,
  signalQuality,
  steadyFix,
  toFix,
  withTimeout,
} from '../location';
import { upcomingManeuver } from '../maneuver';
import { pointAlong, prepareLine } from '../simulate';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));
const mockedLocation = jest.mocked(Location);

function location(lng: number, lat: number, extra: Partial<Location.LocationObjectCoords> = {}): Location.LocationObject {
  return {
    timestamp: 1,
    coords: { longitude: lng, latitude: lat, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: 90, speed: 3, ...extra },
  };
}

describe('bearing', () => {
  it.each([
    [10, 20, 10],
    [350, 10, 20],
    [10, 350, -20],
    [0, 180, 180],
  ])('bearingDelta(%p, %p) = %p', (a, b, d) => expect(bearingDelta(a, b)).toBe(d));

  it('ignores small changes and follows large ones', () => {
    expect(smoothBearing(undefined, 42)).toBe(42);
    expect(smoothBearing(90, 95)).toBe(90);
    expect(smoothBearing(358, 3)).toBe(358);
    expect(smoothBearing(90, 120)).toBe(120);
    expect(smoothBearing(90, 95, 2)).toBe(95);
  });
});

describe('describeError', () => {
  it.each<[unknown, string]>([
    [new NetworkError('x'), "Can't reach the server. Check your connection."],
    [new TimeoutError('u', 1), 'The server took too long to answer. Try again.'],
    [new InvalidResponseError('x'), 'The server sent an unexpected answer. Try again later.'],
    [new ServiceError('u', 400, '{"error_code":154,"error":"Path distance exceeds the max distance limit"}'), 'Path distance exceeds the max distance limit'],
    [new ServiceError('u', 400, '{"message":"bad query"}'), 'bad query'],
    [new ServiceError('u', 502, '<html>Bad gateway</html>'), 'The server returned an error (HTTP 502).'],
    [new ServiceError('u', 500, '{"code":1}'), 'The server returned an error (HTTP 500).'],
    [new ServiceError('u', 429, '{"error":"slow down"}'), 'Too many requests. Wait a moment and try again.'],
    [new AbortError('u'), 'Request to u was aborted'],
    ['plain', 'plain'],
  ])('%p', (error, message) => expect(describeError(error)).toBe(message));
});

describe('location helpers', () => {
  it('toFix maps coordinates and drops invalid speed/heading', () => {
    expect(toFix(location(3, 4))).toEqual({ position: [3, 4], speed: 3, heading: 90, accuracy: 5, timestamp: 1 });
    expect(toFix(location(3, 4, { speed: -1, heading: -1, accuracy: null }))).toMatchObject({ speed: null, heading: null, accuracy: null });
    expect(toFix(location(3, 4, { speed: null, heading: null }))).toMatchObject({ speed: null, heading: null });
  });

  it('withTimeout resolves, rejects, or times out', async () => {
    await expect(withTimeout(Promise.resolve(1), 50, () => new Error('t'))).resolves.toBe(1);
    await expect(withTimeout(Promise.reject(new Error('boom')), 50, () => new Error('t'))).rejects.toThrow('boom');
    await expect(withTimeout(new Promise(() => {}), 10, () => new Error('timeout'))).rejects.toThrow('timeout');
  });

  it('getStartPosition prefers a fresh fix', async () => {
    mockedLocation.getCurrentPositionAsync.mockResolvedValue(location(5.7, 5.5));
    await expect(getStartPosition()).resolves.toEqual([5.7, 5.5]);
  });

  it('getStartPosition falls back to the last known position on timeout', async () => {
    mockedLocation.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
    mockedLocation.getLastKnownPositionAsync.mockResolvedValue(location(1, 2));
    await expect(getStartPosition(10)).resolves.toEqual([1, 2]);
    expect(mockedLocation.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 300_000 });
  });

  it('getStartPosition fails clearly when there is no position at all', async () => {
    mockedLocation.getCurrentPositionAsync.mockRejectedValue(new Error('GPS off'));
    mockedLocation.getLastKnownPositionAsync.mockResolvedValue(null);
    await expect(getStartPosition()).rejects.toBeInstanceOf(LocationUnavailableError);
  });
});

describe('upcomingManeuver', () => {
  const steps = ['Drive south.', 'Turn right.', 'Turn left.', 'You have arrived.'].map((instruction, i) => ({
    instruction,
    maneuverType: (['depart', 'right', 'left', 'arrive'] as const)[i],
    distance: 0,
    duration: 0,
    startLocation: [0, 0] as [number, number],
    geometryIndex: i,
  }));
  const state = (currentStepIndex: number, routeSteps = steps) =>
    ({ route: { steps: routeSteps } as unknown as Route, currentStepIndex, distanceToNextStepMeters: 93 }) as NavigationState;

  it('is the next step, with the one after as "then"', () => {
    expect(upcomingManeuver(state(0))).toEqual({ instruction: 'Turn right.', type: 'right', distanceMeters: 93, thenInstruction: 'Turn left.' });
    expect(upcomingManeuver(state(2))).toEqual({ instruction: 'You have arrived.', type: 'arrive', distanceMeters: 93, thenInstruction: undefined });
  });

  it('falls back to the current step on the last one, and nothing without steps', () => {
    expect(upcomingManeuver(state(3))).toMatchObject({ instruction: 'You have arrived.', type: 'arrive' });
    expect(upcomingManeuver(state(0, []))).toBeUndefined();
  });
});

describe('simulate.pointAlong', () => {
  const line: [number, number][] = [[0, 0], [0, 0.001], [0.001, 0.001]];
  const prepared = prepareLine(line);
  const first = haversineDistance(line[0], line[1]);

  it('interpolates within segments and reports their heading', () => {
    const mid = pointAlong(prepared, first / 2);
    expect(mid.position[1]).toBeCloseTo(0.0005, 6);
    expect(mid.heading).toBeCloseTo(0, 3);
    expect(mid.done).toBe(false);
    expect(pointAlong(prepared, first + 1).heading).toBeCloseTo(90, 1);
    expect(pointAlong(prepared, -5).position).toEqual([0, 0]);
  });

  it('stops at the end', () => {
    expect(pointAlong(prepared, 1e9)).toMatchObject({ position: [0.001, 0.001], done: true });
    expect(pointAlong(prepareLine([[1, 1]]), 0)).toEqual({ position: [1, 1], heading: 0, done: true });
  });
});

describe('GPS signal quality', () => {
  it.each([
    [3, 'good'],
    [20, 'good'],
    [21, 'weak'],
    [50, 'weak'],
    [51, 'poor'],
    [null, 'weak'],
    [undefined, 'weak'],
  ] as const)('accuracy %p → %s', (accuracy, quality) => {
    expect(signalQuality(accuracy)).toBe(quality);
  });

  it('uses fixes up to 50 m, or of unknown accuracy', () => {
    const fix = (accuracy: number | null) => ({ position: [0, 0] as [number, number], speed: null, heading: null, accuracy, timestamp: 0 });
    expect(isUsableFix(fix(50))).toBe(true);
    expect(isUsableFix(fix(null))).toBe(true);
    expect(isUsableFix(fix(51))).toBe(false);
  });
});

describe('movement and drift', () => {
  const f = (over: Partial<Fix> = {}): Fix => ({ position: [5.7, 5.5], speed: 0, heading: null, accuracy: 10, timestamp: 0, ...over });
  // ~1.1 m per 0.00001° of latitude.
  const north = (meters: number): [number, number] => [5.7, 5.5 + meters / 111_195];

  it('only counts as moving with speed, a course and a trustworthy fix', () => {
    expect(isMoving(f({ speed: 5, heading: 90 }))).toBe(true);
    expect(isMoving(f({ speed: 5, heading: 90, accuracy: null }))).toBe(true);
    expect(isMoving(f({ speed: 1, heading: 90 }))).toBe(false);
    expect(isMoving(f({ speed: 5, heading: null }))).toBe(false);
    expect(isMoving(f({ speed: null, heading: 90 }))).toBe(false);
    // Indoors: Wi-Fi fixes hop around with made-up speeds.
    expect(isMoving(f({ speed: 5, heading: 90, accuracy: 40 }))).toBe(false);
    expect(isMoving(null)).toBe(false);
  });

  it('holds the position against drift inside the uncertainty', () => {
    const first = f();
    expect(steadyFix(null, first)).toBe(first);
    const held = steadyFix(first, f({ position: north(8), accuracy: 12, speed: 1.5, heading: 45, timestamp: 1 }));
    expect(held).toEqual({ position: first.position, accuracy: 12, speed: 0, heading: null, timestamp: 1 });
    // Small moves below the 5 m floor are held even with a tighter fix.
    expect(steadyFix(first, f({ position: north(4), accuracy: 6 })).position).toBe(first.position);
  });

  it('follows moves beyond the uncertainty, much better fixes, and real movement', () => {
    const first = f();
    const far = f({ position: north(15) });
    expect(steadyFix(first, far)).toBe(far);
    const better = f({ position: north(3), accuracy: 4 });
    expect(steadyFix(first, better)).toBe(better);
    const driving = f({ position: north(3), speed: 10, heading: 0, accuracy: 5 });
    expect(steadyFix(first, driving)).toBe(driving);
    const unknown = f({ position: north(3), accuracy: null });
    expect(steadyFix({ ...first, accuracy: null }, unknown).position).toBe(first.position);
  });
});
