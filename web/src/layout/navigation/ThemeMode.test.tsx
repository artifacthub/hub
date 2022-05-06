import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import ThemeMode from './ThemeMode';

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

const mockDispatch = jest.fn();

describe('ThemeMode', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode device="desktop" />
        </Router>
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it('renders component', () => {
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode device="desktop" />
        </Router>
      </AppCtx.Provider>
    );

    expect(screen.getByTestId('themeOptions')).toBeInTheDocument();
    expect(screen.getByText(/Automatic/)).toBeInTheDocument();
    expect(screen.getByText(/Light/)).toBeInTheDocument();
    expect(screen.getByText(/Dark/)).toBeInTheDocument();
  });

  it('when theme is light', () => {
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode device="desktop" />
        </Router>
      </AppCtx.Provider>
    );

    const lightOpt = screen.getByRole('radio', { name: 'Light' });
    expect(lightOpt).toBeChecked();
  });

  it('when theme is dark', () => {
    render(
      <AppCtx.Provider
        value={{
          ctx: {
            ...mockCtx,
            prefs: {
              ...mockCtx.prefs,
              theme: {
                configured: 'dark',
                effective: 'dark',
              },
            },
          },
          dispatch: mockDispatch,
        }}
      >
        <Router>
          <ThemeMode device="desktop" />
        </Router>
      </AppCtx.Provider>
    );

    const darkOpt = screen.getByRole('radio', { name: 'Dark' });
    expect(darkOpt).toBeChecked();
  });

  it('when autommatic theme is enabled', () => {
    render(
      <AppCtx.Provider
        value={{
          ctx: {
            ...mockCtx,
            prefs: {
              ...mockCtx.prefs,
              theme: {
                configured: 'automatic',
                effective: 'light',
              },
            },
          },
          dispatch: mockDispatch,
        }}
      >
        <Router>
          <ThemeMode device="desktop" />
        </Router>
      </AppCtx.Provider>
    );

    const automaticOpt = screen.getByRole('radio', { name: 'Automatic' });
    expect(automaticOpt).toBeChecked();
  });

  it('changes active theme', async () => {
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode device="desktop" />
        </Router>
      </AppCtx.Provider>
    );

    const lightOpt = screen.getByRole('radio', { name: 'Light' });
    expect(lightOpt).toBeChecked();

    const darkLabel = screen.getByText(/Dark/);
    const darkOpt = screen.getByRole('radio', { name: 'Dark' });
    expect(darkOpt).not.toBeChecked();
    await userEvent.click(darkLabel);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'updateTheme',
        theme: 'dark',
      });
    });
  });
});
