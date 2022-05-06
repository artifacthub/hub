import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { ErrorKind } from '../../types';
import ResetPasswordModal from './ResetPasswordModal';
jest.mock('../../api');

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

describe('ResetPasswordModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).verifyPasswordResetCode.mockResolvedValue(null);

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
      mocked(API).verifyPasswordResetCode.mockResolvedValue(null);

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
    });

    describe('when verifyPasswordResetCode fails', () => {
      it('if code has expired', async () => {
        mocked(API).verifyPasswordResetCode.mockRejectedValue({
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
          await screen.findByText('This password reset link is no longer valid, please get a new one.')
        ).toBeInTheDocument();

        expect(screen.getByTestId('resetPasswordForm')).toBeInTheDocument();
        expect(
          screen.getByText('Please enter your email address and we will send you a password reset link.')
        ).toBeInTheDocument();
        expect(screen.getByTestId('resetPwdEmailInput')).toBeInTheDocument();
      });

      it('custom error', async () => {
        mocked(API).verifyPasswordResetCode.mockRejectedValue({
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
        mocked(API).verifyPasswordResetCode.mockRejectedValue({
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

    it('resets password', async () => {
      mocked(API).verifyPasswordResetCode.mockResolvedValue(null);
      mocked(API).resetPassword.mockResolvedValue(null);

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
        expect(API.resetPassword).toHaveBeenCalledWith('123', '123abc');
      });

      expect(
        await screen.findByText(
          'Your password has been reset successfully. You can now log in using the new credentials.'
        )
      ).toBeInTheDocument();
    });

    describe('when resetPassword fails', () => {
      it('custom error', async () => {
        mocked(API).verifyPasswordResetCode.mockResolvedValue(null);
        mocked(API).resetPassword.mockRejectedValue({
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
        mocked(API).verifyPasswordResetCode.mockResolvedValue(null);
        mocked(API).resetPassword.mockRejectedValue({
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
