import { hangingFetch, jsonResponse, mockFetch } from "../../__tests__/fetchMock";
import { initOSMNavigator } from "../../config";
import {
  AbortError,
  InvalidResponseError,
  NetworkError,
  ServiceError,
  TimeoutError,
} from "../../errors";
import { geocode, reverseGeocode } from "../PhotonClient";
import { isPhotonResponse } from "../guards";
import search from "./fixtures/photon-search.json";

// Real response for "Brandenburger Tor", trimmed to the fields we read.

function calledUrl(fetch: jest.Mock): URL {
  return new URL(fetch.mock.calls[0][0] as string);
}

function feature(properties: Record<string, unknown>, coordinates: unknown = [13.4, 52.5]) {
  return { type: "Feature", geometry: { type: "Point", coordinates }, properties };
}

describe("geocode", () => {
  afterEach(() => initOSMNavigator());

  it("calls {endpoint}/api with query and limit, and maps features to results", async () => {
    initOSMNavigator({ photonEndpoint: "https://photon.example.com/" });
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse(search)));

    const results = await geocode({ query: "Brandenburger Tor" });

    const url = calledUrl(fetch);
    expect(url.origin + url.pathname).toBe("https://photon.example.com/api");
    expect(url.searchParams.get("q")).toBe("Brandenburger Tor");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.has("lat")).toBe(false);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      name: "Brandenburger Tor",
      address: "1 Pariser Platz, Berlin, Deutschland",
      coordinates: [13.3777034, 52.5162699],
      type: "house",
    });
    expect(results[1]!.address).toBe("Unter den Linden, Berlin, Deutschland");
    expect(results[0]!.raw).toEqual(search.features[0]);
  });

  it("passes limit and location bias", async () => {
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse({ type: "FeatureCollection", features: [] })));
    await geocode({ query: "cafe", limit: 3, locationBias: [13.4, 52.52] });
    const params = calledUrl(fetch).searchParams;
    expect(params.get("limit")).toBe("3");
    expect(params.get("lon")).toBe("13.4");
    expect(params.get("lat")).toBe("52.52");
  });

  it("returns an empty list when nothing matches", async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({ type: "FeatureCollection", features: [] })));
    await expect(geocode({ query: "zzzz" })).resolves.toEqual([]);
  });

  it("falls back for missing name, type and address parts", async () => {
    mockFetch(
      jest.fn().mockResolvedValue(
        jsonResponse({
          features: [
            feature({ street: "Main St", state: "Lagos", osm_type: "W" }),
            feature({}),
          ],
        }),
      ),
    );
    const [withStreet, empty] = await geocode({ query: "x" });
    expect(withStreet).toMatchObject({ name: "Main St", address: "Main St, Lagos", type: "W" });
    expect(empty).toMatchObject({ name: "Unknown", address: "", type: "place" });
  });

  it("throws ServiceError on HTTP errors", async () => {
    mockFetch(jest.fn().mockResolvedValue(new Response("bad request", { status: 400 })));
    await expect(geocode({ query: "x" })).rejects.toBeInstanceOf(ServiceError);
  });

  it("throws InvalidResponseError on a malformed body", async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({ features: [feature({}, [13.4])] })));
    await expect(geocode({ query: "x" })).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("throws NetworkError when offline", async () => {
    mockFetch(jest.fn().mockRejectedValue(new TypeError("Network request failed")));
    await expect(geocode({ query: "x" })).rejects.toBeInstanceOf(NetworkError);
  });

  it("throws TimeoutError after the configured timeout", async () => {
    initOSMNavigator({ requestTimeoutMs: 20 });
    mockFetch(hangingFetch());
    await expect(geocode({ query: "x" })).rejects.toBeInstanceOf(TimeoutError);
  });

  it("throws AbortError when the caller's signal aborts", async () => {
    mockFetch(hangingFetch());
    const controller = new AbortController();
    const promise = geocode({ query: "x", signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(AbortError);
  });
});

describe("reverseGeocode", () => {
  afterEach(() => initOSMNavigator());

  it("calls {endpoint}/reverse with coordinates and a default limit of 1", async () => {
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse(search)));
    const results = await reverseGeocode({ coordinates: [13.3777, 52.5163] });

    const url = calledUrl(fetch);
    expect(url.origin + url.pathname).toBe("https://photon.komoot.io/reverse");
    expect(url.searchParams.get("lon")).toBe("13.3777");
    expect(url.searchParams.get("lat")).toBe("52.5163");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(results[0]!.name).toBe("Brandenburger Tor");
  });

  it("passes a custom limit and signal", async () => {
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse(search)));
    const controller = new AbortController();
    await reverseGeocode({ coordinates: [0, 0], limit: 4, signal: controller.signal });
    expect(calledUrl(fetch).searchParams.get("limit")).toBe("4");
  });
});

describe("isPhotonResponse", () => {
  it("accepts the real response", () => {
    expect(isPhotonResponse(search)).toBe(true);
  });

  it.each<[string, unknown]>([
    ["null", null],
    ["no features", {}],
    ["features not an array", { features: {} }],
    ["a feature without geometry", { features: [{ properties: {} }] }],
    ["a feature without properties", { features: [{ geometry: { type: "Point", coordinates: [1, 2] } }] }],
    ["a non-Point geometry", { features: [{ geometry: { type: "LineString", coordinates: [1, 2] }, properties: {} }] }],
    ["coordinates of the wrong length", { features: [feature({}, [1, 2, 3])] }],
    ["non-numeric coordinates", { features: [feature({}, ["1", 2])] }],
    ["a non-string name", { features: [feature({ name: 42 })] }],
    ["a non-string city", { features: [feature({ city: ["Berlin"] })] }],
  ])("rejects %s", (_label, value) => {
    expect(isPhotonResponse(value)).toBe(false);
  });

  it("allows extra and numeric non-address properties like osm_id", () => {
    expect(isPhotonResponse({ features: [feature({ osm_id: 123, extent: [1, 2, 3, 4] })] })).toBe(true);
  });
});
