import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WebhookNotification } from '../../../../types';
import LastNotificationsModal from './LastNotificationsModal';
jest.mock('../../../../api');

const getMockNotifications = (fixtureId: string): WebhookNotification[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/LastNotificationsModal/${fixtureId}.json`) as WebhookNotification[];
};

describe('Repository LastNotificationsModal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockNotifications = getMockNotifications('1');
    const { asFragment } = render(<LastNotificationsModal notifications={mockNotifications} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component with errors', async () => {
      const mockNotifications = getMockNotifications('2');

      render(<LastNotificationsModal notifications={mockNotifications} />);

      expect(screen.getByText('Show last notifications')).toBeInTheDocument();
      expect(screen.getByTestId('lastNotifAlert')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /Open modal/ });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent('Show last notifications');

      await userEvent.click(btn);

      expect(await screen.findByText('Last notifications')).toBeInTheDocument();
      expect(screen.getAllByText('Notification id')).toHaveLength(2);
      expect(screen.getByText('Created at')).toBeInTheDocument();
      expect(screen.getByText('Processed at')).toBeInTheDocument();
      expect(screen.getByText('Succeeded')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Errors logs')).toBeInTheDocument();
      expect(screen.getAllByTestId('lastNotificationCell')).toHaveLength(7);
      expect(screen.getAllByTestId('lastNotificationErrorCell')).toHaveLength(3);
    });

    it('renders component without errors', async () => {
      const mockNotifications = getMockNotifications('3');

      render(<LastNotificationsModal notifications={mockNotifications} />);

      expect(screen.getByText('Show last notifications')).toBeInTheDocument();
      expect(screen.queryByTestId('lastNotifAlert')).toBeNull();

      const btn = screen.getByRole('button', { name: /Open modal/ });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent('Show last notifications');

      await userEvent.click(btn);

      expect(await screen.findByText('Last notifications')).toBeInTheDocument();
      expect(screen.getByText('Notification id')).toBeInTheDocument();
      expect(screen.getByText('Created at')).toBeInTheDocument();
      expect(screen.getByText('Processed at')).toBeInTheDocument();
      expect(screen.getByText('Succeeded')).toBeInTheDocument();
      expect(screen.getAllByTestId('lastNotificationCell')).toHaveLength(1);
      expect(screen.queryByText('Errors logs')).toBeNull();
    });

    describe('Cell types', () => {
      it('succeded notification', async () => {
        const mockNotifications = getMockNotifications('4');

        render(<LastNotificationsModal notifications={mockNotifications} />);

        expect(screen.queryByTestId('lastNotifAlert')).toBeNull();

        const btn = screen.getByRole('button', { name: /Open modal/ });
        await userEvent.click(btn);

        expect(await screen.findAllByTestId('lastNotificationCell')).toHaveLength(1);
        expect(screen.getByTestId('processedIcon')).toBeInTheDocument();
        expect(screen.getByTestId('succeededIcon')).toBeInTheDocument();
        expect(screen.queryByText('Errors logs')).toBeNull();
      });

      it('not processed notification', async () => {
        const mockNotifications = getMockNotifications('5');

        render(<LastNotificationsModal notifications={mockNotifications} />);

        expect(screen.queryByTestId('lastNotifAlert')).toBeNull();

        const btn = screen.getByRole('button', { name: /Open modal/ });
        await userEvent.click(btn);

        expect(await screen.findAllByTestId('lastNotificationCell')).toHaveLength(1);
        expect(screen.queryByTestId('processedIcon')).toBeNull();
        expect(screen.queryByTestId('succeededIcon')).toBeNull();
        expect(screen.queryByText('Errors logs')).toBeNull();
      });

      it('not succeded notification', async () => {
        const mockNotifications = getMockNotifications('6');

        render(<LastNotificationsModal notifications={mockNotifications} />);

        expect(screen.getByTestId('lastNotifAlert')).toBeInTheDocument();

        const btn = screen.getByRole('button', { name: /Open modal/ });
        await userEvent.click(btn);

        expect(await screen.findAllByTestId('lastNotificationCell')).toHaveLength(1);
        expect(screen.getByTestId('processedIcon')).toBeInTheDocument();
        expect(screen.getByTestId('failedIcon')).toBeInTheDocument();

        expect(screen.getAllByTestId('lastNotificationErrorCell')).toHaveLength(1);
        expect(screen.getByText('Errors logs')).toBeInTheDocument();
        expect(screen.getByText(mockNotifications[0].error!)).toBeInTheDocument();
      });
    });
  });
});
