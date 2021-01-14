import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
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
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      automatic: false,
    },
  },
};

describe('Deletion modal Modal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <DeletionModal {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      expect(getByText('Delete repository')).toBeInTheDocument();
      expect(getByText('Important:')).toBeInTheDocument();
      expect(getByText('Please read this carefully.')).toBeInTheDocument();
      expect(
        getByText(
          /All information related to your repository or packages will be permanently deleted as well. This includes packages' stars, users subscriptions to packages, webhooks, events and notifications./g
        )
      ).toBeInTheDocument();
      expect(getByText('repoTest')).toBeInTheDocument();

      expect(getByTestId('repoNameInput')).toBeInTheDocument();
      expect(getByTestId('deleteRepoBtn')).toBeInTheDocument();
    });

    it('calls delete repo when delete button in dropdown is clicked', async () => {
      mocked(API).deleteRepository.mockResolvedValue(null);

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = getByTestId('repoNameInput');
      fireEvent.change(input, { target: { value: 'repoTest' } });

      const btn = getByTestId('deleteRepoBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });
    });

    it('renders disabled input until user enters repo name', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const btn = getByTestId('deleteRepoBtn');
      expect(btn).toBeDisabled();

      const input = getByTestId('repoNameInput');
      fireEvent.change(input, { target: { value: 'repoTest' } });

      expect(btn).toBeEnabled();
    });
  });

  describe('on deleteRepositoryError', () => {
    it('displays generic error', async () => {
      mocked(API).deleteRepository.mockRejectedValue({
        kind: ErrorKind.Other,
      });
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = getByTestId('repoNameInput');
      fireEvent.change(input, { target: { value: 'repoTest' } });

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
          <DeletionModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = getByTestId('repoNameInput');
      fireEvent.change(input, { target: { value: 'repoTest' } });

      const btn = getByTestId('deleteRepoBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
