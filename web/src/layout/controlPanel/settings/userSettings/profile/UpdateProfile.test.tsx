import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../../../api';
import { ErrorKind, Profile } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import UpdateProfile from './UpdateProfile';
jest.mock('../../../../../api');
jest.mock('../../../../../utils/alertDispatcher');

const profile: Profile = {
  alias: 'userAlias',
  profileImageId: '123',
  firstName: 'John',
  lastName: 'Smith',
  email: 'jsmith@email.com',
  passwordSet: true,
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
  profile: profile,
};

describe('Update profile - user settings', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<UpdateProfile {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<UpdateProfile {...defaultProps} />);

      const form = screen.getByTestId('updateProfileForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByLabelText(/Profile image/)).toBeInTheDocument();
      expect(screen.getByDisplayValue(profile.alias)).toBeInTheDocument();
      expect(screen.getByDisplayValue(profile.email)).toBeInTheDocument();
      expect(screen.getByDisplayValue(profile.firstName!)).toBeInTheDocument();
      expect(screen.getByDisplayValue(profile.lastName!)).toBeInTheDocument();
    });

    it('calls updateUserProfile', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).updateUserProfile.mockResolvedValue(null);

      render(<UpdateProfile {...defaultProps} />);

      const alias = screen.getByDisplayValue(profile.alias);
      await userEvent.type(alias, '1');

      const btn = screen.getByRole('button', { name: 'Update profile' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
        expect(API.updateUserProfile).toHaveBeenCalledWith({
          alias: 'userAlias1',
          profileImageId: '123',
          firstName: 'John',
          lastName: 'Smith',
        });
      });
    });
  });

  describe('when updateUserProfile fails', () => {
    it('with custom error message', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).updateUserProfile.mockRejectedValue({
        kind: ErrorKind.Other,
        message: 'custom error',
      });

      render(<UpdateProfile {...defaultProps} />);

      const alias = screen.getByDisplayValue(profile.alias);
      await userEvent.type(alias, '1');

      const btn = screen.getByRole('button', { name: 'Update profile' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred updating your profile: custom error',
        });
      });
    });

    it('UnauthorizedError', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).updateUserProfile.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(<UpdateProfile {...defaultProps} />);

      const alias = screen.getByDisplayValue(profile.alias);
      await userEvent.type(alias, '1');

      const btn = screen.getByRole('button', { name: 'Update profile' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });

    it('without custom error message', async () => {
      mocked(API).checkAvailability.mockResolvedValue(false);
      mocked(API).updateUserProfile.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      render(<UpdateProfile {...defaultProps} />);

      const alias = screen.getByDisplayValue(profile.alias);
      await userEvent.type(alias, '1');

      const btn = screen.getByRole('button', { name: 'Update profile' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred updating your profile, please try again later.',
        });
      });
    });
  });
});
