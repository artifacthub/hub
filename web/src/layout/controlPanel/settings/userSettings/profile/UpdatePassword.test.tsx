import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../../../api';
import { ErrorKind } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import UpdatePassword from './UpdatePassword';
jest.mock('../../../../../api');
jest.mock('../../../../../utils/alertDispatcher');

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

describe('Update password - user settings', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<UpdatePassword />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<UpdatePassword />);

      const form = screen.getByTestId('updatePasswordForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByTestId('oldPasswordInput')).toBeInTheDocument();
      expect(screen.getByTestId('passwordInput')).toBeInTheDocument();
      expect(screen.getByTestId('confirmPasswordInput')).toBeInTheDocument();
    });

    it('updates all fields and calls updatePassword', async () => {
      render(<UpdatePassword />);

      const oldPassword = screen.getByTestId('oldPasswordInput') as HTMLInputElement;
      const newPassword = screen.getByTestId('passwordInput') as HTMLInputElement;
      const repeatNewPassword = screen.getByTestId('confirmPasswordInput') as HTMLInputElement;

      await userEvent.type(oldPassword, 'oldpass');
      await userEvent.type(newPassword, 'newpass');
      await userEvent.type(repeatNewPassword, 'newpass');

      const btn = screen.getByRole('button', { name: 'Update password' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updatePassword).toBeCalledTimes(1);
        expect(API.updatePassword).toHaveBeenCalledWith('oldpass', 'newpass');
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith('/?modal=login&redirect=/control-panel/settings');
      });
    });

    it('escapes password properly', async () => {
      render(<UpdatePassword />);

      const oldPassword = screen.getByTestId('oldPasswordInput') as HTMLInputElement;
      const newPassword = screen.getByTestId('passwordInput') as HTMLInputElement;
      const repeatNewPassword = screen.getByTestId('confirmPasswordInput') as HTMLInputElement;

      await userEvent.type(oldPassword, 'oldpass');
      await userEvent.type(newPassword, 'newpass$^');
      await userEvent.type(repeatNewPassword, 'newpass$^');

      const btn = screen.getByRole('button', { name: 'Update password' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updatePassword).toBeCalledTimes(1);
        expect(API.updatePassword).toHaveBeenCalledWith('oldpass', 'newpass$^');
      });
    });

    it("doesn't pass form validation when passwords don't match", async () => {
      render(<UpdatePassword />);

      const oldPassword = screen.getByTestId('oldPasswordInput') as HTMLInputElement;
      const newPassword = screen.getByTestId('passwordInput') as HTMLInputElement;
      const repeatNewPassword = screen.getByTestId('confirmPasswordInput') as HTMLInputElement;

      await userEvent.type(oldPassword, 'oldpass');
      await userEvent.type(newPassword, 'newpass');
      await userEvent.type(repeatNewPassword, 'noMatch');

      const btn = screen.getByRole('button', { name: 'Update password' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updatePassword).toBeCalledTimes(0);
      });
    });
  });

  describe('when updateUserProfile fails', () => {
    it('with custom error message', async () => {
      mocked(API).updatePassword.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'custom error',
      });

      render(<UpdatePassword />);

      await userEvent.type(screen.getByTestId('oldPasswordInput'), 'oldpass');
      await userEvent.type(screen.getByTestId('passwordInput'), 'newpass');
      await userEvent.type(screen.getByTestId('confirmPasswordInput'), 'newpass');

      const btn = screen.getByRole('button', { name: 'Update password' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updatePassword).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred updating your password: custom error',
        });
      });
    });

    it('UnauthorizedError', async () => {
      mocked(API).updatePassword.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(<UpdatePassword />);

      await userEvent.type(screen.getByTestId('oldPasswordInput'), 'oldpass');
      await userEvent.type(screen.getByTestId('passwordInput'), 'newpass');
      await userEvent.type(screen.getByTestId('confirmPasswordInput'), 'newpass');

      const btn = screen.getByRole('button', { name: 'Update password' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updatePassword).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message:
            'An error occurred updating your password, please make sure you have entered your old password correctly',
        });
      });
    });

    it('default error message', async () => {
      mocked(API).updatePassword.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      render(<UpdatePassword />);

      await userEvent.type(screen.getByTestId('oldPasswordInput'), 'oldpass');
      await userEvent.type(screen.getByTestId('passwordInput'), 'newpass');
      await userEvent.type(screen.getByTestId('confirmPasswordInput'), 'newpass');

      const btn = screen.getByRole('button', { name: 'Update password' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updatePassword).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred updating your password, please try again later.',
        });
      });
    });
  });
});
