import { fireEvent, render, screen } from "@testing-library/react-native";
import { ArrivalCard } from "../ArrivalCard";
import { ErrorBanner } from "../ErrorBanner";
import { OffRouteBanner } from "../OffRouteBanner";
import { StyleSheet } from "react-native";
import { darkNavigationTheme } from "../../theme";

describe("OffRouteBanner", () => {
  it("announces off-route as an alert with a reroute action", async () => {
    const onReroute = jest.fn();
    await render(<OffRouteBanner onReroute={onReroute} testID="banner" />);
    // Not grouped as one accessible element, so the button stays focusable on its own.
    const banner = screen.getByTestId("banner");
    expect(banner).toHaveProp("accessibilityRole", "alert");
    expect(banner).toHaveTextContent(/You're off route/);
    expect(screen.queryByTestId("rerouting-spinner")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Reroute" }));
    expect(onReroute).toHaveBeenCalledTimes(1);
  });

  it("shows progress and hides the action while rerouting", async () => {
    await render(<OffRouteBanner isRerouting onReroute={jest.fn()} />);
    expect(screen.getByText("Finding a new route…")).toBeOnTheScreen();
    expect(screen.getByTestId("rerouting-spinner")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has no action without onReroute", async () => {
    await render(<OffRouteBanner />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ArrivalCard", () => {
  it("shows the arrival title, destination and a Done action", async () => {
    const onDone = jest.fn();
    await render(<ArrivalCard destinationName="Petroleum Training Institute (PTI)" onDone={onDone} testID="card" />);
    expect(screen.getByTestId("card")).toHaveProp("accessibilityRole", "alert");
    expect(screen.getByRole("header")).toHaveTextContent("You have arrived");
    expect(screen.getByText("Petroleum Training Institute (PTI)")).toBeOnTheScreen();
    expect(screen.getByTestId("maneuver-icon-arrive")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("works without a destination name or action", async () => {
    await render(<ArrivalCard />);
    expect(screen.getByText("You have arrived")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ErrorBanner", () => {
  it("shows title and message as an alert with retry and dismiss", async () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    await render(
      <ErrorBanner
        title="Couldn't find a route"
        message="Path distance exceeds the max distance limit"
        onRetry={onRetry}
        onDismiss={onDismiss}
        testID="banner"
      />,
    );
    const alert = screen.getByTestId("banner");
    expect(alert).toHaveProp("accessibilityRole", "alert");
    expect(alert).toHaveTextContent(/Couldn't find a route/);
    expect(alert).toHaveTextContent(/max distance limit/);
    expect(StyleSheet.flatten(alert.props.style).backgroundColor).toBe(darkNavigationTheme.colors.danger);

    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    await fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses a neutral surface for the offline variant and no actions by default", async () => {
    await render(<ErrorBanner variant="offline" message="You're offline" testID="banner" />);
    const alert = screen.getByTestId("banner");
    expect(StyleSheet.flatten(alert.props.style).backgroundColor).toBe(darkNavigationTheme.colors.surfaceRaised);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
