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

    jest.clearAllTimers();
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

    jest.advanceTimersByTime(5000);

    expect(subscriptionMock).toHaveBeenCalledWith(null);
    expect(subscriptionMock).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('dismiss alert with custom time', async () => {
    jest.useFakeTimers();

    alertDispatcher.subscribe({
      updateAlertWrapper: (alert: Alert | null) => subscriptionMock(alert),
    });

    alertDispatcher.postAlert({ ...alertSample, dismissOn: 3000 });

    jest.advanceTimersByTime(3000);

    expect(subscriptionMock).toHaveBeenCalledWith(null);
    expect(subscriptionMock).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
