import { render, screen, waitFor } from '@testing-library/react';

import { AppCtx } from '../../../context/AppCtx';
import { UserNotification } from '../../../types';
import userNotificationsDispatcher from '../../../utils/userNotificationsDispatcher';
import UserNotificationsController from './index';
jest.mock('react-markdown', () => () => <div />);
jest.mock('remark-gfm', () => () => <div />);
jest.mock('../../../utils/userNotificationsDispatcher', () => ({
  subscribe: jest.fn(),
  close: jest.fn(),
  start: jest.fn(),
  updateSettings: jest.fn(),
}));

const updateUserNotificationMock = jest.fn();

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

describe('UserNotificationsController', () => {
  beforeEach(() => {
    const mockMath = Object.create(global.Math);
    mockMath.random = () => 0;
    global.Math = mockMath;

    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://test.com',
        pathname: '/packages/search',
      },
      writable: true,
    });

    userNotificationsDispatcher.subscribe({
      updateUserNotificationsWrapper: (notification: UserNotification | null) =>
        updateUserNotificationMock(notification),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(userNotificationsDispatcher.start).toHaveBeenCalledTimes(1);
    });

    expect(asFragment()).toMatchSnapshot();
  });

  it('renders component', async () => {
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    const component = screen.getByRole('alert');
    expect(component).toBeInTheDocument();
    expect(component).not.toHaveClass('show');
    expect(component).toHaveClass('toast');

    await waitFor(() => {
      expect(userNotificationsDispatcher.start).toHaveBeenCalledWith(
        {
          displayed: [],
          enabled: true,
          lastDisplayedTime: null,
        },
        'lg'
      );
    });
    expect(userNotificationsDispatcher.start).toHaveBeenCalledTimes(1);
  });

  it('does not call userNotificationsDispatcher.start when user is undefined', async () => {
    render(
      <AppCtx.Provider value={{ ctx: { ...mockCtx, user: undefined }, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(userNotificationsDispatcher.start).toHaveBeenCalledTimes(0);
    });
  });

  it('does not call userNotificationsDispatcher.updateSettings when user is undefined', async () => {
    render(
      <AppCtx.Provider value={{ ctx: { ...mockCtx, user: undefined }, dispatch: jest.fn() }}>
        <UserNotificationsController />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(userNotificationsDispatcher.updateSettings).toHaveBeenCalledTimes(0);
    });
  });
});
