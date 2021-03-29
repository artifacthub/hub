import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import ThemeMode from './ThemeMode';

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
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
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode />
        </Router>
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  it('renders component', () => {
    const { getByTestId, getByText } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode />
        </Router>
      </AppCtx.Provider>
    );

    expect(getByTestId('themeOptions')).toBeInTheDocument();
    expect(getByText(/Automatic/g)).toBeInTheDocument();
    expect(getByText(/Light/g)).toBeInTheDocument();
    expect(getByText(/Dark/g)).toBeInTheDocument();
  });

  it('when theme is light', () => {
    const { getByTestId } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode />
        </Router>
      </AppCtx.Provider>
    );

    const lightOpt = getByTestId('radio-light');
    expect(lightOpt).toBeChecked();
  });

  it('when theme is dark', () => {
    const { getByTestId } = render(
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
          <ThemeMode />
        </Router>
      </AppCtx.Provider>
    );

    const darkOpt = getByTestId('radio-dark');
    expect(darkOpt).toBeChecked();
  });

  it('when autommatic theme is enabled', () => {
    const { getByTestId } = render(
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
          <ThemeMode />
        </Router>
      </AppCtx.Provider>
    );

    const automaticOpt = getByTestId('radio-automatic');
    expect(automaticOpt).toBeChecked();
  });

  it('changes active theme', () => {
    const { getByTestId, getByText } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ThemeMode />
        </Router>
      </AppCtx.Provider>
    );

    const lightOpt = getByTestId('radio-light');
    expect(lightOpt).toBeChecked();

    const darkLabel = getByText(/Dark/g);
    const darkOpt = getByTestId('radio-dark');
    expect(darkOpt).not.toBeChecked();
    fireEvent.click(darkLabel);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'updateTheme',
      theme: 'dark',
    });
  });
});
