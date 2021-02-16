import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
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

    const result = render(
      <Router>
        <ResetPasswordModal code="123" />
      </Router>
    );

    expect(result.asFragment()).toMatchSnapshot();
    await waitFor(() => {
      expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      mocked(API).verifyPasswordResetCode.mockResolvedValue(null);

      const { getByTestId, getByRole, getByText } = render(
        <Router>
          <ResetPasswordModal code="123" />
        </Router>
      );

      expect(getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        expect(API.verifyPasswordResetCode).toHaveBeenCalledWith('123');
      });

      expect(getByTestId('resetPwdForm')).toBeInTheDocument();
      expect(getByTestId('passwordInput')).toBeInTheDocument();
      expect(getByTestId('confirmPasswordInput')).toBeInTheDocument();
      expect(getByTestId('resetPwdBtn')).toBeInTheDocument();

      expect(getByText('Password')).toBeInTheDocument();
      expect(getByText('Confirm password')).toBeInTheDocument();
    });

    describe('when verifyPasswordResetCode fails', () => {
      it('if code has expired', async () => {
        mocked(API).verifyPasswordResetCode.mockRejectedValue({
          kind: ErrorKind.Gone,
        });

        const { getByTestId, getByText } = render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        expect(getByText('This password reset link is no longer valid, please get a new one.')).toBeInTheDocument();

        expect(getByTestId('resetPasswordForm')).toBeInTheDocument();
        expect(
          getByText('Please enter your email address and we will send you a password reset link.')
        ).toBeInTheDocument();
        expect(getByTestId('resetPwdEmailInput')).toBeInTheDocument();
      });

      it('custom error', async () => {
        mocked(API).verifyPasswordResetCode.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const { getByText } = render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        expect(getByText('Sorry, custom error')).toBeInTheDocument();
      });

      it('default error', async () => {
        mocked(API).verifyPasswordResetCode.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const { getByText } = render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        expect(getByText('An error occurred with your password reset code.')).toBeInTheDocument();
      });
    });

    it('resets password', async () => {
      mocked(API).verifyPasswordResetCode.mockResolvedValue(null);
      mocked(API).resetPassword.mockResolvedValue(null);

      const { getByTestId, getByText } = render(
        <Router>
          <ResetPasswordModal code="123" />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
      });

      const [passwordInput, confirmPasswordInput] = await waitFor(() => [
        getByTestId('passwordInput'),
        getByTestId('confirmPasswordInput'),
      ]);

      fireEvent.change(passwordInput, { target: { value: '123abc' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '123abc' } });

      const btn = getByTestId('resetPwdBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.resetPassword).toHaveBeenCalledTimes(1);
        expect(API.resetPassword).toHaveBeenCalledWith('123', '123abc');
      });

      waitFor(() => {
        expect(
          getByText('Your password has been reset successfully. You can now log in using the new credentials.')
        ).toBeInTheDocument();
      });
    });

    describe('when resetPassword fails', () => {
      it('custom error', async () => {
        mocked(API).verifyPasswordResetCode.mockResolvedValue(null);
        mocked(API).resetPassword.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const { getByText, getByTestId } = render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        const [passwordInput, confirmPasswordInput] = await waitFor(() => [
          getByTestId('passwordInput'),
          getByTestId('confirmPasswordInput'),
        ]);

        fireEvent.change(passwordInput, { target: { value: '123abc' } });
        fireEvent.change(confirmPasswordInput, { target: { value: '123abc' } });

        const btn = getByTestId('resetPwdBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.resetPassword).toHaveBeenCalledTimes(1);
        });

        expect(getByText('An error occurred resetting the password: custom error')).toBeInTheDocument();
      });

      it('default error', async () => {
        mocked(API).verifyPasswordResetCode.mockResolvedValue(null);
        mocked(API).resetPassword.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const { getByText, getByTestId } = render(
          <Router>
            <ResetPasswordModal code="123" />
          </Router>
        );

        await waitFor(() => {
          expect(API.verifyPasswordResetCode).toHaveBeenCalledTimes(1);
        });

        const [passwordInput, confirmPasswordInput] = await waitFor(() => [
          getByTestId('passwordInput'),
          getByTestId('confirmPasswordInput'),
        ]);

        fireEvent.change(passwordInput, { target: { value: '123abc' } });
        fireEvent.change(confirmPasswordInput, { target: { value: '123abc' } });

        const btn = getByTestId('resetPwdBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.resetPassword).toHaveBeenCalledTimes(1);
        });

        expect(getByText('An error occurred resetting the password, please try again later.')).toBeInTheDocument();
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
