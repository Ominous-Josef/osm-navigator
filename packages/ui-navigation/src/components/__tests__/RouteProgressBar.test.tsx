import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { RouteProgressBar } from "../RouteProgressBar";

function fillWidth() {
  return StyleSheet.flatten(screen.getByTestId("route-progress-fill").props.style).width;
}

describe("RouteProgressBar", () => {
  it("is an accessible progressbar with the percentage", async () => {
    await render(<RouteProgressBar progress={0.426} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 43, text: "43%" });
    expect(fillWidth()).toBe("42.6%");
  });

  it.each<[number, string, number]>([
    [-0.5, "0%", 0],
    [1.7, "100%", 100],
    [Number.NaN, "0%", 0],
  ])("clamps %p", async (progress, width, now) => {
    await render(<RouteProgressBar progress={progress} />);
    expect(fillWidth()).toBe(width);
    expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now });
  });

  it("uses the height for the bar and its rounding", async () => {
    await render(<RouteProgressBar progress={0.5} height={12} />);
    const style = StyleSheet.flatten(screen.getByRole("progressbar").props.style);
    expect(style.height).toBe(12);
    expect(style.borderRadius).toBe(6);
  });
});
