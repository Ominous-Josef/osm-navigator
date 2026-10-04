/** Base class for every error thrown by osm-navigator. */
export class OSMNavigatorError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Invalid value passed to `initOSMNavigator` or another SDK constructor. */
export class ConfigError extends OSMNavigatorError {}

/** The request never got a response (offline, DNS failure, connection reset…). */
export class NetworkError extends OSMNavigatorError {}

/** The request did not complete within the configured timeout. */
export class TimeoutError extends OSMNavigatorError {
  constructor(
    readonly url: string,
    readonly timeoutMs: number,
  ) {
    super(`Request to ${url} timed out after ${timeoutMs} ms`);
  }
}

/** The request was cancelled through the caller's `AbortSignal`. */
export class AbortError extends OSMNavigatorError {
  constructor(readonly url: string) {
    super(`Request to ${url} was aborted`);
  }
}

/** The service answered with a non-2xx HTTP status. */
export class ServiceError extends OSMNavigatorError {
  constructor(
    readonly url: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`Request to ${url} failed with HTTP ${status}${body ? `: ${body}` : ""}`);
  }
}

/** The service answered, but the body is not the shape we expect. */
export class InvalidResponseError extends OSMNavigatorError {}

/** Extract a human-readable message from an unknown thrown value. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}
