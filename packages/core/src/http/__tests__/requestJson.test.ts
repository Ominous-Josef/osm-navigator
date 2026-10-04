import { hangingFetch, jsonResponse, mockFetch } from "../../__tests__/fetchMock";
import { initOSMNavigator, SDK_VERSION } from "../../config";
import {
  AbortError,
  InvalidResponseError,
  NetworkError,
  ServiceError,
  TimeoutError,
} from "../../errors";
import { requestJson } from "../requestJson";

const URL = "https://service.example.com/thing";
const isThing = (v: unknown): v is { ok: true } =>
  typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true;

describe("requestJson", () => {
  afterEach(() => initOSMNavigator());

  it("returns the parsed body when the guard accepts it", async () => {
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse({ ok: true })));
    await expect(requestJson(URL, {}, isThing)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(URL, expect.objectContaining({ method: "GET" }));
  });

  it("sends the configured User-Agent, extra headers and per-request headers", async () => {
    initOSMNavigator({ userAgent: "MyApp/2.0", headers: { "X-Api-Key": "secret" } });
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse({ ok: true })));

    await requestJson(URL, { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } }, isThing);

    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    expect(init.headers).toEqual({
      Accept: "application/json",
      "User-Agent": "MyApp/2.0",
      "X-Api-Key": "secret",
      "Content-Type": "application/json",
    });
  });

  it("defaults the User-Agent to the SDK name and version", async () => {
    const fetch = mockFetch(jest.fn().mockResolvedValue(jsonResponse({ ok: true })));
    await requestJson(URL, {}, isThing);
    expect((fetch.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      "User-Agent": `osm-navigator/${SDK_VERSION}`,
    });
  });

  it("throws ServiceError with status and (truncated) body on non-2xx", async () => {
    mockFetch(jest.fn().mockResolvedValue(new Response("x".repeat(2000), { status: 503 })));
    const error = await requestJson(URL, {}, isThing).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect((error as ServiceError).status).toBe(503);
    expect((error as ServiceError).body).toHaveLength(500);
  });

  it("still throws ServiceError when the error body can't be read", async () => {
    const response = new Response(null, { status: 500 });
    jest.spyOn(response, "text").mockRejectedValue(new Error("stream broke"));
    mockFetch(jest.fn().mockResolvedValue(response));
    const error = await requestJson(URL, {}, isThing).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect((error as ServiceError).body).toBe("");
  });

  it("throws NetworkError (keeping the cause) when fetch rejects", async () => {
    const cause = new TypeError("Network request failed");
    mockFetch(jest.fn().mockRejectedValue(cause));
    const error = await requestJson(URL, {}, isThing).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).cause).toBe(cause);
  });

  it("throws InvalidResponseError when the body is not JSON", async () => {
    mockFetch(jest.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 200 })));
    await expect(requestJson(URL, {}, isThing)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("throws InvalidResponseError when the guard rejects the body", async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({ ok: false })));
    await expect(requestJson(URL, {}, isThing)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("throws TimeoutError when the request stalls past timeoutMs", async () => {
    mockFetch(hangingFetch());
    const error = await requestJson(URL, {}, isThing, { timeoutMs: 20 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as TimeoutError).timeoutMs).toBe(20);
  });

  it("uses the configured requestTimeoutMs by default", async () => {
    initOSMNavigator({ requestTimeoutMs: 15 });
    mockFetch(hangingFetch());
    await expect(requestJson(URL, {}, isThing)).rejects.toBeInstanceOf(TimeoutError);
  });

  it("throws TimeoutError when the body stalls past timeoutMs", async () => {
    const response = jsonResponse({ ok: true });
    jest.spyOn(response, "json").mockImplementation(
      () => new Promise((_resolve, reject) => setTimeout(() => reject(new Error("aborted")), 50)),
    );
    mockFetch(jest.fn().mockResolvedValue(response));
    await expect(requestJson(URL, {}, isThing, { timeoutMs: 10 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it("throws AbortError when the caller aborts mid-request", async () => {
    mockFetch(hangingFetch());
    const controller = new AbortController();
    const promise = requestJson(URL, {}, isThing, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(AbortError);
  });

  it("throws AbortError without calling fetch when the signal is already aborted", async () => {
    const fetch = mockFetch(jest.fn());
    const controller = new AbortController();
    controller.abort();
    await expect(requestJson(URL, {}, isThing, { signal: controller.signal })).rejects.toBeInstanceOf(AbortError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("removes its abort listener and timer once done", async () => {
    mockFetch(jest.fn().mockResolvedValue(jsonResponse({ ok: true })));
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, "removeEventListener");
    const clear = jest.spyOn(globalThis, "clearTimeout");
    await requestJson(URL, {}, isThing, { signal: controller.signal });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});
