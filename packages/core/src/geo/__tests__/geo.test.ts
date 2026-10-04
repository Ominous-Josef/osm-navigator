import { at } from "../../__tests__/meters";
import { bearing, cumulativeDistances, haversineDistance, projectOntoSegment } from "..";

describe("haversineDistance", () => {
  it("is zero for the same point", () => {
    expect(haversineDistance([13.4, 52.5], [13.4, 52.5])).toBe(0);
  });

  it("measures one degree of latitude as ~111.2 km", () => {
    expect(haversineDistance([0, 0], [0, 1])).toBeCloseTo(111_195, -1);
  });

  it("matches a known city pair (Berlin → Paris ≈ 878 km)", () => {
    expect(haversineDistance([13.405, 52.52], [2.3522, 48.8566]) / 1000).toBeCloseTo(877.5, 0);
  });

  it("is symmetric", () => {
    const a: [number, number] = [13.4, 52.5];
    const b: [number, number] = [-0.1276, 51.5072];
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6);
  });
});

describe("bearing", () => {
  it.each([
    ["north", at(0, 100), 0],
    ["east", at(100, 0), 90],
    ["south", at(0, -100), 180],
    ["west", at(-100, 0), 270],
  ] as const)("points %s", (_label, to, expected) => {
    expect(bearing(at(0, 0), to)).toBeCloseTo(expected, 1);
  });

  it("returns values in [0, 360)", () => {
    expect(bearing(at(0, 0), at(-1, 100))).toBeGreaterThan(359);
    expect(bearing(at(0, 0), at(-1, 100))).toBeLessThan(360);
  });
});

describe("projectOntoSegment", () => {
  const a = at(0, 0);
  const b = at(100, 0);

  it("projects onto the middle of a segment", () => {
    const r = projectOntoSegment(at(40, 10), a, b);
    expect(r.t).toBeCloseTo(0.4, 3);
    expect(r.distance).toBeCloseTo(10, 1);
    expect(haversineDistance(r.point, at(40, 0))).toBeLessThan(0.1);
  });

  it("clamps before the start and past the end", () => {
    const before = projectOntoSegment(at(-30, 40), a, b);
    expect(before.t).toBe(0);
    expect(before.distance).toBeCloseTo(50, 1);

    const after = projectOntoSegment(at(130, 0), a, b);
    expect(after.t).toBe(1);
    expect(after.distance).toBeCloseTo(30, 1);
  });

  it("handles a zero-length segment", () => {
    const r = projectOntoSegment(at(3, 4), a, a);
    expect(r.t).toBe(0);
    expect(r.point).toEqual(a);
    expect(r.distance).toBeCloseTo(5, 1);
  });
});

describe("cumulativeDistances", () => {
  it("handles empty and single-point lines", () => {
    expect(cumulativeDistances([])).toEqual([]);
    expect(cumulativeDistances([at(0, 0)])).toEqual([0]);
  });

  it("accumulates segment lengths", () => {
    const d = cumulativeDistances([at(0, 0), at(300, 0), at(300, 400)]);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(300, 1);
    expect(d[2]).toBeCloseTo(700, 1);
  });
});
