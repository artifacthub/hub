import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../../api';
import { ErrorKind, Package } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import PackagesSection from '../index';
jest.mock('../../../../../../api');
jest.mock('../../../../../../utils/alertDispatcher');

const getMockSubscriptions = (fixtureId: string): Package[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Package[];
};

const mockOnAuthError = jest.fn();

const defaultProps = {
  onAuthError: mockOnAuthError,
};

describe('PackagesSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockSubscriptions = getMockSubscriptions('1');
    mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

    const result = render(
      <Router>
        <PackagesSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockSubscriptions = getMockSubscriptions('2');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { getByText, getAllByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Packages')).toBeInTheDocument();
      expect(getByText('Kind')).toBeInTheDocument();
      expect(getByText('Package')).toBeInTheDocument();
      expect(getByText('Publisher')).toBeInTheDocument();

      expect(getAllByTestId('packageLink')).toHaveLength(8);
      expect(getAllByTestId('packageCardLink')).toHaveLength(8);
      expect(getAllByTestId('userLink')).toHaveLength(1);
      expect(getAllByTestId('orgLink')).toHaveLength(7);
      expect(getAllByTestId('repoLink')).toHaveLength(8);
    });

    it('opens Add subscription modal', async () => {
      const mockSubscriptions = getMockSubscriptions('2');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { getByTestId, getByRole } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const modal = getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveClass('active');

      const btn = getByTestId('addSubscriptionsBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(modal).toHaveClass('active');
      });
    });
  });

  describe('Packages', () => {
    it('renders 8 packages', async () => {
      const mockSubscriptions = getMockSubscriptions('3');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { getAllByTestId, getAllByRole } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(getAllByTestId('subsTableCell')).toHaveLength(8);
        expect(getAllByRole('listitem')).toHaveLength(8);
      });
    });

    it('does not display list when no packages', async () => {
      const mockSubscriptions = getMockSubscriptions('4');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { queryByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const packagesList = queryByTestId('packagesList');

      expect(packagesList).toBeNull();
    });

    it('calls alertDispatcher when getUserSubscriptions call fails with not Unauthorized error', async () => {
      mocked(API).getUserSubscriptions.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred getting your subscriptions, please try again later.',
        });
      });
    });

    it('calls history push to load login modal when user is not signed in', async () => {
      mocked(API).getUserSubscriptions.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => expect(mockOnAuthError).toHaveBeenCalledTimes(1));
    });
  });

  describe('to change subscription', () => {
    it('to inactivate New release notification', async () => {
      const mockSubscriptions = getMockSubscriptions('5');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockResolvedValue('');

      const { getByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const checkbox: HTMLInputElement = getByTestId(
        `${mockSubscriptions[0].name}_newRelease_input`
      ) as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();

      const label = getByTestId(`${mockSubscriptions[0].name}_newRelease_label`);
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
      mocked(API).deleteSubscription.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByTestId, queryByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      expect(queryByTestId(`${mockSubscriptions[0].name}_newRelease_input`)).toBeInTheDocument();

      const label = getByTestId(`${mockSubscriptions[0].name}_newRelease_label`);
      fireEvent.click(label);

      // Remove it optimistically from document
      await waitFor(() => {
        expect(queryByTestId(`${mockSubscriptions[0].name}_newRelease_input`)).toBeNull();
      });

      expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
      expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions[0].packageId, 0);

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: `An error occurred unsubscribing from new releases notification for ${mockSubscriptions[0].name} package, please try again later.`,
      });

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(2);
      });

      // Add it again if subscription deletion failed
      await waitFor(() => {
        expect(queryByTestId(`${mockSubscriptions[0].name}_newRelease_input`)).toBeInTheDocument();
      });
    });

    it('UnauthorizedError', async () => {
      const mockSubscriptions = getMockSubscriptions('6');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      const { getByTestId, queryByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const label = getByTestId(`${mockSubscriptions[1].name}_newRelease_label`);
      fireEvent.click(label);

      await waitFor(() => {
        expect(queryByTestId(`${mockSubscriptions[1].name}_newRelease_input`)).toBeNull();
      });

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions[1].packageId, 0);
      });

      await waitFor(() => {
        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('click links', () => {
    it('on package link click', async () => {
      const mockSubscriptions = getMockSubscriptions('7');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { queryAllByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = queryAllByTestId('packageLink');
      expect(links).toHaveLength(8);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/helm/stable/airflow');
    });

    it('on user link click', async () => {
      const mockSubscriptions = getMockSubscriptions('8');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { queryAllByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = queryAllByTestId('userLink');
      expect(links).toHaveLength(1);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&user=jsmith');
    });

    it('on org link click', async () => {
      const mockSubscriptions = getMockSubscriptions('9');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { queryAllByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = queryAllByTestId('orgLink');
      expect(links).toHaveLength(8);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&org=helm');
    });

    it('on repo link click', async () => {
      const mockSubscriptions = getMockSubscriptions('10');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const { queryAllByTestId } = render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = queryAllByTestId('repoLink');
      expect(links).toHaveLength(8);
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?page=1&repo=stable');
    });
  });
});
