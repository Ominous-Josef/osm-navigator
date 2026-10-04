import { ConfigError } from "../../errors";
import { getConfig, initOSMNavigator, SDK_VERSION } from "../OSMNavigatorConfig";

describe("initOSMNavigator / getConfig", () => {
  afterEach(() => initOSMNavigator());

  it("uses the public defaults", () => {
    initOSMNavigator();
    expect(getConfig()).toEqual({
      valhallaEndpoint: "https://valhalla1.openstreetmap.de",
      photonEndpoint: "https://photon.komoot.io",
      mapStyleURL: "https://tiles.openfreemap.org/styles/liberty",
      requestTimeoutMs: 15_000,
      userAgent: `osm-navigator/${SDK_VERSION}`,
      headers: {},
    });
  });

  it("applies overrides and strips trailing slashes from endpoints", () => {
    initOSMNavigator({
      valhallaEndpoint: "https://valhalla.example.com/",
      photonEndpoint: "http://localhost:2322//",
      requestTimeoutMs: 5000,
      userAgent: "MyApp/1.0",
      headers: { "X-Api-Key": "k" },
    });
    expect(getConfig()).toMatchObject({
      valhallaEndpoint: "https://valhalla.example.com",
      photonEndpoint: "http://localhost:2322",
      requestTimeoutMs: 5000,
      userAgent: "MyApp/1.0",
      headers: { "X-Api-Key": "k" },
    });
  });

  it("treats explicit undefined as 'use the default'", () => {
    initOSMNavigator({ valhallaEndpoint: undefined, requestTimeoutMs: undefined });
    expect(getConfig().valhallaEndpoint).toBe("https://valhalla1.openstreetmap.de");
    expect(getConfig().requestTimeoutMs).toBe(15_000);
  });

  it("resets to defaults on each call", () => {
    initOSMNavigator({ userAgent: "A" });
    initOSMNavigator();
    expect(getConfig().userAgent).toBe(`osm-navigator/${SDK_VERSION}`);
  });

  it.each(["valhalla.example.com", "ftp://example.com", "https://", "", "https://exa mple.com"])(
    "rejects endpoint %p",
    (endpoint) => {
      expect(() => initOSMNavigator({ valhallaEndpoint: endpoint })).toThrow(ConfigError);
      expect(() => initOSMNavigator({ photonEndpoint: endpoint })).toThrow(ConfigError);
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects requestTimeoutMs %p", (ms) => {
    expect(() => initOSMNavigator({ requestTimeoutMs: ms })).toThrow(ConfigError);
  });

  it("rejects an empty mapStyleURL", () => {
    expect(() => initOSMNavigator({ mapStyleURL: "  " })).toThrow(ConfigError);
  });

  it("keeps the previous config when validation fails", () => {
    initOSMNavigator({ userAgent: "Kept" });
    expect(() => initOSMNavigator({ photonEndpoint: "nope" })).toThrow(ConfigError);
    expect(getConfig().userAgent).toBe("Kept");
  });

  it("returns a frozen config that callers cannot mutate", () => {
    initOSMNavigator({ headers: { A: "1" } });
    const config = getConfig();
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.headers)).toBe(true);
  });

  it("does not keep a reference to the caller's headers object", () => {
    const headers: Record<string, string> = { A: "1" };
    initOSMNavigator({ headers });
    headers.A = "2";
    expect(getConfig().headers.A).toBe("1");
  });
});
