import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { API } from '../../../api';
import ResetPassword from './ResetPassword';
jest.mock('../../../api');

describe('Reset password - user settings', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<ResetPassword />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(<ResetPassword />);

      const form = getByTestId('resetPasswordForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('oldPasswordInput')).toBeInTheDocument();
      expect(getByTestId('passwordInput')).toBeInTheDocument();
      expect(getByTestId('confirmPasswordInput')).toBeInTheDocument();
    });

    it('updates all fields and calls updatePassword', async () => {
      const { getByTestId } = render(<ResetPassword />);

      const oldPassword = getByTestId('oldPasswordInput') as HTMLInputElement;
      const newPassword = getByTestId('passwordInput') as HTMLInputElement;
      const repeatNewPassword = getByTestId('confirmPasswordInput') as HTMLInputElement;

      fireEvent.change(oldPassword, { target: { value: 'oldpass' } });
      fireEvent.change(newPassword, { target: { value: 'newpass' } });
      fireEvent.change(repeatNewPassword, { target: { value: 'newpass' } });

      const btn = getByTestId('updatePasswordBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {});

      expect(API.updatePassword).toBeCalledTimes(1);
      expect(API.updatePassword).toHaveBeenCalledWith('oldpass', 'newpass');
    });

    it("doesn`t pass form validation when passwords don't match", async () => {
      const { getByTestId } = render(<ResetPassword />);

      const oldPassword = getByTestId('oldPasswordInput') as HTMLInputElement;
      const newPassword = getByTestId('passwordInput') as HTMLInputElement;
      const repeatNewPassword = getByTestId('confirmPasswordInput') as HTMLInputElement;

      fireEvent.change(oldPassword, { target: { value: 'oldpass' } });
      fireEvent.change(newPassword, { target: { value: 'new' } });
      fireEvent.change(repeatNewPassword, { target: { value: 'notMatch' } });

      const btn = getByTestId('updatePasswordBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {});

      expect(API.updatePassword).toBeCalledTimes(0);
    });
  });
});
