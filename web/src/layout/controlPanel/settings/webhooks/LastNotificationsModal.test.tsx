import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { WebhookNotification } from '../../../../types';
import LastNotificationsModal from './LastNotificationsModal';
jest.mock('../../../../api');

const getMockNotifications = (fixtureId: string): WebhookNotification[] => {
  return require(`./__fixtures__/LastNotificationsModal/${fixtureId}.json`) as WebhookNotification[];
};

describe('Repository LastNotificationsModal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockNotifications = getMockNotifications('1');
    const result = render(<LastNotificationsModal notifications={mockNotifications} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component with errors', () => {
      const mockNotifications = getMockNotifications('2');

      const { getByText, getByTestId, getAllByText, getAllByTestId } = render(
        <LastNotificationsModal notifications={mockNotifications} />
      );

      expect(getByText('Show last notifications')).toBeInTheDocument();
      expect(getByTestId('lastNotifAlert')).toBeInTheDocument();

      const btn = getByTestId('openModalBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent('Show last notifications');

      fireEvent.click(btn);

      expect(getByText('Last notifications')).toBeInTheDocument();
      expect(getAllByText('Notification id')).toHaveLength(2);
      expect(getByText('Created at')).toBeInTheDocument();
      expect(getByText('Processed at')).toBeInTheDocument();
      expect(getByText('Succeeded')).toBeInTheDocument();
      expect(getByText('Error')).toBeInTheDocument();
      expect(getByText('Errors logs')).toBeInTheDocument();
      expect(getAllByTestId('lastNotificationCell')).toHaveLength(7);
      expect(getAllByTestId('lastNotificationErrorCell')).toHaveLength(3);
    });

    it('renders component without errors', () => {
      const mockNotifications = getMockNotifications('3');

      const { getByText, getByTestId, getAllByTestId, queryByText, queryByTestId } = render(
        <LastNotificationsModal notifications={mockNotifications} />
      );

      expect(getByText('Show last notifications')).toBeInTheDocument();
      expect(queryByTestId('lastNotifAlert')).toBeNull();

      const btn = getByTestId('openModalBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent('Show last notifications');

      fireEvent.click(btn);

      expect(getByText('Last notifications')).toBeInTheDocument();
      expect(getByText('Notification id')).toBeInTheDocument();
      expect(getByText('Created at')).toBeInTheDocument();
      expect(getByText('Processed at')).toBeInTheDocument();
      expect(getByText('Succeeded')).toBeInTheDocument();
      expect(getAllByTestId('lastNotificationCell')).toHaveLength(1);
      expect(queryByText('Errors logs')).toBeNull();
    });

    describe('Cell types', () => {
      it('succeded notification', () => {
        const mockNotifications = getMockNotifications('4');

        const { getByTestId, getAllByTestId, queryByText, queryByTestId } = render(
          <LastNotificationsModal notifications={mockNotifications} />
        );

        expect(queryByTestId('lastNotifAlert')).toBeNull();

        const btn = getByTestId('openModalBtn');
        fireEvent.click(btn);

        expect(getAllByTestId('lastNotificationCell')).toHaveLength(1);
        expect(getByTestId('processedIcon')).toBeInTheDocument();
        expect(getByTestId('succeededIcon')).toBeInTheDocument();
        expect(queryByText('Errors logs')).toBeNull();
      });

      it('not processed notification', () => {
        const mockNotifications = getMockNotifications('5');

        const { queryByTestId, getByTestId, getAllByTestId, queryByText } = render(
          <LastNotificationsModal notifications={mockNotifications} />
        );

        expect(queryByTestId('lastNotifAlert')).toBeNull();

        const btn = getByTestId('openModalBtn');
        fireEvent.click(btn);

        expect(getAllByTestId('lastNotificationCell')).toHaveLength(1);
        expect(queryByTestId('processedIcon')).toBeNull();
        expect(queryByTestId('succeededIcon')).toBeNull();
        expect(queryByText('Errors logs')).toBeNull();
      });

      it('not succeded notification', () => {
        const mockNotifications = getMockNotifications('6');

        const { getByTestId, getAllByTestId, getByText } = render(
          <LastNotificationsModal notifications={mockNotifications} />
        );

        expect(getByTestId('lastNotifAlert')).toBeInTheDocument();

        const btn = getByTestId('openModalBtn');
        fireEvent.click(btn);

        expect(getAllByTestId('lastNotificationCell')).toHaveLength(1);
        expect(getByTestId('processedIcon')).toBeInTheDocument();
        expect(getByTestId('failedIcon')).toBeInTheDocument();

        expect(getAllByTestId('lastNotificationErrorCell')).toHaveLength(1);
        expect(getByText('Errors logs')).toBeInTheDocument();
        expect(getByText(mockNotifications[0].error!)).toBeInTheDocument();
      });
    });
  });
});
