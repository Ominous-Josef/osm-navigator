import { ErrorBanner } from '@osm-navigator/ui-navigation';
import type { StyleProp, ViewStyle } from 'react-native';
import type { SignalQuality } from '../lib/location';

export interface GpsSignalBannerProps {
  quality: SignalQuality | undefined;
  accuracy: number | null | undefined;
  isNavigating: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Tells the user when their position can't be trusted, usually because they're indoors. */
export function GpsSignalBanner({ quality, accuracy, isNavigating, style }: GpsSignalBannerProps) {
  const within = accuracy != null ? ` (±${Math.round(accuracy)} m)` : '';
  let title: string;
  let message: string;
  switch (quality) {
    case 'lost':
      title = 'No GPS signal';
      message = "You may be indoors. Move outside or near a window.";
      break;
    case 'poor':
      title = 'GPS signal too weak';
      message = isNavigating
        ? `Your position is unreliable${within}, likely indoors. Directions pause until it improves.`
        : `Your position is unreliable${within}, likely indoors. Move outside for an accurate fix.`;
      break;
    case 'weak':
      // Only worth interrupting for while directions depend on it.
      if (!isNavigating) return null;
      title = 'Weak GPS signal';
      message = `Your position is approximate${within}. Directions may lag.`;
      break;
    default:
      return null;
  }
  return <ErrorBanner variant="offline" title={title} message={message} style={style} testID="gps-signal-banner" />;
}
