import {
  InvalidResponseError,
  NetworkError,
  ServiceError,
  TimeoutError,
  toErrorMessage,
} from '@osm-navigator/core';

/** Pull the human-readable message out of a Valhalla/Photon JSON error body, if there is one. */
function serviceMessage(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null) {
      const { error, message } = parsed as { error?: unknown; message?: unknown };
      if (typeof error === 'string') return error;
      if (typeof message === 'string') return message;
    }
  } catch {
    // Not JSON (e.g. an HTML error page).
  }
  return undefined;
}

/** A short message suitable for showing to the user. */
export function describeError(error: unknown): string {
  if (error instanceof NetworkError) return "Can't reach the server. Check your connection.";
  if (error instanceof TimeoutError) return 'The server took too long to answer. Try again.';
  if (error instanceof InvalidResponseError) return 'The server sent an unexpected answer. Try again later.';
  if (error instanceof ServiceError) {
    const detail = serviceMessage(error.body);
    if (error.status === 429) return 'Too many requests. Wait a moment and try again.';
    return detail ?? `The server returned an error (HTTP ${error.status}).`;
  }
  return toErrorMessage(error);
}
