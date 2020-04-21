import { render } from '@testing-library/react';
import React from 'react';

import CreateAnAccount from './CreateAnAccount';
jest.mock('../../api');

const defaultProps = {
  apiError: null,
  setApiError: jest.fn(),
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
    });
  });
});
