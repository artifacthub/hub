import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { Package } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import buildPackageURL from '../../utils/buildPackageURL';
import SubscriptionsView from './index';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const getMockSubscriptions = (fixtureId: string): Package[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Package[];
};

describe('SubscriptionsView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    const mockSubscriptions = getMockSubscriptions('1');
    mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

    const result = render(
      <Router>
        <SubscriptionsView />
      </Router>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockSubscriptions = getMockSubscriptions('2');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Your subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Kind')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();
      expect(screen.getByText('Publisher')).toBeInTheDocument();

      expect(screen.getAllByTestId('packageLink')).toHaveLength(8 * 2);
      expect(screen.getAllByTestId('userLink')).toHaveLength(1 * 2);
      expect(screen.getAllByTestId('orgLink')).toHaveLength(7 * 2);
      expect(screen.getAllByTestId('repoLink')).toHaveLength(5 * 2);
    });
  });

  describe('Packages', () => {
    it('renders 8 packages', async () => {
      const mockSubscriptions = getMockSubscriptions('3');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );
      await waitFor(() => {
        expect(screen.getAllByTestId('subsTableCell')).toHaveLength(8);
        expect(screen.getAllByRole('listitem')).toHaveLength(8);
      });

      await waitFor(() => {});
    });

    it('displays no data component when no packages', async () => {
      const mockSubscriptions = getMockSubscriptions('4');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      const noData = await waitFor(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('You have not subscribed to any package yet');

      await waitFor(() => {});
    });

    it('renders error message when getUserSubscriptions call fails with not 401', async () => {
      mocked(API).getUserSubscriptions.mockRejectedValue({ statusText: 'another error' });

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      const noData = await waitFor(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting your subscriptions, please try again later/i);

      await waitFor(() => {});
    });

    it('calls history push to load login modal when user is not signed in', async () => {
      mocked(API).getUserSubscriptions.mockRejectedValue({ statusText: 'ErrLoginRedirect' });

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => screen.getByRole('main'));

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith('/login?redirect=/user/subscriptions');
      await waitFor(() => {});
    });
  });

  describe('to change subscription', () => {
    it('to inactivate New release notification', async () => {
      const mockSubscriptions = getMockSubscriptions('5');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockResolvedValue('');

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const checkbox: HTMLInputElement = screen.getByTestId(
        `${mockSubscriptions[0].name}_newRelease_input`
      ) as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();

      const label = screen.getByTestId(`${mockSubscriptions[0].name}_newRelease_label`);
      fireEvent.click(label);

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions[0].packageId, 0);
      });

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('when change subscription fails', () => {
    it('generic error', async () => {
      const mockSubscriptions = getMockSubscriptions('6');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockRejectedValue({ statusText: 'error' });

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      expect(screen.queryByTestId(`${mockSubscriptions[0].name}_newRelease_input`)).toBeInTheDocument();

      const label = screen.getByTestId(`${mockSubscriptions[0].name}_newRelease_label`);
      fireEvent.click(label);

      // Remove it optimistically from document
      await waitFor(() => {
        expect(screen.queryByTestId(`${mockSubscriptions[0].name}_newRelease_input`)).toBeNull();
      });

      expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
      expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions[0].packageId, 0);

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: `An error occurred unsubscribing from New releases notification for ${mockSubscriptions[0].name} package, please try again later`,
      });

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(2);
      });

      // Add it again if subscription deletion failed
      await waitFor(() => {
        expect(screen.queryByTestId(`${mockSubscriptions[0].name}_newRelease_input`)).toBeInTheDocument();
      });
    });

    it('401 error', async () => {
      const mockSubscriptions = getMockSubscriptions('6');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockRejectedValue({ statusText: 'ErrLoginRedirect' });

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const label = screen.getByTestId(`${mockSubscriptions[1].name}_newRelease_label`);
      fireEvent.click(label);

      await waitFor(() => {
        expect(screen.queryByTestId(`${mockSubscriptions[1].name}_newRelease_input`)).toBeNull();
      });

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions[1].packageId, 0);
      });

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith('/login?redirect=/user/subscriptions');
      });
    });
  });

  describe('click links', () => {
    it('on package link click', async () => {
      const mockSubscriptions = getMockSubscriptions('7');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = screen.queryAllByTestId('packageLink');
      expect(links).toHaveLength(8 * 2);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe(buildPackageURL(mockSubscriptions[0]));
    });

    it('on user link click', async () => {
      const mockSubscriptions = getMockSubscriptions('8');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = screen.queryAllByTestId('userLink');
      expect(links).toHaveLength(1 * 2);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&user=jsmith');
    });

    it('on org link click', async () => {
      const mockSubscriptions = getMockSubscriptions('9');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = screen.queryAllByTestId('orgLink');
      expect(links).toHaveLength(7 * 2);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&org=helm');
    });

    it('on repo link click', async () => {
      const mockSubscriptions = getMockSubscriptions('10');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <SubscriptionsView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = screen.queryAllByTestId('repoLink');
      expect(links).toHaveLength(5 * 2);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&repo=stable');
    });
  });
});
