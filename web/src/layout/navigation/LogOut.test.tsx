import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
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
    const { asFragment } = render(
      <Router>
        <LogOut {...defaultProps} />
      </Router>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Sign out')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    });

    it('calls logout', async () => {
      render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Sign out' });
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.logout).toBeCalledTimes(1);
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('calls history push to homepage when route is private', async () => {
      render(
        <Router>
          <LogOut {...defaultProps} privateRoute />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Sign out' });
      userEvent.click(btn);

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

      render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Sign out' });
      userEvent.click(btn);

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

      render(
        <Router>
          <LogOut {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Sign out' });
      userEvent.click(btn);

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
