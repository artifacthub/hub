import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import LogOut from './LogOut';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const mockOnSuccess = jest.fn();

const defaultProps = {
  onSuccess: mockOnSuccess,
};

describe('LogOut', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <LogOut {...defaultProps} />
      </Router>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      expect(getByText('Sign out')).toBeInTheDocument();
      expect(getByTestId('logOutBtn')).toBeInTheDocument();
    });

    it('calls logout', async () => {
      const { getByTestId } = render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      const btn = getByTestId('logOutBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.logout).toBeCalledTimes(1);
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('calls history push to homepage when route is private', async () => {
      const { getByTestId } = render(
        <Router>
          <LogOut {...defaultProps} privateRoute />
        </Router>
      );

      const btn = getByTestId('logOutBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith('/');
      });
    });

    it('with custom error message', async () => {
      mocked(API).logout.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'custom error',
      });

      const { getByTestId } = render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      const btn = getByTestId('logOutBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'Error: custom error',
        });
      });
    });

    it('display common logout error', async () => {
      mocked(API).logout.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const { getByTestId } = render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      const btn = getByTestId('logOutBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred, please try again later.',
        });
      });
    });
  });
});
