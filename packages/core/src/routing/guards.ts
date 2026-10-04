import { isFiniteNumber, isNonNegativeInteger, isRecord } from "../guards";
import type {
  ValhallaLeg,
  ValhallaManeuver,
  ValhallaRouteResponse,
  ValhallaSummary,
} from "./types";

function isSummary(value: unknown): value is ValhallaSummary {
  return isRecord(value) && isFiniteNumber(value.length) && isFiniteNumber(value.time);
}

function isManeuver(value: unknown): value is ValhallaManeuver {
  return (
    isRecord(value) &&
    Number.isInteger(value.type) &&
    typeof value.instruction === "string" &&
    isFiniteNumber(value.length) &&
    isFiniteNumber(value.time) &&
    isNonNegativeInteger(value.begin_shape_index) &&
    isNonNegativeInteger(value.end_shape_index)
  );
}

function isLeg(value: unknown): value is ValhallaLeg {
  return (
    isRecord(value) &&
    typeof value.shape === "string" &&
    isSummary(value.summary) &&
    Array.isArray(value.maneuvers) &&
    value.maneuvers.every(isManeuver)
  );
}

/** Runtime check for the parts of a Valhalla `/route` response that we read. */
export function isValhallaRouteResponse(value: unknown): value is ValhallaRouteResponse {
  if (!isRecord(value) || !isRecord(value.trip)) return false;
  const { trip } = value;
  return (
    isSummary(trip.summary) &&
    typeof trip.units === "string" &&
    Array.isArray(trip.legs) &&
    trip.legs.length > 0 &&
    trip.legs.every(isLeg)
  );
}
