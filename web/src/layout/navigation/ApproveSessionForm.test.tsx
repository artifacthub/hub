import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

    it('focuses the passcode field', () => {
      render(<ApproveSessionForm {...defaultProps} />);

      expect(screen.getByRole('textbox', { name: 'Authentication code' })).toHaveFocus();
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

    it('calls onError with the incorrect code text when the passcode is invalid', async () => {
      vi.mocked(API).approveSession.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'invalid input: invalid passcode',
      });

      render(<ApproveSessionForm {...defaultProps} />);

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith('Incorrect code. Please check it and try again.');
      });
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeEnabled();
    });

    it('calls onError with the error message when the request fails for another reason', async () => {
      vi.mocked(API).approveSession.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'custom error',
      });

      render(<ApproveSessionForm {...defaultProps} />);

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith('An error occurred signing in: custom error');
      });
      expect(onSuccessMock).not.toHaveBeenCalled();
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
      expect(screen.queryByText('Custom hint.')).toBeNull();
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

    it('displays the hint provided below the form, not in the error, after too many attempts', async () => {
      vi.mocked(API)
        .approveSession.mockRejectedValueOnce({
          kind: ErrorKind.TooManyAttempts,
          message: 'too many attempts, please try again later',
          retryAfter: 90,
        })
        .mockRejectedValueOnce({
          kind: ErrorKind.Other,
          message: 'invalid input: invalid passcode',
        });

      render(<ApproveSessionForm {...defaultProps} tooManyHint="Custom hint." />);

      expect(screen.queryByText('Custom hint.')).toBeNull();

      await submitPasscode('123456');

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith(tooManyText);
      });
      expect(await screen.findByText('Custom hint.')).toBeInTheDocument();
      expect(onSuccessMock).not.toHaveBeenCalled();

      // The hint stays when a later attempt fails for another reason
      await userEvent.click(screen.getByRole('button', { name: 'Verify passcode' }));

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledTimes(2);
        expect(onErrorMock).toHaveBeenLastCalledWith('Incorrect code. Please check it and try again.');
      });
      expect(screen.getByText('Custom hint.')).toBeInTheDocument();
    });
  });

  describe('Enter key', () => {
    it('does not send a request when the passcode is empty', () => {
      render(<ApproveSessionForm {...defaultProps} />);

      fireEvent.keyDown(screen.getByRole('textbox', { name: 'Authentication code' }), { key: 'Enter' });

      expect(API.approveSession).not.toHaveBeenCalled();
    });

    it('sends only one request while the first one is pending', async () => {
      vi.mocked(API).approveSession.mockReturnValue(new Promise(() => {}));

      render(<ApproveSessionForm {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Authentication code' });
      await userEvent.type(input, '123456');

      // First press, auto-repeat events while the key is held and a second press
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: 'Enter', repeat: true });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(await screen.findByText('Verifying...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Verify passcode' })).toBeDisabled();
      expect(API.approveSession).toHaveBeenCalledTimes(1);
      expect(API.approveSession).toHaveBeenCalledWith('123456');
    });
  });

  describe('when the form is removed while the request is pending', () => {
    it('does not call onError', async () => {
      let rejectRequest: (err: unknown) => void = () => {};
      vi.mocked(API).approveSession.mockReturnValue(
        new Promise((_, reject) => {
          rejectRequest = reject;
        })
      );

      const { unmount } = render(<ApproveSessionForm {...defaultProps} />);

      await submitPasscode('123456');
      unmount();
      rejectRequest({ kind: ErrorKind.Other, message: 'invalid input: invalid passcode' });
      await Promise.resolve();
      await Promise.resolve();

      expect(onErrorMock).not.toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
    });
  });
});
