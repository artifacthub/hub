import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import API from '../../api';
import { ErrorKind } from '../../types';
import LogIn from './LogIn';
vi.mock('../../api');

const mockUseNavigate = jest.fn();

vi.mock('react-router-dom', () => ({
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
      vi.mocked(API).login.mockResolvedValue('true');

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
        expect(API.login).toHaveBeenCalledTimes(1);
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
      vi.mocked(API).login.mockRejectedValue({
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
      vi.mocked(API).login.mockRejectedValue({
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
      vi.mocked(API).login.mockRejectedValue({
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

    describe('Too many sign-in attempts', () => {
      afterEach(() => {
        document.head.querySelectorAll("meta[name^='artifacthub:']").forEach((el) => el.remove());
      });

      it('displays error with retry time and keeps Forgot password and OAuth enabled', async () => {
        const meta = document.createElement('meta');
        meta.name = 'artifacthub:githubAuth';
        meta.content = 'true';
        document.head.appendChild(meta);
        vi.mocked(API).login.mockRejectedValue({
          kind: ErrorKind.TooManyAttempts,
          message: 'too many attempts, please try again later',
          retryAfter: 120,
        });

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await userEvent.type(screen.getByLabelText('Password'), 'pass123');
        await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'jsmith@email.com');
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
          expect(API.login).toHaveBeenCalledTimes(1);
        });

        expect(
          await screen.findByText(
            'Too many sign-in attempts for this account. Please try again in 2 minutes, or use "Forgot password?" to reset your password and sign in.'
          )
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open reset password' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
      });

      it('displays a neutral error when requests are limited upstream', async () => {
        vi.mocked(API).login.mockRejectedValue({
          kind: ErrorKind.TooManyRequests,
        });

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await userEvent.type(screen.getByLabelText('Password'), 'pass123');
        await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'jsmith@email.com');
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
          expect(API.login).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('Too many requests. Please try again in a little while.')).toBeInTheDocument();
        expect(screen.queryByText(/Too many sign-in attempts for this account/)).toBeNull();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
      });
    });

    describe('Enter key on the password field', () => {
      it('sends only one request while the first one is pending', async () => {
        vi.mocked(API).login.mockReturnValue(new Promise(() => {}));

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'jsmith@email.com');
        const passwordInput = screen.getByLabelText('Password');
        await userEvent.type(passwordInput, 'pass123');

        // First press, auto-repeat events while the key is held and a second press
        fireEvent.keyDown(passwordInput, { key: 'Enter' });
        fireEvent.keyDown(passwordInput, { key: 'Enter', repeat: true });
        fireEvent.keyDown(passwordInput, { key: 'Enter', repeat: true });
        fireEvent.keyDown(passwordInput, { key: 'Enter' });

        await waitFor(() => {
          expect(API.login).toHaveBeenCalledTimes(1);
        });
        expect(await screen.findByText('Signing in...')).toBeInTheDocument();

        fireEvent.keyDown(passwordInput, { key: 'Enter', repeat: true });
        fireEvent.keyDown(passwordInput, { key: 'Enter' });

        // Give any extra request the time to be sent before checking
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(API.login).toHaveBeenCalledTimes(1);
      });

      it('ignores auto-repeat events of a held key', async () => {
        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'jsmith@email.com');
        const passwordInput = screen.getByLabelText('Password');
        await userEvent.type(passwordInput, 'pass123');

        fireEvent.keyDown(passwordInput, { key: 'Enter', repeat: true });

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(API.login).not.toHaveBeenCalled();
      });

      it('can submit again once the request has failed', async () => {
        vi.mocked(API).login.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'jsmith@email.com');
        const passwordInput = screen.getByLabelText('Password');
        await userEvent.type(passwordInput, 'pass123');

        fireEvent.keyDown(passwordInput, { key: 'Enter' });
        expect(await screen.findByText('Authentication failed. Please check your credentials.')).toBeInTheDocument();
        expect(API.login).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(passwordInput, { key: 'Enter' });
        await waitFor(() => {
          expect(API.login).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('Passcode step', () => {
      const goToPasscodeStep = async () => {
        vi.mocked(API).login.mockRejectedValue({
          kind: ErrorKind.NotApprovedSession,
        });

        await userEvent.type(screen.getByLabelText('Password'), 'pass123');
        await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'jsmith@email.com');
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
          expect(API.login).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByRole('textbox', { name: 'Authentication code' })).toBeInTheDocument();
      };

      const submitPasscode = async (passcode: string) => {
        await userEvent.type(screen.getByRole('textbox', { name: 'Authentication code' }), passcode);
        await userEvent.click(screen.getByRole('button', { name: 'Verify passcode' }));

        await waitFor(() => {
          expect(API.approveSession).toHaveBeenCalledTimes(1);
          expect(API.approveSession).toHaveBeenCalledWith(passcode);
        });
      };

      it('renders passcode form', async () => {
        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await goToPasscodeStep();

        expect(screen.getByTestId('passcodeInput')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Back to Sign in' })).toBeInTheDocument();
        expect(screen.queryByTestId('loginForm')).toBeNull();
      });

      it('approves session', async () => {
        vi.mocked(API).approveSession.mockResolvedValue(null);

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await goToPasscodeStep();
        await submitPasscode('123456');

        await waitFor(() => {
          expect(defaultProps.setOpenLogIn).toHaveBeenCalledTimes(1);
          expect(defaultProps.setOpenLogIn).toHaveBeenCalledWith(false);
        });
      });

      it('keeps passcode form when code is wrong', async () => {
        vi.mocked(API).approveSession.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'invalid input: invalid passcode',
        });

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await goToPasscodeStep();
        await submitPasscode('123456');

        expect(
          await screen.findByText('An error occurred signing in: invalid input: invalid passcode')
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Authentication code' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeEnabled();
        expect(screen.queryByTestId('loginForm')).toBeNull();
        expect(defaultProps.setOpenLogIn).not.toHaveBeenCalled();
      });

      it('displays expired error and goes back to enabled sign in form', async () => {
        vi.mocked(API).approveSession.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
          message: 'invalid session',
        });

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await goToPasscodeStep();
        await submitPasscode('123456');

        expect(await screen.findByText('This sign-in has expired. Go back and sign in again.')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Back to Sign in' }));

        const btn = await screen.findByRole('button', { name: 'Sign in' });
        expect(btn).toBeEnabled();
        expect(btn).toHaveTextContent('Sign in');
        expect(screen.queryByText('Signing in...')).toBeNull();
      });

      it('displays too many codes error with Forgot password hint', async () => {
        vi.mocked(API).approveSession.mockRejectedValue({
          kind: ErrorKind.TooManyAttempts,
          message: 'too many attempts, please try again later',
          retryAfter: 7200,
        });

        render(
          <Router>
            <LogIn {...defaultProps} />
          </Router>
        );

        await goToPasscodeStep();
        await submitPasscode('123456');

        expect(
          await screen.findByText(
            'Too many incorrect codes for this account. Please try again in 2 hours, or enter one of your recovery codes. If you didn\'t make these attempts, someone may know your password: go back and use "Forgot password?" to reset it to a new password. That signs out every other session and stops them; then finish signing in with a recovery code, or with a code from your app once the wait is over.'
          )
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Authentication code' })).toBeInTheDocument();
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
