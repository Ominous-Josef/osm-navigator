import type { TextStyle } from "react-native";

export interface NavigationColors {
  /** Card and banner backgrounds. */
  surface: string;
  /** Elevated areas inside a surface (icon tiles, list highlights). */
  surfaceRaised: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Distances, progress, primary actions. */
  accent: string;
  onAccent: string;
  warning: string;
  onWarning: string;
  danger: string;
  onDanger: string;
  success: string;
  /** Unfilled part of the progress bar. */
  track: string;
  shadow: string;
}

export interface NavigationTypography {
  distance: TextStyle;
  instruction: TextStyle;
  body: TextStyle;
  caption: TextStyle;
}

export interface NavigationTheme {
  colors: NavigationColors;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radii: { sm: number; md: number; lg: number; pill: number };
  typography: NavigationTypography;
}

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const radii = { sm: 8, md: 12, lg: 16, pill: 999 };
const typography: NavigationTypography = {
  distance: { fontSize: 28, fontWeight: "800" },
  instruction: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 15, fontWeight: "500" },
  caption: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
};

/** Default theme: dark surfaces read well over a bright map in daylight. */
export const darkNavigationTheme: NavigationTheme = {
  colors: {
    surface: "#1C1C1E",
    surfaceRaised: "#2C2C2E",
    border: "#3A3A3C",
    textPrimary: "#FFFFFF",
    textSecondary: "#AEAEB2",
    textMuted: "#8E8E93",
    accent: "#0A84FF",
    onAccent: "#FFFFFF",
    warning: "#FF9F0A",
    onWarning: "#1C1C1E",
    danger: "#FF453A",
    onDanger: "#FFFFFF",
    success: "#30D158",
    track: "#3A3A3C",
    shadow: "#000000",
  },
  spacing,
  radii,
  typography,
};

export const lightNavigationTheme: NavigationTheme = {
  colors: {
    surface: "#FFFFFF",
    surfaceRaised: "#F2F2F7",
    border: "#D1D1D6",
    textPrimary: "#1C1C1E",
    textSecondary: "#3A3A3C",
    textMuted: "#6C6C70",
    accent: "#0060DF",
    onAccent: "#FFFFFF",
    warning: "#C93400",
    onWarning: "#FFFFFF",
    danger: "#D70015",
    onDanger: "#FFFFFF",
    success: "#248A3D",
    track: "#D1D1D6",
    shadow: "#000000",
  },
  spacing,
  radii,
  typography,
};
