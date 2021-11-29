import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
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

    const { asFragment } = render(
      <Router>
        <UserConfirmation {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  it('when email code is valid', async () => {
    mocked(API).verifyEmail.mockResolvedValue(null);

    render(
      <Router>
        <UserConfirmation {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.verifyEmail).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/You email has been verified! Please, login to/g)).toBeInTheDocument();
  });

  it('does not render component when email code is undefined', () => {
    render(
      <Router>
        <UserConfirmation />
      </Router>
    );

    expect(screen.queryByTestId('userConfirmationModal')).toBeNull();
  });

  describe('when email code is invalid', () => {
    it('with custom error message', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'custom error',
      });

      render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByText('Sorry, custom error')).toBeInTheDocument();
    });

    it('Code has expired', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'email verification code has expired.',
      });

      render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Sorry, email verification code has expired.')).toBeInTheDocument();
    });

    it('default error message', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.verifyEmail).toHaveBeenCalledTimes(1);
      });

      expect(
        screen.getByText('An error occurred verifying your email, please contact us about this issue.')
      ).toBeInTheDocument();
    });
  });
});
