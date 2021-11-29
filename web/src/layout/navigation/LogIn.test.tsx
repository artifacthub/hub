import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
import { ErrorKind } from '../../types';
import LogIn from './LogIn';
jest.mock('../../api');

const mockHistoryReplace = jest.fn();
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  openLogIn: true,
  setOpenLogIn: jest.fn(),
};

describe('LogIn', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <LogIn {...defaultProps} />
      </Router>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open reset password' })).toBeInTheDocument();
    });

    it('updates all fields and calls login', async () => {
      render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      const password = screen.getByLabelText('Password');
      const email = screen.getByRole('textbox', { name: 'Email' });

      userEvent.type(password, 'pass123');
      userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toBeCalledTimes(1);
        expect(API.login).toHaveBeenCalledWith({
          email: 'jsmith@email.com',
          password: 'pass123',
        });
      });
    });

    it('display UnauthorizedError', async () => {
      mocked(API).login.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      const component = (
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );
      const { rerender } = render(component);

      const password = screen.getByLabelText('Password');
      const email = screen.getByRole('textbox', { name: 'Email' });

      userEvent.type(password, 'pass123');
      userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Authentication failed. Please check your credentials.')).toBeInTheDocument();
    });

    it('with custom error message', async () => {
      mocked(API).login.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'Password not provided',
      });

      const component = (
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );
      const { rerender } = render(component);

      const password = screen.getByLabelText('Password');
      const email = screen.getByRole('textbox', { name: 'Email' });

      userEvent.type(password, 'pass123');
      userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('An error occurred signing in: Password not provided')).toBeInTheDocument();
    });

    it('displays common login error', async () => {
      mocked(API).login.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const component = (
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );
      const { rerender } = render(component);

      const password = screen.getByLabelText('Password');
      const email = screen.getByRole('textbox', { name: 'Email' });

      userEvent.type(password, 'pass123');
      userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('An error occurred signing in, please try again later.')).toBeInTheDocument();
    });

    it('calls history replace on close modal when redirect is not undefined', async () => {
      render(
        <Router>
          <LogIn {...defaultProps} redirect="/control-panel" />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Close modal' });
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({ pathname: '/', search: '' });
      });
    });

    describe('Reset password', () => {
      it('displays form', () => {
        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        const tabBtn = screen.getByRole('button', { name: 'Open reset password' });
        expect(tabBtn).toBeInTheDocument();

        userEvent.click(tabBtn);

        const backBtn = screen.getByRole('button', { name: 'Back to Sign in' });
        expect(backBtn).toBeInTheDocument();
        expect(backBtn).toHaveTextContent('Back to Sign in');

        expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
        expect(screen.getByTestId('resetPasswordForm')).toBeInTheDocument();
        expect(
          screen.getByText('Please enter your email address and we will send you a password reset link.')
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
      });
    });
  });
});
