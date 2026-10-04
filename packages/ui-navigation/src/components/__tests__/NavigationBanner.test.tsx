import { render, screen } from "@testing-library/react-native";
import { NavigationBanner } from "../NavigationBanner";

describe("NavigationBanner", () => {
  it("shows the formatted distance, instruction and maneuver icon", async () => {
    await render(<NavigationBanner instruction="Turn right onto Main St." distanceToManeuver={1234} maneuverType="right" />);
    expect(screen.getByText("1.2 km")).toBeOnTheScreen();
    expect(screen.getByText("Turn right onto Main St.")).toBeOnTheScreen();
    expect(screen.getByTestId("maneuver-icon-right")).toBeOnTheScreen();
    expect(screen.queryByText(/THEN/)).toBeNull();
  });

  it("honours imperial units", async () => {
    await render(<NavigationBanner instruction="Turn left." distanceToManeuver={100} maneuverType="left" units="imperial" />);
    expect(screen.getByText("350 ft")).toBeOnTheScreen();
  });

  it("shows the following instruction as 'Then'", async () => {
    await render(
      <NavigationBanner instruction="Turn right." distanceToManeuver={93} maneuverType="right" nextInstruction="Turn left." />,
    );
    expect(screen.getByText(/THEN/)).toBeOnTheScreen();
    expect(screen.getByText("Turn left.")).toBeOnTheScreen();
  });

  it("limits long instructions to two lines and exposes one spoken summary", async () => {
    const long = "Take the exit toward ".repeat(10);
    await render(<NavigationBanner instruction={long} distanceToManeuver={50} maneuverType="slight-right" nextInstruction="Merge." />);
    expect(screen.getByText(long).props.numberOfLines).toBe(2);
    expect(screen.getByLabelText(`In 50 m, ${long}. Then Merge.`)).toBeOnTheScreen();
  });
});
