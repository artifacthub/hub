import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Repository } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import DeletionModal from './DeletionModal';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

const onAuthErrorMock = jest.fn();
const onSuccessMock = jest.fn();
const setDeletionModalStatusMock = jest.fn();

const repoMock: Repository = {
  kind: 0,
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
  userAlias: 'user',
  verifiedPublisher: false,
  official: false,
};

const defaultProps = {
  repository: repoMock,
  onAuthError: onAuthErrorMock,
  onSuccess: onSuccessMock,
  setDeletionModalStatus: setDeletionModalStatusMock,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

describe('Deletion modal Modal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <DeletionModal {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(screen.getByText('Delete repository')).toBeInTheDocument();
      expect(screen.getByText('Important:')).toBeInTheDocument();
      expect(screen.getByText('Please read this carefully.')).toBeInTheDocument();
      expect(
        screen.getByText(
          /All information related to your repository or packages will be permanently deleted as well. This includes packages' stars, users subscriptions to packages, webhooks, events and notifications./
        )
      ).toBeInTheDocument();
      expect(screen.getByText('repoTest')).toBeInTheDocument();

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete repository' })).toBeInTheDocument();
    });

    it('calls delete repo when delete button in dropdown is clicked', async () => {
      mocked(API).deleteRepository.mockResolvedValue(null);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'repoTest');

      const btn = await screen.findByRole('button', { name: 'Delete repository' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });
    });

    it('renders disabled input until user enters repo name', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = screen.getByRole('button', { name: 'Delete repository' });
      expect(btn).toBeDisabled();

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'repoTest');

      expect(btn).toBeEnabled();
    });
  });

  describe('on deleteRepositoryError', () => {
    it('displays generic error', async () => {
      mocked(API).deleteRepository.mockRejectedValue({
        kind: ErrorKind.Other,
      });
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'repoTest');

      const btn = await screen.findByRole('button', { name: 'Delete repository' });
      await userEvent.click(btn);

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
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'repoTest');

      const btn = await screen.findByRole('button', { name: 'Delete repository' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
