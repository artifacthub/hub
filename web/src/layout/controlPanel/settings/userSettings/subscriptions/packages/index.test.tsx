import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../../../../api';
import { ErrorKind } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import PackagesSection from '../index';
jest.mock('../../../../../../api');
jest.mock('../../../../../../utils/alertDispatcher');

const getMockSubscriptions = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`);
};

const mockOnAuthError = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

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

    const { asFragment } = render(
      <Router>
        <PackagesSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Kind')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockSubscriptions = getMockSubscriptions('2');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Packages')).toBeInTheDocument();
      expect(await screen.findByText('Kind')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();
      expect(screen.getByText('Publisher')).toBeInTheDocument();

      expect(screen.getAllByTestId('packageLink')).toHaveLength(8);
      expect(screen.getAllByTestId('packageCardLink')).toHaveLength(8);
      expect(screen.getAllByTestId('userLink')).toHaveLength(1);
      expect(screen.getAllByTestId('orgLink')).toHaveLength(7);
      expect(screen.getAllByTestId('repoLink')).toHaveLength(8);
    });

    it('opens Add subscription modal', async () => {
      const mockSubscriptions = getMockSubscriptions('2');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).not.toHaveClass('active');

      const btn = screen.getByRole('button', { name: 'Open subscription modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toHaveClass('active');
    });
  });

  describe('Packages', () => {
    it('renders 8 packages', async () => {
      const mockSubscriptions = getMockSubscriptions('3');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('subsTableCell')).toHaveLength(8);
        expect(screen.getAllByRole('listitem')).toHaveLength(8);
      });
    });

    it('does not display list when no packages', async () => {
      const mockSubscriptions = getMockSubscriptions('4');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('packagesList')).toBeNull();
      });
    });

    it('calls alertDispatcher when getUserSubscriptions call fails with not Unauthorized error', async () => {
      mocked(API).getUserSubscriptions.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred getting your subscriptions, please try again later.',
        });
      });
    });

    it('calls navigate to load login modal when user is not signed in', async () => {
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

  xit('loads first page when not subscriptions after deleting one', async () => {
    const mockSubscriptions = getMockSubscriptions('11');
    mocked(API).deleteSubscription.mockResolvedValue('');
    mocked(API)
      .getUserSubscriptions.mockResolvedValue(mockSubscriptions)
      .mockResolvedValueOnce(mockSubscriptions)
      .mockResolvedValueOnce(mockSubscriptions)
      .mockResolvedValueOnce({
        items: [],
        paginationTotalCount: '12',
      });

    render(
      <Router>
        <PackagesSection {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      expect(API.getUserSubscriptions).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    });

    const nextBtn = await screen.findAllByRole('button', { name: 'Open page 2' });
    await userEvent.click(nextBtn[1]);

    await waitFor(() => {
      expect(API.getUserSubscriptions).toHaveBeenCalledTimes(2);
      expect(API.getUserSubscriptions).toHaveBeenCalledWith({ limit: 10, offset: 10 });
    });

    const input = await screen.findByTestId(`${mockSubscriptions.items[0].name}_newRelease_input`);
    await userEvent.click(input);

    await waitFor(() => {
      expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
      expect(API.getUserSubscriptions).toHaveBeenCalledTimes(4);
      expect(API.getUserSubscriptions).toHaveBeenCalledWith({ limit: 10, offset: 10 });
      expect(API.getUserSubscriptions).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    });
  });

  describe('to change subscription', () => {
    it('to inactivate New release notification', async () => {
      const mockSubscriptions = getMockSubscriptions('5');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockResolvedValue('');

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => expect(screen.getAllByTestId('subsTableCell')).toHaveLength(8));

      const checkbox: HTMLInputElement = (await screen.findByTestId(
        `${mockSubscriptions.items[0].name}_newRelease_input`
      )) as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();

      await userEvent.click(checkbox);

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions.items[0].packageId, 0);
      });

      await waitFor(() => expect(checkbox).not.toBeChecked());

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => expect(checkbox).not.toBeChecked());
    });
  });

  describe('when change subscription fails', () => {
    xit('generic error', async () => {
      const mockSubscriptions = getMockSubscriptions('6');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const checkbox = await screen.findByTestId(`${mockSubscriptions.items[0].name}_newRelease_input`);
      expect(checkbox).toBeInTheDocument();
      await userEvent.click(checkbox);

      // Remove it optimistically from document
      await waitFor(() => {
        expect(screen.queryByTestId(`${mockSubscriptions.items[0].name}_newRelease_input`)).toBeNull();
      });

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions.items[0].packageId, 0);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: `An error occurred unsubscribing from new releases notification for ${mockSubscriptions.items[0].name} package, please try again later.`,
        });
      });

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(2);
      });

      // Add it again if subscription deletion failed
      expect(await screen.findByTestId(`${mockSubscriptions.items[0].name}_newRelease_input`)).toBeInTheDocument();
    });

    xit('UnauthorizedError', async () => {
      const mockSubscriptions = getMockSubscriptions('6');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);
      mocked(API).deleteSubscription.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const checkbox = await screen.findByTestId(`${mockSubscriptions.items[1].name}_newRelease_input`);
      await userEvent.click(checkbox);

      await waitFor(() => {
        expect(screen.queryByTestId(`${mockSubscriptions.items[1].name}_newRelease_input`)).toBeNull();
      });

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(mockSubscriptions.items[1].packageId, 0);
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

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = await screen.findAllByTestId('packageLink');
      expect(links).toHaveLength(8);
      await userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/helm/stable/airflow');
    });

    it('on user link click', async () => {
      const mockSubscriptions = getMockSubscriptions('8');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = await screen.findAllByTestId('userLink');
      expect(links).toHaveLength(1);
      await userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?user=jsmith&sort=relevance&page=1');
    });

    it('on org link click', async () => {
      const mockSubscriptions = getMockSubscriptions('9');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = await screen.findAllByTestId('orgLink');
      expect(links).toHaveLength(8);
      await userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?org=helm&sort=relevance&page=1');
    });

    it('on repo link click', async () => {
      const mockSubscriptions = getMockSubscriptions('10');
      mocked(API).getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      render(
        <Router>
          <PackagesSection {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getUserSubscriptions).toHaveBeenCalledTimes(1);
      });

      const links = await screen.findAllByTestId('repoLink');
      expect(links).toHaveLength(8);
      await userEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe('?repo=stable&sort=relevance&page=1');
    });
  });
});
