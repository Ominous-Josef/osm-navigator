import { hangingFetch, jsonResponse, mockFetch } from "../../__tests__/fetchMock";
import { initOSMNavigator } from "../../config";
import {
  AbortError,
  InvalidResponseError,
  NetworkError,
  ServiceError,
  TimeoutError,
} from "../../errors";
import type { LngLat } from "../../types";
import { buildRoute, fetchRoute } from "../ValhallaClient";
import { isValhallaRouteResponse } from "../guards";
import type { ValhallaLeg, ValhallaRouteResponse } from "../types";
import twoLegs from "./fixtures/valhalla-two-legs.json";

// Real response (Berlin, 3 break locations → 2 legs), trimmed to the fields we read.
const TWO_LEGS = twoLegs as ValhallaRouteResponse;

/** Minimal polyline encoder for synthetic shapes. */
function encode(points: LngLat[], precision = 6): string {
  const factor = 10 ** precision;
  let prevLat = 0;
  let prevLng = 0;
  let out = "";
  const encodeValue = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of points) {
    const iLat = Math.round(lat * factor);
    const iLng = Math.round(lng * factor);
    encodeValue(iLat - prevLat);
    encodeValue(iLng - prevLng);
    prevLat = iLat;
    prevLng = iLng;
  }
  return out;
}

function leg(points: LngLat[], maneuvers: Array<[type: number, begin: number]>): ValhallaLeg {
  return {
    shape: encode(points),
    summary: { length: 1, time: 60 },
    maneuvers: maneuvers.map(([type, begin]) => ({
      type,
      instruction: `type ${type}`,
      length: 0.5,
      time: 30,
      begin_shape_index: begin,
      end_shape_index: begin,
    })),
  };
}

function response(legs: ValhallaLeg[]): ValhallaRouteResponse {
  return { trip: { units: "kilometers", summary: { length: 1.5, time: 90 }, legs } };
}

describe("buildRoute", () => {
  it("flattens a real two-leg response into one geometry and step list", () => {
    const route = buildRoute(TWO_LEGS);

    // 44 + 108 points, minus the shared boundary point.
    expect(route.geometry).toHaveLength(151);
    expect(route.steps).toHaveLength(11);
    expect(route.distanceMeters).toBeCloseTo(2766);
    expect(route.durationSeconds).toBeCloseTo(450.745);
    expect(route.raw).toBe(TWO_LEGS);

    for (const step of route.steps) {
      expect(step.startLocation).toEqual(route.geometry[step.geometryIndex]);
    }
    // Second leg's maneuvers are offset by the first leg's length (44 - 1).
    expect(route.steps.map((s) => s.geometryIndex)).toEqual([0, 2, 37, 39, 43, 43, 49, 53, 123, 138, 150]);
    expect(route.steps.map((s) => s.maneuverType)).toEqual([
      "depart", "left", "left", "left", "arrive",
      "depart", "left", "left", "left", "left", "arrive",
    ]);
    expect(route.steps[0]!.distance).toBeCloseTo(TWO_LEGS.trip.legs[0]!.maneuvers[0]!.length * 1000);
  });

  it("keeps every point when a leg doesn't start at the previous leg's end", () => {
    const route = buildRoute(
      response([
        leg([[0, 0], [0, 0.001]], [[1, 0], [4, 1]]),
        leg([[0, 0.002], [0, 0.003]], [[1, 0], [4, 1]]),
      ]),
    );
    expect(route.geometry).toEqual([[0, 0], [0, 0.001], [0, 0.002], [0, 0.003]]);
    expect(route.steps.map((s) => s.geometryIndex)).toEqual([0, 1, 2, 3]);
  });

  it("throws InvalidResponseError when a maneuver points outside its leg's shape", () => {
    expect(() => buildRoute(response([leg([[0, 0], [0, 0.001]], [[1, 0], [4, 5]])]))).toThrow(
      InvalidResponseError,
    );
  });

  it("throws InvalidResponseError on a corrupt shape", () => {
    const bad = response([leg([[0, 0]], [[1, 0]])]);
    bad.trip.legs[0]!.shape = "_izlhA~rlgd";
    expect(() => buildRoute(bad)).toThrow(InvalidResponseError);
  });
});

