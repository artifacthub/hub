import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
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
    const result = render(<CreateAnAccount {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<CreateAnAccount {...defaultProps} />);

      expect(getByText('Username')).toBeInTheDocument();
      expect(getByText('Email')).toBeInTheDocument();
      expect(getByText('First Name')).toBeInTheDocument();
      expect(getByText('Last Name')).toBeInTheDocument();
      expect(getByText('Password')).toBeInTheDocument();
      expect(getByText('Confirm password')).toBeInTheDocument();
    });

    it('renders success info', () => {
      const { getByText } = render(<CreateAnAccount {...defaultProps} success />);

      expect(getByText('A verification link has been sent to your email account')).toBeInTheDocument();
      expect(
        getByText(
          'Please click on the link that has just been sent to your email account to verify your email and finish the registration process.'
        )
      ).toBeInTheDocument();
      expect(getByText('is only valid for 24 hours')).toBeInTheDocument();
    });

    it('calls registerUser', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).register.mockResolvedValue(null);

      const { getByTestId } = render(<CreateAnAccount {...defaultProps} />);

      fireEvent.change(getByTestId('aliasInput'), { target: { value: 'userAlias' } });
      fireEvent.change(getByTestId('emailInput'), { target: { value: 'test@email.com' } });
      fireEvent.change(getByTestId('firstNameInput'), { target: { value: 'John' } });
      fireEvent.change(getByTestId('lastNameInput'), { target: { value: 'Smith' } });
      fireEvent.change(getByTestId('passwordInput'), { target: { value: '123qwe' } });
      fireEvent.change(getByTestId('confirmPasswordInput'), { target: { value: '123qwe' } });

      const form = getByTestId('createAnAccountForm');
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

      const { getByTestId } = render(<CreateAnAccount {...defaultProps} />);

      fireEvent.change(getByTestId('aliasInput'), { target: { value: 'userAlias' } });
      fireEvent.change(getByTestId('emailInput'), { target: { value: 'test@email.com' } });
      fireEvent.change(getByTestId('firstNameInput'), { target: { value: 'John' } });
      fireEvent.change(getByTestId('lastNameInput'), { target: { value: 'Smith' } });
      fireEvent.change(getByTestId('passwordInput'), { target: { value: '123qwe*$' } });
      fireEvent.change(getByTestId('confirmPasswordInput'), { target: { value: '123qwe*$' } });

      const form = getByTestId('createAnAccountForm');
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

      const { getByTestId } = render(<CreateAnAccount {...defaultProps} />);

      fireEvent.change(getByTestId('aliasInput'), { target: { value: 'userAlias' } });
      fireEvent.change(getByTestId('emailInput'), { target: { value: 'test@email.com' } });
      fireEvent.change(getByTestId('firstNameInput'), { target: { value: 'John' } });
      fireEvent.change(getByTestId('lastNameInput'), { target: { value: 'Smith' } });
      fireEvent.change(getByTestId('passwordInput'), { target: { value: '123qwe' } });
      fireEvent.change(getByTestId('confirmPasswordInput'), { target: { value: '123qwe' } });

      const form = getByTestId('createAnAccountForm');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(0);
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

      const { getByTestId } = render(<CreateAnAccount {...defaultProps} />);

      fireEvent.change(getByTestId('aliasInput'), { target: { value: 'userAlias' } });
      fireEvent.change(getByTestId('emailInput'), { target: { value: 'test@email.com' } });
      fireEvent.change(getByTestId('firstNameInput'), { target: { value: 'John' } });
      fireEvent.change(getByTestId('lastNameInput'), { target: { value: 'Smith' } });
      fireEvent.change(getByTestId('passwordInput'), { target: { value: '123qwe' } });
      fireEvent.change(getByTestId('confirmPasswordInput'), { target: { value: '123qwe' } });

      const form = getByTestId('createAnAccountForm');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(0);
      });
      expect(setApiErrorMock).toHaveBeenCalledTimes(1);
      expect(setApiErrorMock).toHaveBeenCalledWith('An error occurred registering the user: custom error');
    });

    it('default error message', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).register.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const { getByTestId } = render(<CreateAnAccount {...defaultProps} />);

      fireEvent.change(getByTestId('aliasInput'), { target: { value: 'userAlias' } });
      fireEvent.change(getByTestId('emailInput'), { target: { value: 'test@email.com' } });
      fireEvent.change(getByTestId('firstNameInput'), { target: { value: 'John' } });
      fireEvent.change(getByTestId('lastNameInput'), { target: { value: 'Smith' } });
      fireEvent.change(getByTestId('passwordInput'), { target: { value: '123qwe' } });
      fireEvent.change(getByTestId('confirmPasswordInput'), { target: { value: '123qwe' } });

      const form = getByTestId('createAnAccountForm');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(API.register).toHaveBeenCalledTimes(0);
      });

      expect(setApiErrorMock).toHaveBeenCalledTimes(1);
      expect(setApiErrorMock).toHaveBeenCalledWith('An error occurred registering the user, please try again later.');
    });
  });
});
