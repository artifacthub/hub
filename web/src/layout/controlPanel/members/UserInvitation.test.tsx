import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import API from '../../../api';
import { ErrorKind } from '../../../types';
import UserInvitation from './UserInvitation';
vi.mock('../../../api');

const defaultProps = {
  orgToConfirm: 'orgTest',
};

describe('UserInvitation', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    vi.mocked(API).confirmOrganizationMembership.mockResolvedValue(null);

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
    vi.mocked(API).confirmOrganizationMembership.mockResolvedValue(null);

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
      vi.mocked(API).confirmOrganizationMembership.mockRejectedValue({
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
      vi.mocked(API).confirmOrganizationMembership.mockRejectedValue({
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
      vi.mocked(API).confirmOrganizationMembership.mockRejectedValue({
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
