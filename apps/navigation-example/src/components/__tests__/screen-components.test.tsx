import type { GeocodeResult, NavigationState, Route, RouteStep } from '@osm-navigator/core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GpsSignalBanner } from '../GpsSignalBanner';
import { NavigationHUD } from '../NavigationHUD';
import { SearchPanel, type SearchPanelProps } from '../SearchPanel';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> };
});

const result: GeocodeResult = {
  name: 'Petroleum Training Institute (PTI)',
  address: 'Effurun, Delta',
  coordinates: [5.77, 5.56],
  type: 'university',
  raw: {} as GeocodeResult['raw'],
};

function panel(overrides: Partial<SearchPanelProps> = {}) {
  const props: SearchPanelProps = {
    query: '',
    onChangeQuery: jest.fn(),
    status: 'idle',
    results: [],
    onRetrySearch: jest.fn(),
    onSelectResult: jest.fn(),
    hasDestination: false,
    isStarting: false,
    onStart: jest.fn(),
    permission: 'granted',
    onOpenSettings: jest.fn(),
    ...overrides,
  };
  return props;
}

describe('SearchPanel', () => {
  it('searches as you type and selects a result', async () => {
    const props = panel({ query: 'pti', status: 'success', results: [result] });
    await render(<SearchPanel {...props} />);
    await fireEvent.changeText(screen.getByLabelText('Search for a destination'), 'ptii');
    expect(props.onChangeQuery).toHaveBeenCalledWith('ptii');
    expect(screen.getByText('Effurun, Delta')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Petroleum Training Institute (PTI)'));
    expect(props.onSelectResult).toHaveBeenCalledWith(result);
  });

  it('shows loading, empty and error states', async () => {
    const { rerender } = await render(<SearchPanel {...panel({ status: 'loading', query: 'zzz' })} />);
    expect(screen.getByTestId('search-spinner')).toBeOnTheScreen();

    await rerender(<SearchPanel {...panel({ status: 'success', query: 'zzzz ' })} />);
    expect(screen.getByText('No places found for “zzzz”.')).toBeOnTheScreen();

    const onRetrySearch = jest.fn();
    await rerender(<SearchPanel {...panel({ status: 'error', searchError: 'Offline', onRetrySearch })} />);
    expect(screen.getByText('Search failed')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetrySearch).toHaveBeenCalled();
  });

  it('only offers Start with a destination, and disables it while starting', async () => {
    const onStart = jest.fn();
    const { rerender } = await render(<SearchPanel {...panel({ onStart })} />);
    expect(screen.queryByText('🚗 Start Navigation')).toBeNull();

    await rerender(<SearchPanel {...panel({ onStart, hasDestination: true })} />);
    await fireEvent.press(screen.getByText('🚗 Start Navigation'));
    expect(onStart).toHaveBeenCalledTimes(1);

    await rerender(<SearchPanel {...panel({ onStart, hasDestination: true, isStarting: true })} />);
    expect(screen.getByTestId('start-spinner')).toBeOnTheScreen();
    expect(screen.getByRole('button', { busy: true })).toBeDisabled();
  });

  it('explains denied permission with an Open Settings action and blocks Start', async () => {
    const onOpenSettings = jest.fn();
    await render(<SearchPanel {...panel({ permission: 'denied', hasDestination: true, onOpenSettings })} />);
    expect(screen.getByText('Location is off')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onOpenSettings).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '🚗 Start Navigation' })).toBeDisabled();
  });

  it('shows the dev simulate toggle only when wired', async () => {
    const onToggleSimulate = jest.fn();
    const { rerender } = await render(<SearchPanel {...panel()} />);
    expect(screen.queryByLabelText('Simulate drive')).toBeNull();
    await rerender(<SearchPanel {...panel({ onToggleSimulate, simulate: false })} />);
    await fireEvent(screen.getByLabelText('Simulate drive'), 'valueChange', true);
    expect(onToggleSimulate).toHaveBeenCalledWith(true);
  });
});

function step(instruction: string, maneuverType: RouteStep['maneuverType'], i: number): RouteStep {
  return { instruction, maneuverType, distance: 100, duration: 10, startLocation: [0, 0], geometryIndex: i };
}

function navState(partial: Partial<NavigationState> = {}): NavigationState {
  return {
    route: { steps: [step('Drive south.', 'depart', 0), step('Turn right.', 'right', 1), step('Turn left.', 'left', 2)] } as unknown as Route,
    currentStepIndex: 0,
    distanceToNextStepMeters: 93,
    distanceRemainingMeters: 1780,
    timeRemainingSeconds: 270,
    progress: 0.36,
    snappedPosition: [0, 0],
    distanceFromRouteMeters: 2,
    routeBearing: 0,
    isOffRoute: false,
    isArrived: false,
    ...partial,
  };
}

