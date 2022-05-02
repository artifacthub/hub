import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../api';
import { ErrorKind } from '../../types';
import CreateAnAccount from './CreateAnAccount';
jest.mock('../../api');

const setApiErrorMock = jest.fn();

const defaultProps = {
  apiError: null,
  setApiError: setApiErrorMock,
  success: false,
  setSuccess: jest.fn(),
  isLoading: {
    status: false,
  },
  setIsLoading: jest.fn(),
};

describe('CreateAnAccount', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<CreateAnAccount {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<CreateAnAccount {...defaultProps} />);

      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Confirm password')).toBeInTheDocument();
    });

    it('renders success info', () => {
      render(<CreateAnAccount {...defaultProps} success />);

      expect(screen.getByText('A verification link has been sent to your email account')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Please click on the link that has just been sent to your email account to verify your email and finish the registration process.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('is only valid for 24 hours')).toBeInTheDocument();
    });

    it('calls registerUser', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).register.mockResolvedValue(null);

      render(<CreateAnAccount {...defaultProps} />);

      await userEvent.type(screen.getByRole('textbox', { name: /Username/ }), 'userAlias');
      await userEvent.type(screen.getByRole('textbox', { name: /Email/ }), 'test@email.com');
      await userEvent.type(screen.getByRole('textbox', { name: 'First Name' }), 'John');
      await userEvent.type(screen.getByRole('textbox', { name: 'Last Name' }), 'Smith');
      await userEvent.type(screen.getByTestId('passwordInput'), '123qwe');
      await userEvent.type(screen.getByTestId('confirmPasswordInput'), '123qwe');

      const form = screen.getByTestId('createAnAccountForm');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(1);
        expect(API.register).toHaveBeenCalledWith({
          alias: 'userAlias',
          firstName: 'John',
          lastName: 'Smith',
          email: 'test@email.com',
          password: '123qwe',
        });
      });
    });

    it('calls to registerUser after escaping properly password', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).register.mockResolvedValue(null);

      render(<CreateAnAccount {...defaultProps} />);

      await userEvent.type(screen.getByRole('textbox', { name: /Username/ }), 'userAlias');
      await userEvent.type(screen.getByRole('textbox', { name: /Email/ }), 'test@email.com');
      await userEvent.type(screen.getByRole('textbox', { name: 'First Name' }), 'John');
      await userEvent.type(screen.getByRole('textbox', { name: 'Last Name' }), 'Smith');
      await userEvent.type(screen.getByTestId('passwordInput'), '123qwe*$');
      await userEvent.type(screen.getByTestId('confirmPasswordInput'), '123qwe*$');

      const form = screen.getByTestId('createAnAccountForm');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(1);
        expect(API.register).toHaveBeenCalledWith({
          alias: 'userAlias',
          firstName: 'John',
          lastName: 'Smith',
          email: 'test@email.com',
          password: '123qwe*$',
        });
      });
    });

    it('does not call registerUser if alias is not available', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).register.mockResolvedValue(null);

      render(<CreateAnAccount {...defaultProps} />);

      await waitFor(() => {
        userEvent.type(screen.getByRole('textbox', { name: /Username/ }), 'userAlias');
        userEvent.type(screen.getByRole('textbox', { name: /Email/ }), 'test@email.com');
        userEvent.type(screen.getByRole('textbox', { name: 'First Name' }), 'John');
        userEvent.type(screen.getByRole('textbox', { name: 'Last Name' }), 'Smith');
        userEvent.type(screen.getByTestId('passwordInput'), '123qwe');
        userEvent.type(screen.getByTestId('confirmPasswordInput'), '123qwe');
      });

      const form = await screen.findByTestId('createAnAccountForm');
      fireEvent.submit(form);

      expect(form).toHaveClass('needs-validation');

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(0);
      });

      await waitFor(() => {
        expect(form).toHaveClass('was-validated');
      });
    });
  });

  describe('when register user fails', () => {
    it('with custom error message', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).register.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'custom error',
      });

      render(<CreateAnAccount {...defaultProps} />);

      await userEvent.type(screen.getByRole('textbox', { name: /Username/ }), 'userAlias');
      await userEvent.type(screen.getByRole('textbox', { name: /Email/ }), 'test@email.com');
      await userEvent.type(screen.getByRole('textbox', { name: 'First Name' }), 'John');
      await userEvent.type(screen.getByRole('textbox', { name: 'Last Name' }), 'Smith');
      await userEvent.type(screen.getByTestId('passwordInput'), '123qwe');
      await userEvent.type(screen.getByTestId('confirmPasswordInput'), '123qwe');

      const form = screen.getByTestId('createAnAccountForm');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(0);
      });

      await waitFor(() => {
        expect(setApiErrorMock).toHaveBeenCalledTimes(1);
        expect(setApiErrorMock).toHaveBeenCalledWith('An error occurred registering the user: custom error');
      });
    });

    it('default error message', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).register.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      render(<CreateAnAccount {...defaultProps} />);

      await userEvent.type(screen.getByRole('textbox', { name: /Username/ }), 'userAlias');
      await userEvent.type(screen.getByRole('textbox', { name: /Email/ }), 'test@email.com');
      await userEvent.type(screen.getByRole('textbox', { name: 'First Name' }), 'John');
      await userEvent.type(screen.getByRole('textbox', { name: 'Last Name' }), 'Smith');
      await userEvent.type(screen.getByTestId('passwordInput'), '123qwe');
      await userEvent.type(screen.getByTestId('confirmPasswordInput'), '123qwe');

      const form = screen.getByTestId('createAnAccountForm');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(0);
      });

      await waitFor(() => {
        expect(setApiErrorMock).toHaveBeenCalledTimes(1);
        expect(setApiErrorMock).toHaveBeenCalledWith('An error occurred registering the user, please try again later.');
      });
    });
  });
});
