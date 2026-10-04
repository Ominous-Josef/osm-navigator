import type { ManeuverType } from '@osm-navigator/core';
import Svg, { Path } from 'react-native-svg';
import { useNavigationTheme } from '../theme';

export type { ManeuverType };

interface IconSpec {
  /** Stroked paths on a 24×24 grid. */
  paths: string[];
  /** The branch not taken (forks and keeps), drawn faded. */
  faded?: string[];
}

// Arrows are drawn as strokes so they scale cleanly and take any colour.
const ICONS: Record<ManeuverType, IconSpec> = {
  depart: { paths: ['M12 18V5', 'M7 10l5-5 5 5', 'M10 20.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0'] },
  straight: { paths: ['M12 20V4', 'M7 9l5-5 5 5'] },
  'slight-left': { paths: ['M14 20v-8L7 5', 'M7 11V5h6'] },
  'slight-right': { paths: ['M10 20v-8l7-7', 'M17 11V5h-6'] },
  left: { paths: ['M16 20v-7a3 3 0 0 0-3-3H5', 'M9 6l-4 4 4 4'] },
  right: { paths: ['M8 20v-7a3 3 0 0 1 3-3h8', 'M15 6l4 4-4 4'] },
  'sharp-left': { paths: ['M15 20V8l-9 9', 'M6 11v6h6'] },
  'sharp-right': { paths: ['M9 20V8l9 9', 'M18 11v6h-6'] },
  'keep-left': { paths: ['M12 20v-6L7 8V4', 'M4 7l3-3 3 3'], faded: ['M12 14l5-6V4'] },
  'keep-right': { paths: ['M12 20v-6l5-6V4', 'M14 7l3-3 3 3'], faded: ['M12 14L7 8V4'] },
  'u-turn': { paths: ['M16 20V9a4 4 0 0 0-8 0v7', 'M5 13l3 3 3-3'] },
  merge: { paths: ['M12 10V4', 'M8 8l4-4 4 4', 'M7 20v-5l5-5', 'M17 20v-5l-5-5'] },
  roundabout: {
    paths: ['M12 22v-4.5', 'M8.5 14a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0', 'M14.5 11.5L19 7', 'M15 7h4v4'],
  },
  ferry: { paths: ['M4 15l2 5h12l2-5z', 'M12 15V4', 'M12 4l6 5h-6'] },
  arrive: { paths: ['M6 21V4', 'M6 4h12l-2.5 4L18 12H6'] },
};

const LABELS: Record<ManeuverType, string> = {
  depart: 'Depart',
  straight: 'Continue straight',
  'slight-left': 'Bear left',
  'slight-right': 'Bear right',
  left: 'Turn left',
  right: 'Turn right',
  'sharp-left': 'Sharp left',
  'sharp-right': 'Sharp right',
  'keep-left': 'Keep left',
  'keep-right': 'Keep right',
  'u-turn': 'Make a U-turn',
  merge: 'Merge',
  roundabout: 'Roundabout',
  ferry: 'Take the ferry',
  arrive: 'Arrive',
};

/** Short spoken label for a maneuver, used for accessibility. */
export function maneuverLabel(type: ManeuverType): string {
  return LABELS[type] ?? LABELS.straight;
}

export interface ManeuverIconProps {
  type: ManeuverType;
  /** Width and height in points. @default 32 */
  size?: number;
  /** @default theme.colors.textPrimary */
  color?: string;
  /** @default 2.25 */
  strokeWidth?: number;
}

export function ManeuverIcon({ type, size = 32, color, strokeWidth = 2.25 }: ManeuverIconProps) {
  const theme = useNavigationTheme();
  const stroke = color ?? theme.colors.textPrimary;
  // Unknown values (e.g. from an older core) fall back to "straight" rather than crash.
  const icon = ICONS[type] ?? ICONS.straight;
  const common = {
    stroke,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible
      accessibilityRole="image"
      accessibilityLabel={maneuverLabel(type)}
      testID={`maneuver-icon-${type}`}
    >
      {icon.faded?.map((d) => <Path key={d} d={d} {...common} opacity={0.35} />)}
      {icon.paths.map((d) => <Path key={d} d={d} {...common} />)}
    </Svg>
  );
}
