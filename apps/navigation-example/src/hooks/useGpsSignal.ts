import { useEffect, useState } from 'react';
import { type Fix, SIGNAL_LOST_AFTER_MS, type SignalQuality, signalQuality } from '../lib/location';

/**
 * How trustworthy the position is: from the latest fix's accuracy, or `lost` when no
 * fix has arrived for a while (typical deep indoors). `undefined` when not tracking.
 */
export function useGpsSignal(fix: Fix | null, tracking: boolean): SignalQuality | undefined {
  const [lostFix, setLostFix] = useState<Fix | null | undefined>(undefined);

  useEffect(() => {
    if (!tracking) return;
    const timer = setTimeout(() => setLostFix(fix), SIGNAL_LOST_AFTER_MS);
    return () => clearTimeout(timer);
  }, [fix, tracking]);

  if (!tracking) {
    // Forget a stale "lost" so the next session starts fresh.
    if (lostFix !== undefined) setLostFix(undefined);
    return undefined;
  }
  // The timer fired for this exact fix (or for "no fix yet"): nothing new since.
  if (lostFix === fix) return 'lost';
  return fix ? signalQuality(fix.accuracy) : undefined;
}
