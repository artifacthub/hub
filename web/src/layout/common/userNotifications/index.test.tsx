import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { AppCtx } from '../../../context/AppCtx';
import UserNotificationsController from './index';

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      automatic: false,
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

describe('UserNotificationsController', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    const mockMath = Object.create(global.Math);
    mockMath.random = () => 0;
    global.Math = mockMath;

    global.window = Object.create(window);
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://test.com',
        pathname: '/packages/search',
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    const component = result.getByRole('alert');

    await waitFor(() => {
      expect(component).toHaveClass('show isVisible');
    });

    expect(result.asFragment()).toMatchSnapshot();

    await waitFor(() => {
      expect(result.queryByTestId('notificationContent')).toBeNull();
    });

    await waitFor(() => {
      expect(component).not.toHaveClass('show isVisible');
    });
  });

  it('renders component', async () => {
    const { getByRole, getByTestId, getByText, queryByTestId } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    const component = getByRole('alert');
    expect(component).toBeInTheDocument();
    expect(component).not.toHaveClass('show');
    expect(component).toHaveClass('toast');
    expect(component).toBeEmptyDOMElement();

    await waitFor(() => {
      expect(component).toHaveClass('show isVisible');
      expect(getByTestId('disableNotificationsBtn')).toBeInTheDocument();
      expect(getByText("Don't show me more again")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(queryByTestId('notificationContent')).toBeNull();
    });

    await waitFor(() => {
      expect(component).not.toHaveClass('show isVisible');
    });
  });

  it('disabled notifications', async () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    const component = getByRole('alert');

    await waitFor(() => {
      expect(component).toHaveClass('show isVisible');
    });

    const disableBtn = getByTestId('disableNotificationsBtn');
    fireEvent.click(disableBtn);

    await waitFor(() => {
      expect(queryByTestId('notificationContent')).toBeNull();
    });

    await waitFor(() => {
      expect(component).not.toHaveClass('show isVisible');
    });
  });

  it('does not call userNotificationsDispatcher.start when user is undefined', () => {
    const { getByRole } = render(
      <AppCtx.Provider value={{ ctx: { ...mockCtx, user: undefined }, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    const component = getByRole('alert');
    expect(component).not.toHaveClass('show isVisible');
  });
});
