import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import API from '../../../../../../api';
import { Package, SearchResults } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import SubscriptionModal from './Modal';
vi.mock('../../../../../../api');
vi.mock('../../../../../../utils/alertDispatcher');
const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();

const getMockSubscriptions = (fixtureId: string): Package[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Modal/${fixtureId}.json`) as Package[];
};

const getMockSearch = (fixtureId: string): SearchResults => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Modal/${fixtureId}s.json`) as SearchResults;
};

const defaultProps = {
  open: true,
  onSuccess: mockOnSuccess,
  onClose: mockOnClose,
  getNotificationTitle: () => 'new releases',
};

const hasClassContaining = (element: Element, token: string): boolean =>
  Array.from(element.classList).some((cls) => cls.includes(token));

describe('SubscriptionModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('1')} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('2')} />);

      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Add subscription' });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
    });
  });

  describe('Renders some disabled packages', () => {
    it('first 2 disabled', async () => {
      const mockSearch = getMockSearch('3');
      vi.mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('3')} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'testing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('packageItem');
      expect(buttons).toHaveLength(8);
      expect(hasClassContaining(buttons[0], 'disabledCell')).toBe(true);
      expect(hasClassContaining(buttons[1], 'disabledCell')).toBe(true);
      expect(hasClassContaining(buttons[2], 'clickableCell')).toBe(true);
      expect(hasClassContaining(buttons[3], 'clickableCell')).toBe(true);
      expect(hasClassContaining(buttons[4], 'clickableCell')).toBe(true);
      expect(hasClassContaining(buttons[5], 'clickableCell')).toBe(true);
      expect(hasClassContaining(buttons[6], 'clickableCell')).toBe(true);
      expect(hasClassContaining(buttons[7], 'clickableCell')).toBe(true);
    });

    it('all enabled', async () => {
      const mockSearch = getMockSearch('4');
      vi.mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('4')} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'testing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('packageItem');
      expect(hasClassContaining(buttons[0], 'clickableCell')).toBe(true);
      expect(hasClassContaining(buttons[1], 'clickableCell')).toBe(true);
    });

    it('all disabled', async () => {
      const mockSearch = getMockSearch('5');
      vi.mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('5')} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'testing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('packageItem');
      expect(hasClassContaining(buttons[0], 'disabledCell')).toBe(true);
      expect(hasClassContaining(buttons[1], 'disabledCell')).toBe(true);
    });

    it('one disabled', async () => {
      const mockSearch = getMockSearch('6');
      vi.mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('6')} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'testing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('packageItem');
      expect(hasClassContaining(buttons[0], 'disabledCell')).toBe(true);
      expect(hasClassContaining(buttons[1], 'clickableCell')).toBe(true);
    });
  });

  describe('calls addSubscription', () => {
    it('when is successful', async () => {
      const mockSearch = getMockSearch('7');
      vi.mocked(API).searchPackages.mockResolvedValue(mockSearch);
      vi.mocked(API).addSubscription.mockResolvedValue('');

      render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('7')} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'testing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('packageItem');
      await userEvent.click(buttons[0]);

      const activePackage = await screen.findByTestId('activePackageItem');

      expect(activePackage).toBeInTheDocument();
      expect(activePackage).toHaveTextContent('airflow/Helm(Repo: Stable)Helm(Repo: Stable)');

      expect(screen.queryByRole('textbox', { name: 'Search packages' })).toBeNull();

      const btn = screen.getByRole('button', { name: 'Add subscription' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.addSubscription).toHaveBeenCalledTimes(1);
        expect(API.addSubscription).toHaveBeenCalledWith(mockSearch.packages![0].packageId, 0);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('when fails', async () => {
      const mockSearch = getMockSearch('8');
      vi.mocked(API).searchPackages.mockResolvedValue(mockSearch);
      vi.mocked(API).addSubscription.mockRejectedValue({});

      render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('8')} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'testing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('packageItem');
      await userEvent.click(buttons[0]);

      const activePackage = await screen.findByTestId('activePackageItem');

      expect(activePackage).toBeInTheDocument();
      expect(activePackage).toHaveTextContent('airflow/Helm(Repo: Stable)Helm(Repo: Stable)');

      expect(screen.queryByRole('textbox', { name: 'Search packages' })).toBeNull();

      const btn = screen.getByRole('button', { name: 'Add subscription' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.addSubscription).toHaveBeenCalledTimes(1);
        expect(API.addSubscription).toHaveBeenCalledWith(mockSearch.packages![0].packageId, 0);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: `An error occurred subscribing to new releases notification for airflow package, please try again later.`,
        });
      });
    });
  });
});
