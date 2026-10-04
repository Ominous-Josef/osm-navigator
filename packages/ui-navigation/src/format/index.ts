export type Units = "metric" | "imperial";

const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;
/** Below 0.1 mi, imperial distances are shown in feet. */
const FEET_THRESHOLD_METERS = 0.1 * METERS_PER_MILE;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function number(value: number, fractionDigits: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Format a distance the way navigation apps announce it: coarse enough to read at
 * a glance, finer as the maneuver gets closer.
 *
 * - metric: `45 m`, `150 m`, `1.2 km`, `12 km`
 * - imperial: `50 ft`, `500 ft`, `0.3 mi`, `12 mi`
 */
export function formatDistance(meters: number, units: Units = "metric", locale?: string): string {
  const m = Number.isFinite(meters) && meters > 0 ? meters : 0;

  if (units === "imperial") {
    if (m < FEET_THRESHOLD_METERS) {
      const feet = m / METERS_PER_FOOT;
      return `${number(feet < 100 ? roundTo(feet, 10) : roundTo(feet, 50), 0, locale)} ft`;
    }
    const miles = m / METERS_PER_MILE;
    return `${number(miles, miles < 10 ? 1 : 0, locale)} mi`;
  }

  if (m < 1000) {
    const rounded = m < 100 ? roundTo(m, 5) : roundTo(m, 10);
    if (rounded < 1000) return `${number(rounded, 0, locale)} m`;
  }
  const km = m / 1000;
  return `${number(km, km < 10 ? 1 : 0, locale)} km`;
}

/** Format a duration in seconds: `<1 min`, `12 min`, `1 h 5 min`, `2 h`. */
export function formatDuration(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalMinutes = Math.round(s / 60);
  if (totalMinutes < 1) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
