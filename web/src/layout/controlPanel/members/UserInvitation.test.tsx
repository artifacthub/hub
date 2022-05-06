import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { ErrorKind } from '../../../types';
import UserInvitation from './UserInvitation';
jest.mock('../../../api');

const defaultProps = {
  orgToConfirm: 'orgTest',
};

describe('UserInvitation', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).confirmOrganizationMembership.mockResolvedValue(null);

    const { asFragment } = render(
      <Router>
        <UserInvitation {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('You have accepted the invitation to join the organization.')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('when org name is valid', async () => {
    mocked(API).confirmOrganizationMembership.mockResolvedValue(null);

    render(
      <Router>
        <UserInvitation {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('You have accepted the invitation to join the organization.')).toBeInTheDocument();
  });

  it('does not render component when email code is undefined', () => {
    render(
      <Router>
        <UserInvitation />
      </Router>
    );

    expect(screen.queryByTestId('userInvitationModal')).toBeNull();
  });

  describe('when email code is invalid', () => {
    it('with message', async () => {
      mocked(API).confirmOrganizationMembership.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'The request sent was not valid',
      });

      render(
        <Router>
          <UserInvitation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('The request sent was not valid')).toBeInTheDocument();
    });

    it('UnauthorizedError', async () => {
      mocked(API).confirmOrganizationMembership.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <UserInvitation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
      });

      expect(
        await screen.findByText(
          'Please sign in to accept the invitation to join the organization. You can accept it from the Control Panel, in the organizations tab, or from the link you received in the invitation email.'
        )
      ).toBeInTheDocument();
    });

    it('without message', async () => {
      mocked(API).confirmOrganizationMembership.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      render(
        <Router>
          <UserInvitation {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.confirmOrganizationMembership).toHaveBeenCalledTimes(1);
      });

      expect(
        await screen.findByText('An error occurred accepting your invitation, please contact us about this issue.')
      ).toBeInTheDocument();
    });
  });
});
