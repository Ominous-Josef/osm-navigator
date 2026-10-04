import { AbortError, geocode, type GeocodeResult, type LngLat } from '@osm-navigator/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from '../lib/errors';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SearchState {
  status: SearchStatus;
  results: GeocodeResult[];
  error?: string;
}

const IDLE: SearchState = { status: 'idle', results: [] };

export interface DestinationSearchOptions {
  /** Prefer results near this point (e.g. the user's position). */
  bias?: LngLat;
  /** @default 300 */
  debounceMs?: number;
  /** Queries shorter than this don't search. @default 3 */
  minLength?: number;
}

/**
 * Debounced Photon search where the latest query always wins: each new query aborts
 * the request in flight, so a slow earlier response can never overwrite a newer one.
 */
export function useDestinationSearch({ bias, debounceMs = 300, minLength = 3 }: DestinationSearchOptions = {}) {
  const [query, setQueryText] = useState('');
  const [state, setState] = useState<SearchState>(IDLE);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<AbortController | undefined>(undefined);
  const biasRef = useRef(bias);

  useEffect(() => {
    biasRef.current = bias;
  }, [bias]);

  const cancelPending = useCallback(() => {
    clearTimeout(timer.current);
    inFlight.current?.abort();
    inFlight.current = undefined;
  }, []);

  const run = useCallback(
    (text: string) => {
      cancelPending();
      const controller = new AbortController();
      inFlight.current = controller;
      setState((s) => ({ ...s, status: 'loading', error: undefined }));

      geocode({ query: text, limit: 5, locationBias: biasRef.current, signal: controller.signal })
        .then((results) => {
          if (!controller.signal.aborted) setState({ status: 'success', results });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || error instanceof AbortError) return;
          setState({ status: 'error', results: [], error: describeError(error) });
        });
    },
    [cancelPending],
  );

  /** Update the query and search after the debounce. */
  const setQuery = useCallback(
    (text: string) => {
      setQueryText(text);
      cancelPending();
      const trimmed = text.trim();
      if (trimmed.length < minLength) {
        setState(IDLE);
        return;
      }
      timer.current = setTimeout(() => run(trimmed), debounceMs);
    },
    [cancelPending, debounceMs, minLength, run],
  );

  /** Show text in the field without searching (e.g. a selected result's name). */
  const setQueryWithoutSearch = useCallback(
    (text: string) => {
      cancelPending();
      setQueryText(text);
      setState(IDLE);
    },
    [cancelPending],
  );

  const retry = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length >= minLength) run(trimmed);
  }, [minLength, query, run]);

  useEffect(() => cancelPending, [cancelPending]);

  return {
    query,
    setQuery,
    setQueryWithoutSearch,
    retry,
    status: state.status,
    results: state.results,
    error: state.error,
  };
}