describe('NavigationHUD', () => {
  it('shows the upcoming maneuver, not the current step', async () => {
    await render(<NavigationHUD navState={navState()} isRerouting={false} onReroute={jest.fn()} onExit={jest.fn()} />);
    expect(screen.getByText('95 m')).toBeOnTheScreen();
    expect(screen.getByText('Turn right.')).toBeOnTheScreen();
    expect(screen.getByTestId('maneuver-icon-right')).toBeOnTheScreen();
    expect(screen.getByText('Turn left.')).toBeOnTheScreen();
    expect(screen.queryByText('Drive south.')).toBeNull();
    expect(screen.getByText('5 min')).toBeOnTheScreen();
    expect(screen.getByText('1.8 km remaining')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 36 });
  });

  it('toggles the steps list and exits', async () => {
    const onExit = jest.fn();
    await render(<NavigationHUD navState={navState()} isRerouting={false} onReroute={jest.fn()} onExit={onExit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Show steps' }));
    expect(screen.getByText('Steps')).toBeOnTheScreen();
    expect(screen.getByText('Drive south.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Close steps'));
    expect(screen.queryByText('Steps')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Exit navigation' }));
    expect(onExit).toHaveBeenCalled();
  });

  it('shows the off-route banner and rerouting progress', async () => {
    const onReroute = jest.fn();
    const { rerender } = await render(
      <NavigationHUD navState={navState({ isOffRoute: true })} isRerouting={false} onReroute={onReroute} onExit={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Reroute' }));
    expect(onReroute).toHaveBeenCalled();
    await rerender(<NavigationHUD navState={navState()} isRerouting onReroute={onReroute} onExit={jest.fn()} />);
    expect(screen.getByText('Finding a new route…')).toBeOnTheScreen();
  });

  it('shows the arrival card on arrival, with Done exiting', async () => {
    const onExit = jest.fn();
    await render(
      <NavigationHUD navState={navState({ isArrived: true })} destinationName="PTI" isRerouting={false} onReroute={jest.fn()} onExit={onExit} />,
    );
    expect(screen.getByText('You have arrived')).toBeOnTheScreen();
    expect(screen.getByText('PTI')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onExit).toHaveBeenCalled();
  });

  it('handles a route without steps', async () => {
    await render(
      <NavigationHUD navState={navState({ route: { steps: [] } as unknown as Route })} isRerouting={false} onReroute={jest.fn()} onExit={jest.fn()} />,
    );
    expect(screen.queryByTestId(/maneuver-icon/)).toBeNull();
    expect(screen.getByText('1.8 km remaining')).toBeOnTheScreen();
  });
});

describe('GpsSignalBanner', () => {
  it('stays hidden with a good signal, or a weak one outside navigation', async () => {
    await render(<GpsSignalBanner quality="good" accuracy={5} isNavigating />);
    expect(screen.queryByTestId('gps-signal-banner')).toBeNull();
    await render(<GpsSignalBanner quality={undefined} accuracy={undefined} isNavigating />);
    expect(screen.queryByTestId('gps-signal-banner')).toBeNull();
    await render(<GpsSignalBanner quality="weak" accuracy={35} isNavigating={false} />);
    expect(screen.queryByTestId('gps-signal-banner')).toBeNull();
  });

  it('warns about a weak signal while navigating', async () => {
    await render(<GpsSignalBanner quality="weak" accuracy={34.6} isNavigating />);
    expect(screen.getByText('Weak GPS signal')).toBeOnTheScreen();
    expect(screen.getByText('Your position is approximate (±35 m). Directions may lag.')).toBeOnTheScreen();
  });

  it('explains a poor signal as likely being indoors', async () => {
    await render(<GpsSignalBanner quality="poor" accuracy={120} isNavigating />);
    expect(screen.getByText(/unreliable \(±120 m\), likely indoors\. Directions pause/)).toBeOnTheScreen();
    await render(<GpsSignalBanner quality="poor" accuracy={null} isNavigating={false} />);
    expect(screen.getByText('Your position is unreliable, likely indoors. Move outside for an accurate fix.')).toBeOnTheScreen();
  });

  it('reports a lost signal', async () => {
    await render(<GpsSignalBanner quality="lost" accuracy={null} isNavigating={false} />);
    expect(screen.getByText('No GPS signal')).toBeOnTheScreen();
  });
});
