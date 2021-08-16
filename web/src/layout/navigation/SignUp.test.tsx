import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const { asFragment } = render(<SignUp {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SignUp {...defaultProps} />);

      expect(screen.getByText('Create your account using your email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open sign up form' })).toBeInTheDocument();
      expect(screen.getByText('Github')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('OpenID Connect')).toBeInTheDocument();
    });

    it('renders create an account form to click Sign up button', () => {
      render(<SignUp {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open sign up form' });
      userEvent.click(btn);

      waitFor(() => {
        expect(screen.getByTestId('createAnAccountForm')).toBeInTheDocument();
      });
    });
  });
});
