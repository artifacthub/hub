import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import LogOut from './LogOut';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
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
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.logout).toBeCalledTimes(1);
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('calls navigate to homepage when route is private', async () => {
      render(
        <Router>
          <LogOut {...defaultProps} privateRoute />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Sign out' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith('/');
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
      await userEvent.click(btn);

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
      await userEvent.click(btn);

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
