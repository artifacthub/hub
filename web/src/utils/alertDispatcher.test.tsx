import { waitFor } from '@testing-library/react';

import { Alert } from '../types';
import alertDispatcher from './alertDispatcher';

const subscriptionMock = jest.fn();

const alertSample: Alert = {
  type: 'success',
  message: 'alert',
};

describe('alertDispatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('receives alert after subscription', async () => {
    alertDispatcher.subscribe({
      updateAlertWrapper: (alert: Alert | null) => subscriptionMock(alert),
    });

    alertDispatcher.postAlert(alertSample);

    expect(subscriptionMock).toHaveBeenCalledTimes(1);
    expect(subscriptionMock).toHaveBeenCalledWith(alertSample);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    alertDispatcher.postAlert(null);

    expect(clearTimeout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(subscriptionMock).toHaveBeenCalledTimes(2);
      expect(subscriptionMock).toHaveBeenCalledWith(null);
    });
  });

  it('dismiss alert when default time has finished', async () => {
    alertDispatcher.subscribe({
      updateAlertWrapper: (alert: Alert | null) => subscriptionMock(alert),
    });

    alertDispatcher.postAlert(alertSample);

    expect(subscriptionMock).toHaveBeenCalledTimes(1);
    expect(subscriptionMock).toHaveBeenCalledWith(alertSample);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

    await waitFor(() => {
      expect(subscriptionMock).toHaveBeenCalledTimes(2);
      expect(subscriptionMock).toHaveBeenCalledWith(null);
    });
  });

  it('dismiss alert with custom time', async () => {
    alertDispatcher.subscribe({
      updateAlertWrapper: (alert: Alert | null) => subscriptionMock(alert),
    });

    alertDispatcher.postAlert({ ...alertSample, dismissOn: 3000 });

    await waitFor(() => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    });
  });
});
