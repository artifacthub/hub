import { waitFor } from '@testing-library/react';

import { UserNotification } from '../types';
import notificationsDispatcher from './userNotificationsDispatcher';

const updateUserNotificationMock = jest.fn();

const notificationSample = {
  id: 'id',
  body: 'Lorem ipsum',
};

describe('notificationsDispatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    const mockMath = Object.create(global.Math);
    mockMath.random = () => 0;
    global.Math = mockMath;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('starts dispatcher', async () => {
    notificationsDispatcher.subscribe({
      updateUserNotificationsWrapper: (notification: UserNotification | null) =>
        updateUserNotificationMock(notification),
    });

    notificationsDispatcher.start({
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    });

    await waitFor(() => {
      expect(updateUserNotificationMock).toHaveBeenCalledTimes(3);
      expect(updateUserNotificationMock).toHaveBeenLastCalledWith(null);
    });
  });

  it('dismiss notification', async () => {
    notificationsDispatcher.subscribe({
      updateUserNotificationsWrapper: (notification: UserNotification | null) =>
        updateUserNotificationMock(notification),
    });

    notificationsDispatcher.updateSettings({
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    });

    notificationsDispatcher.postNotification(notificationSample);
    notificationsDispatcher.dismissNotification();

    await waitFor(() => {
      expect(updateUserNotificationMock).toHaveBeenCalledTimes(2);
      expect(updateUserNotificationMock).toHaveBeenCalledWith(notificationSample);
      expect(updateUserNotificationMock).toHaveBeenLastCalledWith(null);
    });
  });
});
