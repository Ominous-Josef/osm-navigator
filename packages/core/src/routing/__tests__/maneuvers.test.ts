import type { ManeuverType } from "../../types";
import { mapValhallaManeuverType } from "../maneuvers";

describe("mapValhallaManeuverType", () => {
  it.each<[number, ManeuverType]>([
    [0, "straight"],
    [1, "depart"],
    [2, "depart"],
    [3, "depart"],
    [4, "arrive"],
    [5, "arrive"],
    [6, "arrive"],
    [7, "straight"],
    [8, "straight"],
    [9, "slight-right"],
    [10, "right"],
    [11, "sharp-right"],
    [12, "u-turn"],
    [13, "u-turn"],
    [14, "sharp-left"],
    [15, "left"],
    [16, "slight-left"],
    [17, "straight"],
    [18, "slight-right"],
    [19, "slight-left"],
    [20, "slight-right"],
    [21, "slight-left"],
    [22, "straight"],
    [23, "keep-right"],
    [24, "keep-left"],
    [25, "merge"],
    [26, "roundabout"],
    [27, "roundabout"],
    [28, "ferry"],
    [29, "ferry"],
    [37, "merge"],
    [38, "merge"],
  ])("maps Valhalla type %i to %s", (code, expected) => {
    expect(mapValhallaManeuverType(code)).toBe(expected);
  });

  it.each([30, 35, 39, 43, 99, -1])("falls back to straight for unmapped code %i", (code) => {
    expect(mapValhallaManeuverType(code)).toBe("straight");
  });
});
