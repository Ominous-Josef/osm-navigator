import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AppState, type AppStateStatus, Linking } from 'react-native';
import { useLocationPermission } from '../useLocationPermission';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
}));
const loc = jest.mocked(Location);
const permission = (status: 'granted' | 'denied') => ({ status }) as Location.LocationPermissionResponse;

let appStateListener: (s: AppStateStatus) => void;
const removeListener = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (s: AppStateStatus) => void;
    return { remove: removeListener } as ReturnType<typeof AppState.addEventListener>;
  });
});

describe('useLocationPermission', () => {
  it('asks on mount', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    const { result } = await renderHook(() => useLocationPermission());
    expect(result.current.status).toBe('granted');
  });

  it('re-checks when the app comes back from Settings', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    loc.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    const { result } = await renderHook(() => useLocationPermission());
    expect(result.current.status).toBe('denied');

    await act(async () => appStateListener('background'));
    expect(loc.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    await act(async () => appStateListener('active'));
    expect(result.current.status).toBe('granted');
  });

  it('can ask again and open Settings', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValueOnce(permission('denied')).mockResolvedValueOnce(permission('granted'));
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const { result } = await renderHook(() => useLocationPermission());
    await act(async () => {
      await expect(result.current.request()).resolves.toBe('granted');
    });
    expect(result.current.status).toBe('granted');
    result.current.openSettings();
    expect(openSettings).toHaveBeenCalled();
  });

  it('ignores answers that arrive after unmount', async () => {
    let resolveRequest!: (r: Location.LocationPermissionResponse) => void;
    loc.requestForegroundPermissionsAsync.mockReturnValue(new Promise((r) => (resolveRequest = r)));
    loc.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    const { result, unmount } = await renderHook(() => useLocationPermission());
    const listener = appStateListener;
    await unmount();
    expect(removeListener).toHaveBeenCalled();
    await act(async () => {
      resolveRequest(permission('granted'));
      listener('active');
    });
    expect(result.current.status).toBe('unknown');
  });
});
