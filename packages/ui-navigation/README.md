# @osm-navigator/ui-navigation

Themeable React Native components for a navigation screen. They take plain values or a `NavigationState` from `@osm-navigator/core`, so they work with any state management.

## Installation

`react-native-svg` is a peer dependency, used by the maneuver icons:

```bash
npx expo install react-native-svg
```

## Components

```tsx
import {
  ArrivalCard,
  ErrorBanner,
  NavigationBanner,
  OffRouteBanner,
  RouteProgressBar,
  TurnByTurnOverlay,
} from "@osm-navigator/ui-navigation";

const next = state.route.steps[state.currentStepIndex + 1];

<NavigationBanner
  instruction={next.instruction}
  maneuverType={next.maneuverType}
  distanceToManeuver={state.distanceToNextStepMeters}
  nextInstruction={state.route.steps[state.currentStepIndex + 2]?.instruction} // "Then …"
  units="metric"
/>
{state.isOffRoute && <OffRouteBanner isRerouting={isRerouting} onReroute={reroute} />}
<RouteProgressBar progress={state.progress} />
<TurnByTurnOverlay navigationState={state} onClose={hideSteps} />
{state.isArrived && <ArrivalCard destinationName="PTI" onDone={exit} />}
<ErrorBanner title="Couldn't find a route" message={message} onRetry={retry} onDismiss={dismiss} />
```

| Component | Props |
| :--- | :--- |
| `NavigationBanner` | `instruction`, `maneuverType`, `distanceToManeuver`, `nextInstruction?`, `units?`, `locale?` |
| `TurnByTurnOverlay` | `navigationState`, `units?`, `locale?`, `onClose?`. Lists every step, highlights the current one and dims those behind. |
| `RouteProgressBar` | `progress` (0–1, clamped), `height?` |
| `OffRouteBanner` | `isRerouting?`, `onReroute?` |
| `ArrivalCard` | `destinationName?`, `onDone?` |
| `ErrorBanner` | `message`, `title?`, `variant?` (`"error"` or `"offline"`), `onRetry?`, `onDismiss?` |
| `ManeuverIcon` | `type`, `size?` (32), `color?`, `strokeWidth?`. SVG icons for all 15 `ManeuverType`s. `maneuverLabel(type)` gives an accessible name. |

All components accept the usual `View` props (`style`, `testID`, …) and have accessibility roles and labels.

## Theming

The dark theme is the default. Wrap your screen to switch themes or override tokens:

```tsx
import { lightNavigationTheme, NavigationThemeProvider } from "@osm-navigator/ui-navigation";

<NavigationThemeProvider theme={lightNavigationTheme} overrides={{ colors: { accent: "#00A86B" } }}>
  <NavigationScreen />
</NavigationThemeProvider>;
```

`useNavigationTheme()` gives your own components the same colours, spacing, radii and typography. `mergeNavigationTheme(base, overrides)` builds a theme without the provider.

## Formatting

```ts
formatDistance(143); // "140 m"
formatDistance(1250); // "1.3 km"
formatDistance(30, "imperial"); // "100 ft"
formatDuration(3900); // "1 h 5 min"
```

Distances are rounded the way navigation apps announce them: coarse when far away, finer as the turn gets closer.

## License

GPL-3.0-or-later. See the [root LICENSE](../../LICENSE).
