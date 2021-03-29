import { waitFor } from '@testing-library/react';

import { UserNotification } from '../types';
import userNotificationsDispatcher from './userNotificationsDispatcher';

const updateUserNotificationMock = jest.fn();

const notificationSample = {
  id: 'id',
  body: 'Lorem ipsum',
};

jest.mock('./notifications.json', () => {
  return {
    notifications: [
      { body: 'Lorem ipsum' },
      {
        body: 'package usage tip',
        linkTip: 'package',
      },
    ],
  };
});

describe('userNotificationsDispatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    const mockMath = Object.create(global.Math);
    mockMath.random = () => 0;
    global.Math = mockMath;

    userNotificationsDispatcher.subscribe({
      updateUserNotificationsWrapper: (notification: UserNotification | null) =>
        updateUserNotificationMock(notification),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('starts dispatcher', async () => {
    userNotificationsDispatcher.start({
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    });

    await waitFor(() => {
      expect(updateUserNotificationMock).toHaveBeenCalledTimes(2);
      expect(updateUserNotificationMock).toHaveBeenLastCalledWith(null);
    });
  });

  it('dismiss notification', async () => {
    userNotificationsDispatcher.updateSettings({
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    });

    userNotificationsDispatcher.postNotification(notificationSample);
    userNotificationsDispatcher.dismissNotification();

    await waitFor(() => {
      expect(updateUserNotificationMock).toHaveBeenCalledTimes(2);
      expect(updateUserNotificationMock).toHaveBeenCalledWith(notificationSample);
      expect(updateUserNotificationMock).toHaveBeenLastCalledWith(null);
    });
  });

  it('update location', async () => {
    userNotificationsDispatcher.updateSettings({
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    });

    userNotificationsDispatcher.postNotification(notificationSample);
    userNotificationsDispatcher.dismissNotification('/packages/helm/hub/artifact-hub');

    await waitFor(() => {
      expect(updateUserNotificationMock).toHaveBeenCalledTimes(2);
      expect(updateUserNotificationMock).toHaveBeenNthCalledWith(1, { body: 'Lorem ipsum', id: 'id' });
      expect(updateUserNotificationMock).toHaveBeenNthCalledWith(2, null);
    });
  });
});
