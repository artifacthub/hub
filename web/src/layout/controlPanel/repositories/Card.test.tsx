import { fireEvent, render, waitFor } from '@testing-library/react';
import moment from 'moment';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { Repository } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import Card from './Card';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

const repoMock: Repository = {
  kind: 0,
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
  lastTrackingTs: null,
  userAlias: 'user',
};

const setModalStatusMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  repository: repoMock,
  setModalStatus: setModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: onAuthErrorMock,
};

describe('Repository Card - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Card {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(<Card {...defaultProps} />);

      expect(getByText(repoMock.displayName!)).toBeInTheDocument();
      expect(getByTestId('updateRepoBtn')).toBeInTheDocument();
      expect(getByTestId('transferRepoBtn')).toBeInTheDocument();
      expect(getByTestId('deleteRepoDropdownBtn')).toBeInTheDocument();
      expect(getByText(repoMock.url!)).toBeInTheDocument();
      expect(getByText('Not processed yet, it will be processed automatically in less than 30m')).toBeInTheDocument();
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
      const { getByText } = render(<Card {...props} />);

      expect(getByText('a few seconds ago')).toBeInTheDocument();
      expect(getByText('Show errors log')).toBeInTheDocument();
    });

    it('calls delete repo when delete button in dropdown is clicked', async () => {
      const { getByTestId } = render(<Card {...defaultProps} />);

      const dropdownBtn = getByTestId('deleteRepoDropdownBtn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      const btn = getByTestId('deleteRepoBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });
    });

    it('calls setModalStatus when Edit button is clicked', () => {
      const { getByTestId } = render(<Card {...defaultProps} />);

      const btn = getByTestId('updateRepoBtn');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(setModalStatusMock).toHaveBeenCalledTimes(1);
      expect(setModalStatusMock).toHaveBeenCalledWith({
        open: true,
        repository: repoMock,
      });
    });

    it('opens Transfer Repo when Transfer button is clicked', () => {
      const { getByTestId, getByText } = render(<Card {...defaultProps} />);

      const btn = getByTestId('transferRepoBtn');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);

      waitFor(() => {
        expect(getByTestId('transferRepoForm')).toBeInTheDocument();
        expect(getByText('Transfer repository')).toBeInTheDocument();
      });
    });
  });

  describe('on deleteRepositoryError', () => {
    it('displays generic error', async () => {
      mocked(API).deleteRepository.mockRejectedValue({
        statusText: 'error',
      });
      const { getByTestId } = render(<Card {...defaultProps} />);

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
        message: 'An error occurred deleting the repository, please try again later',
      });
    });

    it('calls onAuthError', async () => {
      mocked(API).deleteRepository.mockRejectedValue({
        statusText: 'ErrLoginRedirect',
      });
      const { getByTestId } = render(<Card {...defaultProps} />);

      const dropdownBtn = getByTestId('deleteRepoDropdownBtn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      const btn = getByTestId('deleteRepoBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteRepository).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
