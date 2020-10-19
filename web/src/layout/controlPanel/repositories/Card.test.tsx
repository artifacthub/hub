import { fireEvent, render, waitFor } from '@testing-library/react';
import moment from 'moment';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Repository } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import Card from './Card';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');
jest.mock('../../../utils/minutesToNearestInterval', () => () => 3);
jest.mock('./TransferModal', () => () => <div>Transfer repository</div>);

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const repoMock: Repository = {
  kind: 0,
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
  lastTrackingTs: null,
  userAlias: 'user',
  verifiedPublisher: false,
  official: false,
};

const setModalStatusMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  repository: repoMock,
  visibleTrackingErrorLogs: false,
  setModalStatus: setModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: onAuthErrorMock,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {},
    search: { limit: 25 },
    theme: {
      configured: 'light',
      automatic: false,
    },
  },
};

describe('Repository Card - packages section', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('creates snapshot', () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Card {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(getByText(repoMock.displayName!)).toBeInTheDocument();
      expect(getByTestId('getBadgeBtn')).toBeInTheDocument();
      expect(getByTestId('updateRepoBtn')).toBeInTheDocument();
      expect(getByTestId('transferRepoBtn')).toBeInTheDocument();
      expect(getByTestId('deleteRepoDropdownBtn')).toBeInTheDocument();
      expect(getByText(repoMock.url!)).toBeInTheDocument();
      expect(getByText('Not processed yet, it will be processed automatically in ~ 3 minutes')).toBeInTheDocument();
    });

    it('renders component with last tracking info', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: moment().unix(),
          lastTrackingErrors: 'errors tracking',
        },
      };
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      expect(getByText('a few seconds ago')).toBeInTheDocument();
      expect(getByText('Show errors log')).toBeInTheDocument();
    });

    it('renders verified publisher badge', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          verifiedPublisher: true,
        },
      };
      const { getAllByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      expect(getAllByText('Verified Publisher')).toHaveLength(2);
    });

    it('renders Official badge', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          official: true,
        },
      };
      const { getAllByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      expect(getAllByText('Official')).toHaveLength(2);
    });

    it('calls delete repo when delete button in dropdown is clicked', async () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const dropdownBtn = getByTestId('deleteRepoDropdownBtn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      const btn = getByTestId('deleteRepoBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });
    });

    it('opens Get Badge Modal when Get badge button is clicked', async () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = getByTestId('getBadgeBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(getByTestId('badgeModalContent')).toBeInTheDocument();
      });
    });

    it('calls setModalStatus when Edit button is clicked', async () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = getByTestId('updateRepoBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(setModalStatusMock).toHaveBeenCalledTimes(1);
        expect(setModalStatusMock).toHaveBeenCalledWith({
          open: true,
          repository: repoMock,
        });
      });
    });

    it('opens Transfer Repo when Transfer button is clicked', async () => {
      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = getByTestId('transferRepoBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(getByText('Transfer repository')).toBeInTheDocument();
      });
    });

    it('opens logs modal when visibleTrackingErrorLogs is true and repo has errors', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: moment().unix(),
          lastTrackingErrors: 'errors tracking',
        },
        visibleTrackingErrorLogs: true,
      };

      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );
      const { getByText, getByRole, rerender } = render(component);

      expect(getByText('Show errors log')).toBeInTheDocument();

      rerender(component);

      expect(getByRole('dialog')).toBeInTheDocument();
      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '' });
    });

    it('opens empty errors modal with default message when visibleTrackingErrorLogs is true and repo has not errors', () => {
      const props = {
        ...defaultProps,
        repository: {
          ...repoMock,
          lastTrackingTs: moment().unix(),
        },
        visibleTrackingErrorLogs: true,
      };
      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );
      const { queryByText, getByText, getByRole, rerender } = render(component);

      expect(queryByText('Show errors log')).toBeNull();

      rerender(component);

      expect(getByRole('dialog')).toBeInTheDocument();
      expect(
        getByText(/It looks like the last tracking of this repository worked fine and no errors were produced./g)
      ).toBeInTheDocument();
      expect(
        getByText(
          /If you have arrived to this screen from an email listing some errors, please keep in mind those may have been already solved./g
        )
      ).toBeInTheDocument();

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '' });
    });
  });

  describe('on deleteRepositoryError', () => {
    it('displays generic error', async () => {
      mocked(API).deleteRepository.mockRejectedValue({
        kind: ErrorKind.Other,
      });
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const dropdownBtn = getByTestId('deleteRepoDropdownBtn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      const btn = getByTestId('deleteRepoBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred deleting the repository, please try again later.',
      });
    });

    it('calls onAuthError', async () => {
      mocked(API).deleteRepository.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const dropdownBtn = getByTestId('deleteRepoDropdownBtn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      await waitFor(() => {
        const btn = getByTestId('deleteRepoBtn');
        fireEvent.click(btn);
      });

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
