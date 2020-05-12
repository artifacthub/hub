import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
import { Profile } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import UpdateProfile from './UpdateProfile';
jest.mock('../../../../../api');
jest.mock('../../../../../utils/alertDispatcher');

const profile: Profile = {
  alias: 'userAlias',
  firstName: 'John',
  lastName: 'Smith',
  email: 'jsmith@email.com',
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
    const result = render(<UpdateProfile {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId, getByDisplayValue } = render(<UpdateProfile {...defaultProps} />);

      const form = getByTestId('updateProfileForm');
      expect(form).toBeInTheDocument();
      expect(getByDisplayValue(profile.alias)).toBeInTheDocument();
      expect(getByDisplayValue(profile.email)).toBeInTheDocument();
      expect(getByDisplayValue(profile.firstName!)).toBeInTheDocument();
      expect(getByDisplayValue(profile.lastName!)).toBeInTheDocument();
    });

    it('calls updateUserProfile', async () => {
      mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
      mocked(API).updateUserProfile.mockResolvedValue(null);

      const { getByTestId, getByDisplayValue } = render(<UpdateProfile {...defaultProps} />);

      const alias = getByDisplayValue(profile.alias);
      fireEvent.change(alias, { target: { value: 'userAlias1' } });

      const btn = getByTestId('updateProfileBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
        expect(API.updateUserProfile).toHaveBeenCalledWith({
          alias: 'userAlias1',
          firstName: 'John',
          lastName: 'Smith',
        });
      });
    });
  });

  describe('when updateUserProfile fails', () => {
    it('error 400', async () => {
      mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
      mocked(API).updateUserProfile.mockRejectedValue({
        status: 400,
        statusText: 'Error 400',
      });

      const { getByTestId, getByDisplayValue } = render(<UpdateProfile {...defaultProps} />);

      const alias = getByDisplayValue(profile.alias);
      fireEvent.change(alias, { target: { value: 'userAlias1' } });

      const btn = getByTestId('updateProfileBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred updating your profile: Error 400',
      });
    });

    it('error 401', async () => {
      mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
      mocked(API).updateUserProfile.mockRejectedValue({
        statusText: 'ErrLoginRedirect',
      });

      const { getByTestId, getByDisplayValue } = render(<UpdateProfile {...defaultProps} />);

      const alias = getByDisplayValue(profile.alias);
      fireEvent.change(alias, { target: { value: 'userAlias1' } });

      const btn = getByTestId('updateProfileBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('default error message', async () => {
      mocked(API).checkAvailability.mockRejectedValue({ status: 404 });
      mocked(API).updateUserProfile.mockRejectedValue({
        status: 500,
      });

      const { getByTestId, getByDisplayValue } = render(<UpdateProfile {...defaultProps} />);

      const alias = getByDisplayValue(profile.alias);
      fireEvent.change(alias, { target: { value: 'userAlias1' } });

      const btn = getByTestId('updateProfileBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.updateUserProfile).toHaveBeenCalledTimes(1);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred updating your profile, please try again later',
      });
    });
  });
});
