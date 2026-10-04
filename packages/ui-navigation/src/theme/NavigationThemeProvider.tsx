import { createContext, type ReactNode, use, useMemo } from "react";
import { darkNavigationTheme, type NavigationTheme } from "./tokens";

/** Override any subset of a theme; each group is merged with the base theme. */
export interface NavigationThemeOverrides {
  colors?: Partial<NavigationTheme["colors"]>;
  spacing?: Partial<NavigationTheme["spacing"]>;
  radii?: Partial<NavigationTheme["radii"]>;
  typography?: Partial<NavigationTheme["typography"]>;
}

const NavigationThemeContext = createContext<NavigationTheme>(darkNavigationTheme);

export function mergeNavigationTheme(
  base: NavigationTheme,
  overrides: NavigationThemeOverrides = {},
): NavigationTheme {
  return {
    colors: { ...base.colors, ...overrides.colors },
    spacing: { ...base.spacing, ...overrides.spacing },
    radii: { ...base.radii, ...overrides.radii },
    typography: { ...base.typography, ...overrides.typography },
  };
}

export interface NavigationThemeProviderProps {
  /** Base theme. @default darkNavigationTheme */
  theme?: NavigationTheme;
  overrides?: NavigationThemeOverrides;
  children: ReactNode;
}

export function NavigationThemeProvider({
  theme = darkNavigationTheme,
  overrides,
  children,
}: NavigationThemeProviderProps) {
  const value = useMemo(() => mergeNavigationTheme(theme, overrides), [theme, overrides]);
  return <NavigationThemeContext value={value}>{children}</NavigationThemeContext>;
}

/** The active theme; the dark theme when no provider is mounted. */
export function useNavigationTheme(): NavigationTheme {
  return use(NavigationThemeContext);
}
