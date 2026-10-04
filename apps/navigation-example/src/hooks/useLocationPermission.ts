import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

export type PermissionStatus = 'unknown' | 'granted' | 'denied';

/**
 * Foreground location permission. Asks once on mount, and re-checks when the app
 * returns to the foreground (the user may have changed it in Settings).
 */
export function useLocationPermission() {
  const [status, setStatus] = useState<PermissionStatus>('unknown');

  const request = useCallback(async () => {
    const result = await Location.requestForegroundPermissionsAsync();
    const next: PermissionStatus = result.status === 'granted' ? 'granted' : 'denied';
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void Location.requestForegroundPermissionsAsync().then((result) => {
      if (active) setStatus(result.status === 'granted' ? 'granted' : 'denied');
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void Location.getForegroundPermissionsAsync().then((result) => {
        if (active) setStatus(result.status === 'granted' ? 'granted' : 'denied');
      });
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { status, request, openSettings };
}
