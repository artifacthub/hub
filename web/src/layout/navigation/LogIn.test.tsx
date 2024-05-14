import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { ErrorKind } from '../../types';
import LogIn from './LogIn';
jest.mock('../../api');

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  openLogIn: true,
  setOpenLogIn: jest.fn(),
  redirect: null,
  visibleModal: null,
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
      mocked(API).login.mockResolvedValue('true');

      render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      const password = screen.getByLabelText('Password');
      const email = screen.getByRole('textbox', { name: 'Email' });

      await userEvent.type(password, 'pass123');
      await userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toBeCalledTimes(1);
        expect(API.login).toHaveBeenCalledWith({
          email: 'jsmith@email.com',
          password: 'pass123',
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('Verifying...')).toBeNull();
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

      await userEvent.type(password, 'pass123');
      await userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
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

      await userEvent.type(password, 'pass123');
      await userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByText('An error occurred signing in: Password not provided')).toBeInTheDocument();
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

      await userEvent.type(password, 'pass123');
      await userEvent.type(email, 'jsmith@email.com');

      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByText('An error occurred signing in, please try again later.')).toBeInTheDocument();
    });

    it('calls navigate on close modal when redirect is not undefined', async () => {
      render(
        <Router>
          <LogIn {...defaultProps} redirect="/control-panel" />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Close modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith({ pathname: '/', search: '' }, { replace: true });
      });
    });

    describe('Reset password', () => {
      it('displays form', async () => {
        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        const tabBtn = screen.getByRole('button', { name: 'Open reset password' });
        expect(tabBtn).toBeInTheDocument();

        await userEvent.click(tabBtn);

        const backBtn = await screen.findByRole('button', { name: 'Back to Sign in' });
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
