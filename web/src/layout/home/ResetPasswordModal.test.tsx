import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { ErrorKind } from '../../types';
import ResetPasswordModal from './ResetPasswordModal';
vi.mock('../../api');

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const mockCtx = {
  user: null,
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

const mockDispatch = jest.fn();

const renderResetPasswordModal = () =>
  render(
    <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
      <Router>
        <ResetPasswordModal code="123" />
      </Router>
    </AppCtx.Provider>
  );

const submitResetForm = async () => {
  await waitFor(() => {
    expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
  });

  const passwordInput = await screen.findByTestId('passwordInput');
  const confirmPasswordInput = screen.getByTestId('confirmPasswordInput');

  await userEvent.type(passwordInput, '123abc');
  await userEvent.type(confirmPasswordInput, '123abc');

  const btn = screen.getByRole('button', { name: 'Reset password' });
  await userEvent.click(btn);

  await waitFor(() => {
    expect(API.resetPassword).toHaveBeenCalledTimes(1);
    expect(API.resetPassword).toHaveBeenCalledWith('123', '123abc');
  });
};

const submitPasscode = async (passcode: string) => {
  const passcodeInput = screen.getByRole('textbox', { name: 'Authentication code' });
  await userEvent.type(passcodeInput, passcode);
  await userEvent.click(screen.getByRole('button', { name: 'Verify passcode' }));

  await waitFor(() => {
    expect(API.approveSession).toHaveBeenCalledTimes(1);
    expect(API.approveSession).toHaveBeenCalledWith(passcode);
  });
};

describe('ResetPasswordModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    vi.mocked(API).verifyPasswordResetCode.mockResolvedValue('jsmith@email.com');

    const { asFragment } = render(
      <Router>
        <ResetPasswordModal code="123" />
      </Router>
    );

    await waitFor(() => {
      expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByTestId('resetPwdForm')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      vi.mocked(API).verifyPasswordResetCode.mockResolvedValue(undefined);

      render(
        <Router>
          <ResetPasswordModal code="123" />
        </Router>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        expect(API.verifyPasswordResetCode).toHaveBeenCalledWith('123');
      });

      expect(await screen.findByTestId('resetPwdForm')).toBeInTheDocument();
      expect(screen.getByTestId('passwordInput')).toBeInTheDocument();
      expect(screen.getByTestId('confirmPasswordInput')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();

      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Confirm password')).toBeInTheDocument();
      expect(screen.queryByTestId('emailInput')).not.toBeInTheDocument();
    });

    it('renders read-only email field', async () => {
      vi.mocked(API).verifyPasswordResetCode.mockResolvedValue('jsmith@email.com');

      render(
        <Router>
          <ResetPasswordModal code="123" />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
      });

      const emailInput = await screen.findByRole('textbox', { name: 'Email' });
      expect(emailInput).toHaveValue('jsmith@email.com');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('readonly');
      expect(emailInput).toHaveAttribute('autocomplete', 'username');
    });

    describe('when verifyPasswordResetCode fails', () => {
      it('if code has expired', async () => {
        vi.mocked(API).verifyPasswordResetCode.mockRejectedValue({
          kind: ErrorKind.Gone,
        });

        render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        expect(
          await screen.findByText(
            'This password reset link is no longer valid. Links work for 4 hours and only once. If you requested more than one, use the most recent email; otherwise request a new link below.'
          )
        ).toBeInTheDocument();

        expect(screen.getByTestId('resetPasswordForm')).toBeInTheDocument();
        expect(
          screen.getByText('Please enter your email address and we will send you a password reset link.')
        ).toBeInTheDocument();
        expect(screen.getByTestId('resetPwdEmailInput')).toBeInTheDocument();
      });

      it('custom error', async () => {
        vi.mocked(API).verifyPasswordResetCode.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('Sorry, custom error')).toBeInTheDocument();
      });

      it('default error', async () => {
        vi.mocked(API).verifyPasswordResetCode.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('An error occurred with your password reset code.')).toBeInTheDocument();
      });
    });

    it('resets password and signs in', async () => {
      vi.mocked(API).verifyPasswordResetCode.mockResolvedValue('jsmith@email.com');
      vi.mocked(API).resetPassword.mockResolvedValue(true);
      vi.mocked(API).getUserProfile.mockResolvedValue({
        alias: 'jsmith',
        email: 'jsmith@email.com',
        passwordSet: true,
      });

      renderResetPasswordModal();
      await submitResetForm();

      expect(await screen.findByText("Your password has been reset and you're now signed in.")).toBeInTheDocument();
      await waitFor(() => {
        expect(API.getUserProfile).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument();
    });

    it('resets password without signing in', async () => {
      vi.mocked(API).verifyPasswordResetCode.mockResolvedValue('jsmith@email.com');
      vi.mocked(API).resetPassword.mockResolvedValue(false);

      renderResetPasswordModal();
      await submitResetForm();

      expect(await screen.findByText('Your password has been reset. You can now sign in.')).toBeInTheDocument();
      expect(API.getUserProfile).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument();
    });

    describe('when the passcode is required', () => {
      const passcodeText =
        'Your password has been reset. To finish signing in, enter the code from your authenticator app or one of your recovery codes.';

      beforeEach(() => {
        vi.mocked(API).verifyPasswordResetCode.mockResolvedValue('jsmith@email.com');
        vi.mocked(API).resetPassword.mockRejectedValue({
          kind: ErrorKind.NotApprovedSession,
        });
      });

      it('renders passcode form', async () => {
        renderResetPasswordModal();
        await submitResetForm();

        expect(await screen.findByText(passcodeText)).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Authentication code' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument();
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'signOut' });
      });

      it('signs in when the passcode is approved', async () => {
        vi.mocked(API).approveSession.mockResolvedValue(null);
        vi.mocked(API).getUserProfile.mockResolvedValue({
          alias: 'jsmith',
          email: 'jsmith@email.com',
          passwordSet: true,
        });

        renderResetPasswordModal();
        await submitResetForm();
        expect(await screen.findByText(passcodeText)).toBeInTheDocument();

        await submitPasscode('123456');

        expect(await screen.findByText("Your password has been reset and you're now signed in.")).toBeInTheDocument();
        await waitFor(() => {
          expect(API.getUserProfile).toHaveBeenCalledTimes(1);
        });
        expect(screen.queryByRole('textbox', { name: 'Authentication code' })).not.toBeInTheDocument();
      });

      it('when there are too many incorrect codes', async () => {
        vi.mocked(API).approveSession.mockRejectedValue({
          kind: ErrorKind.TooManyAttempts,
          message: 'too many attempts, please try again later',
          retryAfter: 120,
        });

        renderResetPasswordModal();
        await submitResetForm();
        expect(await screen.findByText(passcodeText)).toBeInTheDocument();

        await submitPasscode('123456');

        expect(
          await screen.findByText(
            'Too many incorrect codes for this account. Please try again in 2 minutes, or enter one of your recovery codes.'
          )
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Authentication code' })).toBeInTheDocument();
        expect(API.getUserProfile).not.toHaveBeenCalled();
      });

      it('when the sign-in has expired', async () => {
        vi.mocked(API).approveSession.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
          message: 'invalid session',
        });

        renderResetPasswordModal();
        await submitResetForm();
        expect(await screen.findByText(passcodeText)).toBeInTheDocument();

        await submitPasscode('123456');

        expect(
          await screen.findByText('This sign-in has expired. Close this window and sign in again.')
        ).toBeInTheDocument();
        expect(API.getUserProfile).not.toHaveBeenCalled();
      });
    });

    describe('when resetPassword fails', () => {
      it('custom error', async () => {
        vi.mocked(API).verifyPasswordResetCode.mockResolvedValue(undefined);
        vi.mocked(API).resetPassword.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        const passwordInput = await screen.findByTestId('passwordInput');
        const confirmPasswordInput = screen.getByTestId('confirmPasswordInput');

        await userEvent.type(passwordInput, '123abc');
        await userEvent.type(confirmPasswordInput, '123abc');

        const btn = screen.getByRole('button', { name: 'Reset password' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.resetPassword).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('An error occurred resetting the password: custom error')).toBeInTheDocument();
      });

      it('default error', async () => {
        vi.mocked(API).verifyPasswordResetCode.mockResolvedValue(undefined);
        vi.mocked(API).resetPassword.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        const passwordInput = await screen.findByTestId('passwordInput');
        const confirmPasswordInput = screen.getByTestId('confirmPasswordInput');

        await userEvent.type(passwordInput, '123abc');
        await userEvent.type(confirmPasswordInput, '123abc');

        const btn = screen.getByRole('button', { name: 'Reset password' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.resetPassword).toHaveBeenCalledTimes(1);
        });

        expect(
          await screen.findByText('An error occurred resetting the password, please try again later.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('does not render', () => {
    it('when code is undefined', () => {
      const { container } = render(
        <Router>
          <ResetPasswordModal />
        </Router>
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
