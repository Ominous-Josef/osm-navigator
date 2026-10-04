import {
  AbortError,
  ConfigError,
  InvalidResponseError,
  NetworkError,
  OSMNavigatorError,
  ServiceError,
  TimeoutError,
  toErrorMessage,
} from "../errors";

describe("error classes", () => {
  it.each([
    new ConfigError("c"),
    new NetworkError("n"),
    new TimeoutError("https://x", 10),
    new AbortError("https://x"),
    new ServiceError("https://x", 500, "boom"),
    new InvalidResponseError("i"),
  ])("%p is an OSMNavigatorError with its own name", (error) => {
    expect(error).toBeInstanceOf(OSMNavigatorError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(error.constructor.name);
  });

  it("ServiceError carries status and body", () => {
    const error = new ServiceError("https://x", 429, "slow down");
    expect(error.status).toBe(429);
    expect(error.body).toBe("slow down");
    expect(error.message).toBe("Request to https://x failed with HTTP 429: slow down");
    expect(new ServiceError("https://x", 502, "").message).toBe("Request to https://x failed with HTTP 502");
  });

  it("keeps the underlying cause", () => {
    const cause = new TypeError("socket hang up");
    expect(new NetworkError("n", { cause }).cause).toBe(cause);
  });
});

describe("toErrorMessage", () => {
  it.each<[unknown, string]>([
    [new Error("boom"), "boom"],
    [new TimeoutError("https://x", 5), "Request to https://x timed out after 5 ms"],
    ["plain string", "plain string"],
    [42, "Unknown error"],
    [null, "Unknown error"],
    [undefined, "Unknown error"],
  ])("%p → %p", (input, expected) => {
    expect(toErrorMessage(input)).toBe(expected);
  });
});
