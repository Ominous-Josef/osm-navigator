// Shared fetch mocks for client tests.

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fetch that never resolves until its signal aborts, like a stalled connection. */
export function hangingFetch(): jest.Mock {
  return jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
  );
}

export function mockFetch(impl: jest.Mock): jest.Mock {
  globalThis.fetch = impl as unknown as typeof fetch;
  return impl;
}
