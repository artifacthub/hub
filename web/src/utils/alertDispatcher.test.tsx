import { waitFor } from '@testing-library/react';

import { Alert } from '../types';
import alertDispatcher from './alertDispatcher';

const subscriptionMock = jest.fn();

const alertSample: Alert = {
  type: 'success',
  message: 'alert',
};

describe('alertDispatcher', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('receives alert after subscription', async () => {
    jest.useFakeTimers();

    alertDispatcher.subscribe({
      updateAlertWrapper: (alert: Alert | null) => subscriptionMock(alert),
    });

    alertDispatcher.postAlert(alertSample);

    expect(subscriptionMock).toHaveBeenCalledTimes(1);
    expect(subscriptionMock).toHaveBeenCalledWith(alertSample);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    alertDispatcher.postAlert(null);

    expect(clearTimeout).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(subscriptionMock).toHaveBeenCalledWith(null));

    expect(subscriptionMock).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('dismiss alert when default time has finished', async () => {
    jest.useFakeTimers();

    alertDispatcher.subscribe({
      updateAlertWrapper: (alert: Alert | null) => subscriptionMock(alert),
    });

    alertDispatcher.postAlert(alertSample);

    expect(subscriptionMock).toHaveBeenCalledTimes(1);
    expect(subscriptionMock).toHaveBeenCalledWith(alertSample);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

    await waitFor(() => expect(subscriptionMock).toHaveBeenCalledWith(null));
    expect(subscriptionMock).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('dismiss alert with custom time', async () => {
    jest.useFakeTimers();

    alertDispatcher.subscribe({
      updateAlertWrapper: (alert: Alert | null) => subscriptionMock(alert),
    });

    alertDispatcher.postAlert({ ...alertSample, dismissOn: 3000 });

    await waitFor(() => expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000));
    expect(setTimeout).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
