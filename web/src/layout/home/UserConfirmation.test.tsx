import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import UserConfirmation from './UserConfirmation';
jest.mock('../../api');

const defaultProps = {
  emailCode: 'code',
};

describe('UserConfirmation', () => {
  it('creates snapshot', async () => {
    mocked(API).verifyEmail.mockResolvedValue(null);

    const result = render(
      <Router>
        <UserConfirmation {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
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
      expect(getByText('You email has been verified! Please, login to Artifact Hub.')).toBeInTheDocument();
    });
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
    it('error 400', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        status: 400,
        message: 'Error 400',
      });

      const { getByText } = render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(getByText('Error 400')).toBeInTheDocument();
      });
    });

    it('error 410', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        status: 410,
      });

      const { getByText } = render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(getByText('Sorry, your confirmation code has expired.')).toBeInTheDocument();
      });
    });

    it('default error message', async () => {
      mocked(API).verifyEmail.mockRejectedValue({
        status: 500,
      });

      const { getByText } = render(
        <Router>
          <UserConfirmation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(
          getByText('An error occurred verifying your email, please contact us about this issue.')
        ).toBeInTheDocument();
      });
    });
  });
});
