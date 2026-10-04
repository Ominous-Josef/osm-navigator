import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import {
  darkNavigationTheme,
  lightNavigationTheme,
  mergeNavigationTheme,
  NavigationThemeProvider,
  useNavigationTheme,
} from "../theme";

function AccentProbe() {
  const theme = useNavigationTheme();
  return <Text testID="probe">{`${theme.colors.accent}|${theme.colors.surface}|${theme.spacing.md}`}</Text>;
}

describe("theme", () => {
  it("defaults to the dark theme without a provider", async () => {
    await render(<AccentProbe />);
    const { accent, surface } = darkNavigationTheme.colors;
    expect(screen.getByTestId("probe")).toHaveTextContent(`${accent}|${surface}|12`);
  });

  it("provides a base theme with partial overrides", async () => {
    await render(
      <NavigationThemeProvider theme={lightNavigationTheme} overrides={{ colors: { accent: "#123456" }, spacing: { md: 20 } }}>
        <AccentProbe />
      </NavigationThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`#123456|${lightNavigationTheme.colors.surface}|20`);
  });

  it("merges each group without mutating the base", () => {
    const merged = mergeNavigationTheme(darkNavigationTheme, { radii: { lg: 0 }, typography: { body: { fontSize: 20 } } });
    expect(merged.radii).toEqual({ ...darkNavigationTheme.radii, lg: 0 });
    expect(merged.typography.body).toEqual({ fontSize: 20 });
    expect(merged.colors).toEqual(darkNavigationTheme.colors);
    expect(darkNavigationTheme.radii.lg).toBe(16);
  });

  it("merges with no overrides", () => {
    expect(mergeNavigationTheme(lightNavigationTheme)).toEqual(lightNavigationTheme);
  });
});
