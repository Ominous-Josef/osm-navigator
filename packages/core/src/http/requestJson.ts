import { getConfig } from "../config";
import {
  AbortError,
  InvalidResponseError,
  NetworkError,
  ServiceError,
  TimeoutError,
} from "../errors";

export interface JsonRequestInit {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

export interface RequestOptions {
  /** Overrides the configured `requestTimeoutMs` for this request. */
  timeoutMs?: number;
  /** Cancels the request; the promise then rejects with `AbortError`. */
  signal?: AbortSignal;
}

/** Longest error body kept on a `ServiceError`, so huge HTML error pages don't end up in logs. */
const MAX_ERROR_BODY_LENGTH = 500;

async function readErrorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, MAX_ERROR_BODY_LENGTH);
  } catch {
    return "";
  }
}

/**
 * Fetch a URL and parse a JSON body, validated by `guard`.
 *
 * @throws {TimeoutError} if no complete response arrives within the timeout.
 * @throws {AbortError} if `options.signal` is aborted.
 * @throws {NetworkError} if the request fails without a response.
 * @throws {ServiceError} on a non-2xx status.
 * @throws {InvalidResponseError} if the body isn't JSON or fails `guard`.
 */
export async function requestJson<T>(
  url: string,
  init: JsonRequestInit,
  guard: (value: unknown) => value is T,
  options: RequestOptions = {},
): Promise<T> {
  const config = getConfig();
  const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs;
  const { signal } = options;

  if (signal?.aborted) throw new AbortError(url);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener("abort", onCallerAbort);

  // Maps a failure after the request started to the right error type.
  const failure = (fallback: () => Error): Error => {
    if (timedOut) return new TimeoutError(url, timeoutMs);
    if (signal?.aborted) return new AbortError(url);
    return fallback();
  };

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method ?? "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": config.userAgent,
          ...config.headers,
          ...init.headers,
        },
        body: init.body,
        signal: controller.signal,
      });
    } catch (cause) {
      throw failure(() => new NetworkError(`Request to ${url} failed`, { cause }));
    }

    if (!response.ok) {
      throw new ServiceError(url, response.status, await readErrorBody(response));
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (cause) {
      throw failure(() => new InvalidResponseError(`Response from ${url} is not valid JSON`, { cause }));
    }

    if (!guard(data)) {
      throw new InvalidResponseError(`Response from ${url} has an unexpected shape`);
    }
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
