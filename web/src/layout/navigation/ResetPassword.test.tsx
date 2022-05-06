import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../api';
import ResetPassword from './ResetPassword';
jest.mock('../../api');

describe('ResetPassword visibleTitle', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    mocked(API).verifyPasswordResetCode.mockResolvedValue(null);

    const { asFragment } = render(<ResetPassword visibleTitle />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ResetPassword visibleTitle />);

      expect(screen.getByTestId('resetPasswordForm')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send password reset email' })).toBeInTheDocument();

      expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
      expect(
        screen.getByText('Please enter your email address and we will send you a password reset link.')
      ).toBeInTheDocument();
      expect(screen.getByText('Send password reset email')).toBeInTheDocument();
    });

    it('requests password reset code', async () => {
      mocked(API).requestPasswordResetCode.mockResolvedValue(null);

      render(<ResetPassword visibleTitle />);

      await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'test@email.com');

      const btn = screen.getByRole('button', { name: 'Send password reset email' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.requestPasswordResetCode).toHaveBeenCalledTimes(1);
        expect(API.requestPasswordResetCode).toHaveBeenCalledWith('test@email.com');
      });

      expect(
        await screen.findByText(
          'We have sent a password reset link to your email, please check your inbox (and the spam folder if needed).'
        )
      ).toBeInTheDocument();
    });

    it('calls onFinish after requesting code if defined', async () => {
      mocked(API).requestPasswordResetCode.mockResolvedValue(null);
      const onFinishMock = jest.fn();

      render(<ResetPassword visibleTitle onFinish={onFinishMock} />);

      await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'test@email.com');

      const btn = screen.getByRole('button', { name: 'Send password reset email' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.requestPasswordResetCode).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onFinishMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
