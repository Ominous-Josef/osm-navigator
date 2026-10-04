import { at, makeRoute } from "../../__tests__/meters";
import { ConfigError } from "../../errors";
import { haversineDistance } from "../../geo";
import { buildRoute } from "../../routing/ValhallaClient";
import twoLegs from "../../routing/__tests__/fixtures/valhalla-two-legs.json";
import type { ValhallaRouteResponse } from "../../routing/types";
import { NavigationEngine } from "../NavigationEngine";
import type { NavigationEngineOptions, NavigationState } from "../types";

/** 1 km due east: depart → arrive. */
const straight = () =>
  makeRoute([[0, 0], [1000, 0]], [
    { at: 0, type: "depart", duration: 100 },
    { at: 1, type: "arrive" },
  ]);

/** 500 m east, then left and 500 m north. */
const lTurn = () =>
  makeRoute([[0, 0], [500, 0], [500, 500]], [
    { at: 0, type: "depart", duration: 50 },
    { at: 1, type: "left", duration: 50 },
    { at: 2, type: "arrive" },
  ]);

/** 500 m east and straight back along the same road: origin == destination. */
const outAndBack = () =>
  makeRoute([[0, 0], [500, 0], [0, 0]], [
    { at: 0, type: "depart", duration: 50 },
    { at: 1, type: "u-turn", duration: 50 },
    { at: 2, type: "arrive" },
  ]);

function drive(engine: NavigationEngine, points: Array<[number, number]>): NavigationState[] {
  return points.map(([x, y]) => engine.update(at(x, y)));
}

function spies() {
  return {
    onStepChange: jest.fn(),
    onArrive: jest.fn(),
    onOffRouteChange: jest.fn(),
  } satisfies NavigationEngineOptions;
}

