import type { NavigationState, Route, RouteStep } from "@osm-navigator/core";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { TurnByTurnOverlay } from "../TurnByTurnOverlay";

function step(instruction: string, maneuverType: RouteStep["maneuverType"], distance: number, i: number): RouteStep {
  return { instruction, maneuverType, distance, duration: 10, startLocation: [0, i], geometryIndex: i };
}

function state(steps: RouteStep[], currentStepIndex = 0): NavigationState {
  const route = { geometry: [], distanceMeters: 0, durationSeconds: 0, steps, raw: {} } as unknown as Route;
  return {
    route,
    currentStepIndex,
    distanceToNextStepMeters: 0,
    distanceRemainingMeters: 0,
    timeRemainingSeconds: 0,
    progress: 0,
    snappedPosition: [0, 0],
    distanceFromRouteMeters: 0,
    routeBearing: 0,
    isOffRoute: false,
    isArrived: false,
  };
}

const STEPS = [
  step("Drive south.", "depart", 93.4, 0),
  step("Turn right onto F103.", "right", 1234.5678, 3),
  step("You have arrived.", "arrive", 0, 9),
];

describe("TurnByTurnOverlay", () => {
  it("renders nothing without a navigation state", async () => {
    await render(<TurnByTurnOverlay navigationState={null} testID="overlay" />);
    expect(screen.queryByTestId("overlay")).toBeNull();
  });

  it("lists every step with formatted distances and highlights the current one", async () => {
    await render(<TurnByTurnOverlay navigationState={state(STEPS, 1)} />);
    expect(screen.getByText("Drive south.")).toBeOnTheScreen();
    expect(screen.getByText("95 m")).toBeOnTheScreen();
    expect(screen.getByText("1.2 km")).toBeOnTheScreen();
    expect(screen.queryByText(/1234/)).toBeNull();
    // Zero-distance arrival shows no distance.
    expect(screen.queryByText("0 m")).toBeNull();

    const current = screen.getByTestId("current-step");
    expect(current).toBeSelected();
    expect(current).toHaveTextContent(/Turn right onto F103/);
  });

  it("honours imperial units", async () => {
    await render(<TurnByTurnOverlay navigationState={state(STEPS)} units="imperial" />);
    expect(screen.getByText("300 ft")).toBeOnTheScreen();
    expect(screen.getByText("0.8 mi")).toBeOnTheScreen();
  });

  it("shows a close button only with onClose, and calls it", async () => {
    const onClose = jest.fn();
    const { rerender } = await render(<TurnByTurnOverlay navigationState={state(STEPS)} />);
    expect(screen.queryByLabelText("Close steps")).toBeNull();

    await rerender(<TurnByTurnOverlay navigationState={state(STEPS)} onClose={onClose} />);
    await fireEvent.press(screen.getByLabelText("Close steps"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state for a route without steps", async () => {
    await render(<TurnByTurnOverlay navigationState={state([])} />);
    expect(screen.getByText("This route has no turn-by-turn steps.")).toBeOnTheScreen();
  });
});