describe("isValhallaRouteResponse", () => {
  it("accepts the real response", () => {
    expect(isValhallaRouteResponse(twoLegs)).toBe(true);
  });

  // Loosely typed deep copy so each case can delete or corrupt fields.
  type Loose = Record<string, unknown>;
  type MutableResponse = {
    trip: Loose & {
      summary: Loose;
      legs: Array<Loose & { maneuvers: Loose[] }>;
    };
  };
  const valid = () => JSON.parse(JSON.stringify(twoLegs)) as MutableResponse;

  it.each<[string, (r: MutableResponse) => unknown]>([
    ["null", () => null],
    ["an array", () => []],
    ["no trip", () => ({})],
    ["no trip summary", (r) => ((r.trip.summary = undefined as unknown as Loose), r)],
    ["trip summary without length", (r) => (delete r.trip.summary.length, r)],
    ["no units", (r) => (delete r.trip.units, r)],
    ["no legs", (r) => ((r.trip.legs = []), r)],
    ["legs not an array", (r) => ({ trip: { ...r.trip, legs: {} } })],
    ["a leg without shape", (r) => (delete r.trip.legs[0]!.shape, r)],
    ["a leg without summary", (r) => (delete r.trip.legs[1]!.summary, r)],
    ["maneuvers not an array", (r) => ((r.trip.legs[0]!.maneuvers = null as unknown as Loose[]), r)],
    ["a maneuver with a string type", (r) => ((r.trip.legs[0]!.maneuvers[0]!.type = "1"), r)],
    ["a maneuver without instruction", (r) => (delete r.trip.legs[0]!.maneuvers[0]!.instruction, r)],
    ["a maneuver with NaN length", (r) => ((r.trip.legs[0]!.maneuvers[0]!.length = Number.NaN), r)],
    ["a negative shape index", (r) => ((r.trip.legs[0]!.maneuvers[0]!.begin_shape_index = -1), r)],
    ["a fractional shape index", (r) => ((r.trip.legs[0]!.maneuvers[0]!.end_shape_index = 1.5), r)],
  ])("rejects %s", (_label, mutate) => {
    expect(isValhallaRouteResponse(mutate(valid()))).toBe(false);
  });
});

describe("fetchRoute", () => {
  afterEach(() => initOSMNavigator());

  it("posts the request to {endpoint}/route in kilometers and returns the built route", async () => {
    initOSMNavigator({ valhallaEndpoint: "https://valhalla.example.com/" });
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse(twoLegs)));

    const route = await fetchRoute({
      origin: [13.3777, 52.5163],
      destination: [13.401, 52.52],
      waypoints: [[13.388, 52.517]],
      costing: "bicycle",
    });

    expect(route.steps).toHaveLength(11);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://valhalla.example.com/route");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      locations: [
        { lon: 13.3777, lat: 52.5163, type: "break" },
        { lon: 13.388, lat: 52.517, type: "through" },
        { lon: 13.401, lat: 52.52, type: "break" },
      ],
      costing: "bicycle",
      directions_options: { units: "kilometers" },
    });
  });

  it("defaults to auto costing with no waypoints", async () => {
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse(twoLegs)));
    await fetchRoute({ origin: [0, 0], destination: [1, 1] });
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.costing).toBe("auto");
    expect(body.locations).toHaveLength(2);
  });

  it("throws ServiceError with Valhalla's error body", async () => {
    const body = JSON.stringify({ error_code: 442, error: "No path could be found for input", status_code: 400 });
    mockFetch(jest.fn().mockResolvedValue(new Response(body, { status: 400 })));
    const error = await fetchRoute({ origin: [0, 0], destination: [1, 1] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect((error as ServiceError).status).toBe(400);
    expect((error as ServiceError).body).toContain("No path could be found");
  });

  it("throws InvalidResponseError on a malformed body", async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({ trip: { legs: [] } })));
    await expect(fetchRoute({ origin: [0, 0], destination: [1, 1] })).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });

  it("throws NetworkError when offline", async () => {
    mockFetch(jest.fn().mockRejectedValue(new TypeError("Network request failed")));
    await expect(fetchRoute({ origin: [0, 0], destination: [1, 1] })).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws TimeoutError after the configured timeout", async () => {
    initOSMNavigator({ requestTimeoutMs: 20 });
    mockFetch(hangingFetch());
    await expect(fetchRoute({ origin: [0, 0], destination: [1, 1] })).rejects.toBeInstanceOf(TimeoutError);
  });

  it("throws AbortError when the caller's signal aborts", async () => {
    mockFetch(hangingFetch());
    const controller = new AbortController();
    const promise = fetchRoute({ origin: [0, 0], destination: [1, 1], signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(AbortError);
  });
});