describe("NavigationEngine", () => {
  describe("initial state", () => {
    it("starts at the beginning of the first step", () => {
      const route = lTurn();
      const { state } = new NavigationEngine(route);
      expect(state).toMatchObject({
        route,
        currentStepIndex: 0,
        progress: 0,
        isOffRoute: false,
        isArrived: false,
        distanceFromRouteMeters: 0,
        snappedPosition: route.geometry[0],
      });
      expect(state.distanceToNextStepMeters).toBeCloseTo(500, 0);
      expect(state.distanceRemainingMeters).toBeCloseTo(1000, 0);
      expect(state.timeRemainingSeconds).toBeCloseTo(100, 5);
      expect(state.routeBearing).toBeCloseTo(90, 0);
    });
  });

  describe("straight route", () => {
    it("snaps a nearby fix onto the route and measures along it", () => {
      const engine = new NavigationEngine(straight());
      const s = engine.update(at(250, 5));
      expect(s.progress).toBeCloseTo(0.25, 3);
      expect(s.distanceRemainingMeters).toBeCloseTo(750, 0);
      expect(s.distanceToNextStepMeters).toBeCloseTo(750, 0);
      expect(s.distanceFromRouteMeters).toBeCloseTo(5, 1);
      expect(haversineDistance(s.snappedPosition, at(250, 0))).toBeLessThan(0.5);
      expect(s.timeRemainingSeconds).toBeCloseTo(75, 0);
      expect(engine.state).toBe(s);
    });
  });

  describe("L-turn", () => {
    it("measures distance to the turn along the road and fires onStepChange once", () => {
      const cb = spies();
      const engine = new NavigationEngine(lTurn(), cb);

      const before = engine.update(at(400, 0));
      expect(before.currentStepIndex).toBe(0);
      expect(before.distanceToNextStepMeters).toBeCloseTo(100, 0);
      expect(before.timeRemainingSeconds).toBeCloseTo(60, 0);
      expect(cb.onStepChange).not.toHaveBeenCalled();

      const after = engine.update(at(500, 100));
      expect(after.currentStepIndex).toBe(1);
      expect(after.distanceToNextStepMeters).toBeCloseTo(400, 0);
      expect(after.distanceRemainingMeters).toBeCloseTo(400, 0);
      expect(after.routeBearing).toBeCloseTo(0, 0);
      expect(cb.onStepChange).toHaveBeenCalledTimes(1);
      expect(cb.onStepChange).toHaveBeenCalledWith(engine.route.steps[1], 1, after);

      engine.update(at(500, 200));
      expect(cb.onStepChange).toHaveBeenCalledTimes(1);
    });

    it("measures along the route, not in a straight line, on curved roads", () => {
      // From (100, 0), the turn at (500, 0) is 400 m away and the destination 900 m
      // along the road, but only ~640 m in a straight line.
      const s = new NavigationEngine(lTurn()).update(at(100, 0));
      expect(s.distanceRemainingMeters).toBeCloseTo(900, 0);
    });

    it("reports only the latest step when a GPS gap skips several", () => {
      const cb = spies();
      const route = makeRoute([[0, 0], [100, 0], [200, 0], [300, 0], [1000, 0]], [
        { at: 0, type: "depart" },
        { at: 1, type: "straight" },
        { at: 2, type: "keep-left" },
        { at: 3, type: "keep-right" },
        { at: 4, type: "arrive" },
      ]);
      const engine = new NavigationEngine(route, cb);
      engine.update(at(350, 0));
      expect(cb.onStepChange).toHaveBeenCalledTimes(1);
      expect(cb.onStepChange.mock.calls[0][1]).toBe(3);
    });
  });

  describe("routes that come back near themselves", () => {
    it("never moves progress backward on an out-and-back route", () => {
      const engine = new NavigationEngine(outAndBack());
      const states = drive(engine, [
        [0, 0], [100, 0], [200, 0], [300, 0], [400, 0], [480, 0],
        [500, 0], [450, 0], [400, 0], [300, 0], [200, 0], [100, 0],
      ]);
      const progress = states.map((s) => s.progress);
      for (let i = 1; i < progress.length; i++) expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1]!);

      // Outbound at x=400 is 400 m along; on the way back it is 600 m along.
      expect(states[4]!.distanceRemainingMeters).toBeCloseTo(600, 0);
      expect(states[8]!.distanceRemainingMeters).toBeCloseTo(400, 0);
      expect(states[8]!.currentStepIndex).toBe(1);
      expect(states.every((s) => !s.isOffRoute)).toBe(true);
    });

    it("does not arrive at the start of a route that ends where it begins", () => {
      const s = new NavigationEngine(outAndBack()).update(at(0, 0));
      expect(s.isArrived).toBe(false);
      expect(s.progress).toBe(0);
    });

    it("keeps the earlier pass where a route crosses itself, even with a long look-ahead", () => {
      // East 400, north 200, west 200, then south through the first segment at (200, 0).
      const route = makeRoute([[0, 0], [400, 0], [400, 200], [200, 200], [200, -300]], [
        { at: 0, type: "depart" },
        { at: 1, type: "left" },
        { at: 2, type: "left" },
        { at: 3, type: "left" },
        { at: 4, type: "arrive" },
      ]);
      const engine = new NavigationEngine(route, { lookAheadMeters: 5000 });
      // Total 1300 m; the first pass through (200, 0) is 200 m along.
      expect(engine.update(at(200, 0)).distanceRemainingMeters).toBeCloseTo(1100, 0);
      // Later, crossing the same spot heading south, 1000 m along.
      drive(engine, [[400, 0], [400, 200], [200, 200], [200, 100]]);
      expect(engine.update(at(200, 0)).distanceRemainingMeters).toBeCloseTo(300, 0);
    });

    it("ignores parts of the route beyond the look-ahead window", () => {
      // A fix right on a segment 1 km further along doesn't snap there.
      const route = makeRoute([[0, 0], [600, 0], [600, 60], [0, 60], [0, 2000]], [
        { at: 0, type: "depart" },
        { at: 4, type: "arrive" },
      ]);
      const engine = new NavigationEngine(route, { lookAheadMeters: 200 });
      const s = engine.update(at(300, 60));
      expect(s.progress).toBe(0);
      expect(s.distanceFromRouteMeters).toBeGreaterThan(30);
    });
  });

  describe("GPS jitter", () => {
    it("keeps progress monotonic and stays on route with lateral and backward noise", () => {
      const cb = spies();
      const engine = new NavigationEngine(straight(), cb);
      const fixes: Array<[number, number]> = [];
      for (let x = 0; x <= 900; x += 10) {
        fixes.push([x, x % 20 === 0 ? 8 : -8]);
        if (x % 50 === 0) fixes.push([x - 6, 0]); // occasional backward jump
      }
      const states = drive(engine, fixes);
      for (let i = 1; i < states.length; i++) {
        expect(states[i]!.progress).toBeGreaterThanOrEqual(states[i - 1]!.progress);
      }
      expect(cb.onOffRouteChange).not.toHaveBeenCalled();
      expect(cb.onStepChange).not.toHaveBeenCalled();
      expect(states.at(-1)!.distanceRemainingMeters).toBeCloseTo(100, 0);
    });
  });

  describe("off-route detection", () => {
    it("needs consecutive far fixes, then uses hysteresis to rejoin", () => {
      const cb = spies();
      const engine = new NavigationEngine(straight(), cb);
      engine.update(at(100, 0));

      expect(engine.update(at(150, 50)).isOffRoute).toBe(false);
      expect(engine.update(at(160, 50)).isOffRoute).toBe(false);
      const off = engine.update(at(170, 50));
      expect(off.isOffRoute).toBe(true);
      expect(cb.onOffRouteChange).toHaveBeenCalledTimes(1);
      expect(cb.onOffRouteChange).toHaveBeenLastCalledWith(true, off);
      // Progress doesn't advance on far-off fixes.
      expect(off.distanceRemainingMeters).toBeCloseTo(900, 0);

      engine.update(at(180, 60));
      expect(cb.onOffRouteChange).toHaveBeenCalledTimes(1);

      // Between the on-route (15 m) and off-route (30 m) thresholds: still off-route.
      expect(engine.update(at(190, 20)).isOffRoute).toBe(true);

      const back = engine.update(at(200, 10));
      expect(back.isOffRoute).toBe(false);
      expect(cb.onOffRouteChange).toHaveBeenCalledTimes(2);
      expect(cb.onOffRouteChange).toHaveBeenLastCalledWith(false, back);
    });

    it("ignores a single GPS spike", () => {
      const cb = spies();
      const engine = new NavigationEngine(straight(), cb);
      drive(engine, [[100, 0], [110, 200], [120, 0], [130, 300], [140, 0]]);
      expect(cb.onOffRouteChange).not.toHaveBeenCalled();
      expect(engine.state.isOffRoute).toBe(false);
    });

    it("does not arrive while off-route", () => {
      const engine = new NavigationEngine(straight(), { offRouteConfirmations: 1 });
      const s = engine.update(at(1000, 25.5 + 10));
      expect(s.isOffRoute).toBe(true);
      expect(s.isArrived).toBe(false);
    });
  });

  describe("arrival", () => {
    it("latches: onArrive fires once and later fixes are ignored", () => {
      const cb = spies();
      const engine = new NavigationEngine(lTurn(), cb);
      drive(engine, [[200, 0], [500, 100], [500, 300]]);
      expect(cb.onArrive).not.toHaveBeenCalled();

      const arrived = engine.update(at(500, 485));
      expect(arrived).toMatchObject({
        isArrived: true,
        progress: 1,
        distanceRemainingMeters: 0,
        distanceToNextStepMeters: 0,
        timeRemainingSeconds: 0,
        currentStepIndex: 2,
      });
      expect(cb.onArrive).toHaveBeenCalledTimes(1);
      expect(cb.onArrive).toHaveBeenCalledWith(arrived);
      expect(cb.onStepChange).toHaveBeenLastCalledWith(engine.route.steps[2], 2, arrived);

      const stepCalls = cb.onStepChange.mock.calls.length;
      expect(engine.update(at(0, 0))).toBe(arrived);
      expect(engine.update(at(500, 500))).toBe(arrived);
      expect(cb.onArrive).toHaveBeenCalledTimes(1);
      expect(cb.onStepChange).toHaveBeenCalledTimes(stepCalls);
    });

    it("arrives near a destination that never snaps close (off the road)", () => {
      const engine = new NavigationEngine(straight(), {
        offRouteThresholdMeters: 10,
        onRouteThresholdMeters: 5,
        arrivalThresholdMeters: 30,
      });
      engine.update(at(900, 0));
      // 20 m beside the destination: too far from the road to advance progress.
      const s = engine.update(at(1000, 20));
      expect(s.isArrived).toBe(true);
    });

    it("does not end early on a route that passes near its destination long before the end", () => {
      // Destination (0, 10) is 10 m from the start, but 2 km away along the route.
      const route = makeRoute([[0, 0], [1000, 0], [1000, 10], [0, 10]], [
        { at: 0, type: "depart" },
        { at: 3, type: "arrive" },
      ]);
      const s = new NavigationEngine(route).update(at(0, 5));
      expect(s.isArrived).toBe(false);
    });
  });

  describe("real Valhalla route (two legs)", () => {
    it("walks the whole route in order, without latching the mid-route arrive step", () => {
      const route = buildRoute(twoLegs as ValhallaRouteResponse);
      const cb = spies();
      const engine = new NavigationEngine(route, cb);

      let last: NavigationState = engine.state;
      for (const point of route.geometry.slice(1)) {
        const s = engine.update(point);
        if (!s.isArrived) {
          expect(s.progress).toBeGreaterThanOrEqual(last.progress);
          expect(s.isOffRoute).toBe(false);
        }
        last = s;
      }

      expect(last.isArrived).toBe(true);
      expect(cb.onArrive).toHaveBeenCalledTimes(1);
      const visited = cb.onStepChange.mock.calls.map((c) => c[1] as number);
      expect(visited).toEqual([...visited].sort((a, b) => a - b));
      expect(visited.at(-1)).toBe(route.steps.length - 1);
      // The first leg's "arrive" (step 4) shares its start with the second leg's "depart".
      expect(visited).not.toContain(4);
    });
  });

  describe("edge cases", () => {
    it("handles a route without steps, estimating time from the route duration", () => {
      const route = { ...straight(), steps: [], durationSeconds: 200 };
      const cb = spies();
      const engine = new NavigationEngine(route, cb);
      const s = engine.update(at(500, 0));
      expect(s.currentStepIndex).toBe(0);
      expect(s.timeRemainingSeconds).toBeCloseTo(100, 0);
      expect(s.distanceToNextStepMeters).toBeCloseTo(500, 0);
      engine.update(at(1000, 0));
      expect(cb.onStepChange).not.toHaveBeenCalled();
      expect(cb.onArrive).toHaveBeenCalledTimes(1);
    });

    it("handles a single-point route", () => {
      const route = makeRoute([[0, 0]], [{ at: 0, type: "arrive" }]);
      const engine = new NavigationEngine(route);
      expect(engine.state.progress).toBe(0);
      expect(engine.state.timeRemainingSeconds).toBe(0);
      expect(engine.update(at(0, 100)).isArrived).toBe(false);
      const s = engine.update(at(0, 5));
      expect(s.isArrived).toBe(true);
      expect(s.progress).toBe(1);
    });

    it("handles zero-duration routes without steps", () => {
      const route = { ...makeRoute([[0, 0]], []), durationSeconds: 0 };
      expect(new NavigationEngine(route).state.timeRemainingSeconds).toBe(0);
    });

    it("rejects a route with no geometry", () => {
      expect(() => new NavigationEngine({ ...straight(), geometry: [] })).toThrow(ConfigError);
    });

    it.each<[string, NavigationEngineOptions]>([
      ["a negative threshold", { offRouteThresholdMeters: -1 }],
      ["a zero look-ahead", { lookAheadMeters: 0 }],
      ["NaN arrival threshold", { arrivalThresholdMeters: Number.NaN }],
      ["fractional confirmations", { offRouteConfirmations: 1.5 }],
      ["on-route above off-route", { onRouteThresholdMeters: 40, offRouteThresholdMeters: 30 }],
    ])("rejects %s", (_label, options) => {
      expect(() => new NavigationEngine(straight(), options)).toThrow(ConfigError);
    });
  });
});
