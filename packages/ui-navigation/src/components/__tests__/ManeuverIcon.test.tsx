import type { ManeuverType } from "@osm-navigator/core";
import { render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { NavigationThemeProvider } from "../../theme";
import { ManeuverIcon, maneuverLabel } from "../ManeuverIcons";

const ALL: ManeuverType[] = [
  "depart", "straight", "slight-left", "slight-right", "left", "right", "sharp-left",
  "sharp-right", "keep-left", "keep-right", "u-turn", "merge", "roundabout", "ferry", "arrive",
];

/** Native stroke colours of every path (react-native-svg passes them as processed ARGB ints). */
function strokes(type: string): unknown[] {
  const svg = screen.getByTestId(`maneuver-icon-${type}`);
  return svg
    .queryAll((n) => typeof n.props.d === "string")
    .map((n) => (n.props.stroke as { payload: unknown }).payload);
}

describe("ManeuverIcon", () => {
  it.each(ALL)("renders %s with an accessible label", async (type) => {
    await render(<ManeuverIcon type={type} />);
    const icon = screen.getByLabelText(maneuverLabel(type));
    expect(icon).toBeOnTheScreen();
    expect(strokes(type).length).toBeGreaterThan(0);
  });

  it("honours the color prop on every path", async () => {
    await render(<ManeuverIcon type="keep-left" color="#FF00FF" />);
    const all = strokes("keep-left");
    expect(all.length).toBeGreaterThan(2);
    expect(new Set(all)).toEqual(new Set([processColor("#FF00FF")]));
  });

  it("defaults to the theme's primary text colour", async () => {
    await render(
      <NavigationThemeProvider overrides={{ colors: { textPrimary: "#ABCDEF" } }}>
        <ManeuverIcon type="left" />
      </NavigationThemeProvider>,
    );
    expect(new Set(strokes("left"))).toEqual(new Set([processColor("#ABCDEF")]));
  });

  it("uses size for width and height", async () => {
    await render(<ManeuverIcon type="right" size={48} />);
    const svg = screen.getByTestId("maneuver-icon-right");
    expect(svg.props.width).toBe(48);
    expect(svg.props.height).toBe(48);
  });

  it("falls back to straight for an unknown type", async () => {
    await render(<ManeuverIcon type={"teleport" as ManeuverType} />);
    expect(screen.getByLabelText("Continue straight")).toBeOnTheScreen();
    expect(strokes("teleport")).toHaveLength(2);
  });
});
