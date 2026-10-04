import type { ManeuverType } from "../types";

/**
 * Valhalla integer maneuver types → shared `ManeuverType`.
 * Codes not listed (transit, elevators, building entry…) map to "straight".
 *
 * Reference: https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/#maneuver-types
 */
const VALHALLA_MANEUVERS: Readonly<Record<number, ManeuverType>> = {
  0: "straight",       // kNone
  1: "depart",         // kStart
  2: "depart",         // kStartRight
  3: "depart",         // kStartLeft
  4: "arrive",         // kDestination
  5: "arrive",         // kDestinationRight
  6: "arrive",         // kDestinationLeft
  7: "straight",       // kBecomes
  8: "straight",       // kContinue
  9: "slight-right",   // kSlightRight
  10: "right",         // kRight
  11: "sharp-right",   // kSharpRight
  12: "u-turn",        // kUturnRight
  13: "u-turn",        // kUturnLeft
  14: "sharp-left",    // kSharpLeft
  15: "left",          // kLeft
  16: "slight-left",   // kSlightLeft
  17: "straight",      // kRampStraight
  18: "slight-right",  // kRampRight
  19: "slight-left",   // kRampLeft
  20: "slight-right",  // kExitRight
  21: "slight-left",   // kExitLeft
  22: "straight",      // kStayStraight
  23: "keep-right",    // kStayRight
  24: "keep-left",     // kStayLeft
  25: "merge",         // kMerge
  26: "roundabout",    // kRoundaboutEnter
  27: "roundabout",    // kRoundaboutExit
  28: "ferry",         // kFerryEnter
  29: "ferry",         // kFerryExit
  37: "merge",         // kMergeRight
  38: "merge",         // kMergeLeft
};

export function mapValhallaManeuverType(type: number): ManeuverType {
  return VALHALLA_MANEUVERS[type] ?? "straight";
}
