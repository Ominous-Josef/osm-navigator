import { act, renderHook } from '@testing-library/react-native';
import * as core from '@osm-navigator/core';
import { useDestinationSearch } from '../useDestinationSearch';

jest.mock('@osm-navigator/core', () => ({ ...jest.requireActual('@osm-navigator/core'), geocode: jest.fn() }));
const geocode = jest.mocked(core.geocode);

function result(name: string): core.GeocodeResult {
  return { name, address: '', coordinates: [0, 0], type: 'place', raw: {} as core.GeocodeResult['raw'] };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.useFakeTimers();
  geocode.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('useDestinationSearch', () => {
  it('debounces and ignores short queries', async () => {
    geocode.mockResolvedValue([result('PTI')]);
    const { result: hook } = await renderHook(() => useDestinationSearch({ bias: [5.7, 5.5] }));

    await act(async () => hook.current.setQuery('pt'));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(geocode).not.toHaveBeenCalled();
    expect(hook.current.status).toBe('idle');

    await act(async () => hook.current.setQuery('pti'));
    await act(async () => hook.current.setQuery('pti '));
    await act(async () => jest.advanceTimersByTime(299));
    expect(geocode).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledWith(expect.objectContaining({ query: 'pti', limit: 5, locationBias: [5.7, 5.5] }));
    expect(hook.current.status).toBe('success');
    expect(hook.current.results).toEqual([result('PTI')]);
  });

  it('lets the latest query win when an earlier response arrives late', async () => {
    const slow = deferred<core.GeocodeResult[]>();
    const fast = deferred<core.GeocodeResult[]>();
    geocode.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
    const { result: hook } = await renderHook(() => useDestinationSearch());

    await act(async () => hook.current.setQuery('warri'));
    await act(async () => jest.advanceTimersByTime(300));
    expect(hook.current.status).toBe('loading');
    const firstSignal = geocode.mock.calls[0][0].signal!;

    await act(async () => hook.current.setQuery('warri refinery'));
    expect(firstSignal.aborted).toBe(true);
    await act(async () => jest.advanceTimersByTime(300));

    await act(async () => fast.resolve([result('Warri Refinery')]));
    await act(async () => slow.resolve([result('Warri (stale)')]));
    expect(hook.current.results).toEqual([result('Warri Refinery')]);
  });

  it('reports a friendly error and can retry', async () => {
    geocode.mockRejectedValueOnce(new core.NetworkError('offline')).mockResolvedValueOnce([result('PTI')]);
    const { result: hook } = await renderHook(() => useDestinationSearch());

    await act(async () => hook.current.setQuery('pti'));
    await act(async () => jest.advanceTimersByTime(300));
    expect(hook.current.status).toBe('error');
    expect(hook.current.error).toBe("Can't reach the server. Check your connection.");

    await act(async () => hook.current.retry());
    expect(hook.current.status).toBe('success');
    expect(geocode).toHaveBeenCalledTimes(2);
  });

  it('ignores AbortError and does not retry short queries', async () => {
    geocode.mockRejectedValueOnce(new core.AbortError('u'));
    const { result: hook } = await renderHook(() => useDestinationSearch());
    await act(async () => hook.current.setQuery('pti'));
    await act(async () => jest.advanceTimersByTime(300));
    expect(hook.current.status).toBe('loading');

    await act(async () => hook.current.setQuery('p'));
    await act(async () => hook.current.retry());
    expect(geocode).toHaveBeenCalledTimes(1);
  });

  it('setQueryWithoutSearch shows text and cancels a pending search', async () => {
    const { result: hook } = await renderHook(() => useDestinationSearch());
    await act(async () => hook.current.setQuery('pti'));
    await act(async () => hook.current.setQueryWithoutSearch('Petroleum Training Institute'));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(geocode).not.toHaveBeenCalled();
    expect(hook.current.query).toBe('Petroleum Training Institute');
    expect(hook.current.status).toBe('idle');
  });

  it('aborts the request in flight on unmount', async () => {
    geocode.mockReturnValue(new Promise(() => {}));
    const { result: hook, unmount } = await renderHook(() => useDestinationSearch());
    await act(async () => hook.current.setQuery('pti'));
    await act(async () => jest.advanceTimersByTime(300));
    const signal = geocode.mock.calls[0][0].signal!;
    await unmount();
    expect(signal.aborted).toBe(true);
  });
});
