import { formatDistance, formatDuration } from "../format";

describe("formatDistance", () => {
  it.each<[number, string]>([
    [0, "0 m"],
    [3, "5 m"],
    [42, "40 m"],
    [97, "95 m"],
    [149, "150 m"],
    [994, "990 m"],
    [996, "1 km"],
    [1234, "1.2 km"],
    [9_960, "10 km"],
    [12_345, "12 km"],
  ])("metric: %p m → %p", (meters, expected) => {
    expect(formatDistance(meters, "metric", "en-US")).toBe(expected);
  });

  it.each<[number, string]>([
    [0, "0 ft"],
    [10, "30 ft"],
    [100, "350 ft"],
    [160, "500 ft"],
    [161, "0.1 mi"],
    [1609.344, "1 mi"],
    [2500, "1.6 mi"],
    [20_000, "12 mi"],
  ])("imperial: %p m → %p", (meters, expected) => {
    expect(formatDistance(meters, "imperial", "en-US")).toBe(expected);
  });

  it("defaults to metric", () => {
    expect(formatDistance(1500)).toBe(formatDistance(1500, "metric"));
  });

  it.each([Number.NaN, -10, Number.NEGATIVE_INFINITY])("treats invalid input %p as zero", (v) => {
    expect(formatDistance(v, "metric", "en-US")).toBe("0 m");
  });

  it("uses the locale's decimal separator", () => {
    expect(formatDistance(1234, "metric", "de-DE")).toBe("1,2 km");
  });
});

describe("formatDuration", () => {
  it.each<[number, string]>([
    [0, "<1 min"],
    [29, "<1 min"],
    [30, "1 min"],
    [12 * 60, "12 min"],
    [59 * 60 + 29, "59 min"],
    [59 * 60 + 31, "1 h"],
    [65 * 60, "1 h 5 min"],
    [2 * 3600, "2 h"],
    [Number.NaN, "<1 min"],
    [-5, "<1 min"],
  ])("%p s → %p", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
