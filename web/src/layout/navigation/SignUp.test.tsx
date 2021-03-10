import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import SignUp from './SignUp';
jest.mock('../../api');

const setOpenSignUpMock = jest.fn();

const defaultProps = {
  openSignUp: true,
  setOpenSignUp: setOpenSignUpMock,
};

Object.defineProperty(document, 'querySelector', {
  value: () => ({
    getAttribute: () => 'true',
  }),
  writable: true,
});

describe('SignUp', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SignUp {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(<SignUp {...defaultProps} />);

      expect(getByText('Create your account using your email')).toBeInTheDocument();
      expect(getByTestId('signUpBtn')).toBeInTheDocument();
      expect(getByText('Github')).toBeInTheDocument();
      expect(getByText('Google')).toBeInTheDocument();
      expect(getByText('OpenID Connect')).toBeInTheDocument();
    });

    it('renders create an account form to click Sign up button', () => {
      const { getByTestId } = render(<SignUp {...defaultProps} />);

      const btn = getByTestId('signUpBtn');
      fireEvent.click(btn);

      waitFor(() => {
        expect(getByTestId('createAnAccountForm')).toBeInTheDocument();
      });
    });
  });
});
