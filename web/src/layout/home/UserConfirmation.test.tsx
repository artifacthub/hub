import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

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
    });

    expect(await screen.findByText(/You email has been verified! Please, login to/)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
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
    expect(await screen.findByText(/You email has been verified! Please, login to/)).toBeInTheDocument();
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
      expect(await screen.findByText('Sorry, custom error')).toBeInTheDocument();
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

      expect(await screen.findByText('Sorry, email verification code has expired.')).toBeInTheDocument();
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
        await screen.findByText('An error occurred verifying your email, please contact us about this issue.')
      ).toBeInTheDocument();
    });
  });
});
