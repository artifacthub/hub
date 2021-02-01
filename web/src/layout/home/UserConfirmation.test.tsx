import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { ErrorKind } from '../../types';
import UserConfirmation from './UserConfirmation';
jest.mock('../../api');

const defaultProps = {
  emailCode: 'code',
};

describe('UserConfirmation', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).verifyEmail.mockResolvedValue(null);

    const result = render(
      <Router>
        <UserConfirmation {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  it('when email code is valid', async () => {
    mocked(API).verifyEmail.mockResolvedValue(null);

    const { getByText } = render(
      <Router>
        <UserConfirmation {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.verifyEmail).toHaveBeenCalledTimes(1);
    });
    expect(getByText('You email has been verified! Please, login to Artifact Hub.')).toBeInTheDocument();
  });

  it('does not render component when email code is undefined', () => {
    const { queryByTestId } = render(
      <Router>
        <UserConfirmation />
      </Router>
    );

    expect(queryByTestId('userConfirmationModal')).toBeNull();
  });

  describe('when email code is invalid', () => {
    it('with custom error message', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'custom error',
      });

      const { getByText } = render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      });
      expect(getByText('Sorry, custom error')).toBeInTheDocument();
    });

    it('Code has expired', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'email verification code has expired.',
      });

      const { getByText } = render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Sorry, email verification code has expired.')).toBeInTheDocument();
    });

    it('default error message', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const { getByText } = render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      });

      expect(
        getByText('An error occurred verifying your email, please contact us about this issue.')
      ).toBeInTheDocument();
    });
  });
});
