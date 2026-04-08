# @osm-navigator/ui-navigation

UI components for turn-by-turn navigation overlays.

## Components
- TurnByTurnOverlay: Overlay for navigation maneuvers
- ManeuverIcon: Icon for maneuver types (replace with SVGs in future)
- RouteProgressBar: Progress bar for route

## Usage
```tsx
import { TurnByTurnOverlay, ManeuverIcon, RouteProgressBar } from "@osm-navigator/ui-navigation";

<TurnByTurnOverlay maneuvers={[{ instruction: "Turn left", distance: 100, icon: <ManeuverIcon type="turn-left" /> }]} currentStep={0} />
<RouteProgressBar progress={0.5} />
```

## TypeScript
- All props and types are explicit, strict mode enabled.

## License
MIT
