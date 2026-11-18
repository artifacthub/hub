import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import API from '../../api';
import { ErrorKind } from '../../types';
import ApproveSessionForm from './ApproveSessionForm';
vi.mock('../../api');

const onSuccessMock = jest.fn();
const onErrorMock = jest.fn();

const defaultProps = {
  onSuccess: onSuccessMock,
  onError: onErrorMock,
  expiredHint: 'Go back and sign in again.',
};

const tooManyText =
  'Too many incorrect codes for this account. Please try again in 2 minutes, or enter one of your recovery codes.';

describe('ApproveSessionForm', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const submitPasscode = async (passcode: string) => {
    const input = screen.getByRole('textbox', { name: 'Authentication code' });
    await userEvent.type(input, passcode);

    const btn = screen.getByRole('button', { name: 'Verify passcode' });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);

    await waitFor(() => {
      expect(API.approveSession).toHaveBeenCalledTimes(1);
      expect(API.approveSession).toHaveBeenCalledWith(passcode);
    });
  };

  describe('Render', () => {
    it('renders component', () => {
      render(<ApproveSessionForm {...defaultProps} />);

      expect(screen.getByText('Authentication code')).toBeInTheDocument();
      expect(screen.getByTestId('passcodeInput')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Verify passcode' })).toHaveTextContent('Verify');
    });

    it('calls onSuccess when the session is approved', async () => {
      vi.mocked(API).approveSession.mockResolvedValue(null);

      render(<ApproveSessionForm {...defaultProps} />);

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });
      expect(onErrorMock).not.toHaveBeenCalled();
      expect(screen.queryByText('Verifying...')).toBeNull();
    });

    it('calls onError with the error message when the passcode is invalid', async () => {
      vi.mocked(API).approveSession.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'invalid input: invalid passcode',
      });

      render(<ApproveSessionForm {...defaultProps} />);

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith('An error occurred signing in: invalid input: invalid passcode');
      });
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeEnabled();
    });

    it('calls onError with the expired text when the sign-in has expired', async () => {
      vi.mocked(API).approveSession.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
        message: 'invalid session',
      });

      render(<ApproveSessionForm {...defaultProps} />);

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith('This sign-in has expired. Go back and sign in again.');
      });
      expect(onSuccessMock).not.toHaveBeenCalled();
    });

    it('calls onError with a neutral text, without the hint, when requests are limited upstream', async () => {
      vi.mocked(API).approveSession.mockRejectedValue({
        kind: ErrorKind.TooManyRequests,
        retryAfter: 30,
      });

      render(<ApproveSessionForm {...defaultProps} tooManyHint="Custom hint." />);

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith('Too many requests. Please try again in a minute.');
      });
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeEnabled();
    });

    it('calls onError with the too many attempts text', async () => {
      vi.mocked(API).approveSession.mockRejectedValue({
        kind: ErrorKind.TooManyAttempts,
        message: 'too many attempts, please try again later',
        retryAfter: 90,
      });

      render(<ApproveSessionForm {...defaultProps} />);

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith(tooManyText);
      });
      expect(onSuccessMock).not.toHaveBeenCalled();
    });

    it('calls onError with the too many attempts text followed by the hint provided', async () => {
      vi.mocked(API).approveSession.mockRejectedValue({
        kind: ErrorKind.TooManyAttempts,
        message: 'too many attempts, please try again later',
        retryAfter: 90,
      });

      render(<ApproveSessionForm {...defaultProps} tooManyHint="Custom hint." />);

      await submitPasscode('code1');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith(`${tooManyText} Custom hint.`);
      });
      expect(onSuccessMock).not.toHaveBeenCalled();
    });
  });
});
