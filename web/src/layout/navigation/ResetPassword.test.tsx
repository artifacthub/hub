import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import ResetPassword from './ResetPassword';
jest.mock('../../api');

describe('ResetPassword visibleTitle', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    mocked(API).verifyPasswordResetCode.mockResolvedValue(null);

    const result = render(<ResetPassword visibleTitle />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId, getByText } = render(<ResetPassword visibleTitle />);

      expect(getByTestId('resetPasswordForm')).toBeInTheDocument();
      expect(getByTestId('resetPwdEmailInput')).toBeInTheDocument();
      expect(getByTestId('resetPasswordBtn')).toBeInTheDocument();

      expect(getByText('Forgot Password?')).toBeInTheDocument();
      expect(
        getByText('Please enter your email address and we will send you a password reset link.')
      ).toBeInTheDocument();
      expect(getByText('Send password reset email')).toBeInTheDocument();
    });

    it('requests password reset code', async () => {
      mocked(API).requestPasswordResetCode.mockResolvedValue(null);

      const { getByTestId, getByText } = render(<ResetPassword visibleTitle />);

      fireEvent.change(getByTestId('resetPwdEmailInput'), { target: { value: 'test@email.com' } });

      const btn = getByTestId('resetPasswordBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.requestPasswordResetCode).toHaveBeenCalledTimes(1);
        expect(API.requestPasswordResetCode).toHaveBeenCalledWith('test@email.com');
      });

      waitFor(() => {
        expect(
          getByText(
            'We have sent a password reset link to your email, please check your inbox (and the spam folder if needed).'
          )
        ).toBeInTheDocument();
      });
    });

    it('calls onFinish after requesting code if defined', async () => {
      mocked(API).requestPasswordResetCode.mockResolvedValue(null);
      const onFinishMock = jest.fn();

      const { getByTestId } = render(<ResetPassword visibleTitle onFinish={onFinishMock} />);

      fireEvent.change(getByTestId('resetPwdEmailInput'), { target: { value: 'test@email.com' } });

      const btn = getByTestId('resetPasswordBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.requestPasswordResetCode).toHaveBeenCalledTimes(1);
      });

      expect(onFinishMock).toHaveBeenCalledTimes(1);
    });
  });
});
