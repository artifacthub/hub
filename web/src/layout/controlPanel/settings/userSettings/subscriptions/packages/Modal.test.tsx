import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../../api';
import { Package, SearchResults } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import SubscriptionModal from './Modal';
jest.mock('../../../../../../api');
jest.mock('../../../../../../utils/alertDispatcher');
const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();

const getMockSubscriptions = (fixtureId: string): Package[] => {
  return require(`./__fixtures__/Modal/${fixtureId}.json`) as Package[];
};

const getMockSearch = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/Modal/${fixtureId}s.json`) as SearchResults;
};

const defaultProps = {
  open: true,
  onSuccess: mockOnSuccess,
  onClose: mockOnClose,
  getNotificationTitle: () => 'new releases',
};

describe('SubscriptionModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('1')} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(
        <SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('2')} />
      );

      expect(getByText('Events')).toBeInTheDocument();
      expect(getByText('Package')).toBeInTheDocument();

      const btn = getByTestId('addSubsModalBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();

      const radio = getByTestId('radio_0');
      expect(radio).toBeInTheDocument();
      expect(radio).toBeChecked();
    });
  });

  describe('Renders some disabled packages', () => {
    it('first 2 disabled', async () => {
      const mockSearch = getMockSearch('3');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getAllByTestId, getByTestId } = render(
        <SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('3')} />
      );

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = getAllByTestId('packageItem');
      expect(buttons).toHaveLength(8);
      expect(buttons[0]).toHaveClass('disabledCell');
      expect(buttons[1]).toHaveClass('disabledCell');
      expect(buttons[2]).toHaveClass('clickableCell');
      expect(buttons[3]).toHaveClass('clickableCell');
      expect(buttons[4]).toHaveClass('clickableCell');
      expect(buttons[5]).toHaveClass('clickableCell');
      expect(buttons[6]).toHaveClass('clickableCell');
      expect(buttons[7]).toHaveClass('clickableCell');
    });

    it('all enabled', async () => {
      const mockSearch = getMockSearch('4');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getAllByTestId, getByTestId } = render(
        <SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('4')} />
      );

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = getAllByTestId('packageItem');
      expect(buttons[0]).toHaveClass('clickableCell');
      expect(buttons[1]).toHaveClass('clickableCell');
    });

    it('all disabled', async () => {
      const mockSearch = getMockSearch('5');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getAllByTestId, getByTestId } = render(
        <SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('5')} />
      );

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = getAllByTestId('packageItem');
      expect(buttons[0]).toHaveClass('disabledCell');
      expect(buttons[1]).toHaveClass('disabledCell');
    });

    it('one disabled', async () => {
      const mockSearch = getMockSearch('6');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getAllByTestId, getByTestId } = render(
        <SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('6')} />
      );

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = getAllByTestId('packageItem');
      expect(buttons[0]).toHaveClass('disabledCell');
      expect(buttons[1]).toHaveClass('clickableCell');
    });
  });

  describe('calls addSubscription', () => {
    it('when is successful', async () => {
      const mockSearch = getMockSearch('7');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);
      mocked(API).addSubscription.mockResolvedValue('');

      const { getAllByTestId, getByTestId, queryByTestId } = render(
        <SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('7')} />
      );

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = getAllByTestId('packageItem');
      fireEvent.click(buttons[0]);

      const activePackage = getByTestId('activePackageItem');

      expect(activePackage).toBeInTheDocument();
      expect(activePackage).toHaveTextContent(
        `${mockSearch.data.packages![0].name}${mockSearch.data.packages![0].repository.organizationDisplayName}(Repo: ${
          mockSearch.data.packages![0].repository.displayName
        })`
      );

      expect(queryByTestId('searchPackagesInput')).toBeNull();

      const btn = getByTestId('addSubsModalBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.addSubscription).toHaveBeenCalledTimes(1);
        expect(API.addSubscription).toHaveBeenCalledWith(mockSearch.data.packages![0].packageId, 0);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('when fails', async () => {
      const mockSearch = getMockSearch('8');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);
      mocked(API).addSubscription.mockRejectedValue({});

      const { getAllByTestId, getByTestId, queryByTestId } = render(
        <SubscriptionModal {...defaultProps} subscriptions={getMockSubscriptions('8')} />
      );

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = getAllByTestId('packageItem');
      fireEvent.click(buttons[0]);

      const activePackage = getByTestId('activePackageItem');

      expect(activePackage).toBeInTheDocument();
      expect(activePackage).toHaveTextContent(
        `${mockSearch.data.packages![0].name}${mockSearch.data.packages![0].repository.organizationDisplayName}(Repo: ${
          mockSearch.data.packages![0].repository.displayName
        })`
      );

      expect(queryByTestId('searchPackagesInput')).toBeNull();

      const btn = getByTestId('addSubsModalBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.addSubscription).toHaveBeenCalledTimes(1);
        expect(API.addSubscription).toHaveBeenCalledWith(mockSearch.data.packages![0].packageId, 0);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: `An error occurred subscribing to new releases notification for ${
          mockSearch.data.packages![0].name
        } package, please try again later.`,
      });
    });
  });
});
