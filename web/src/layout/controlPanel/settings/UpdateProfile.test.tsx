import { render } from '@testing-library/react';
import React from 'react';

import { Profile } from '../../../types';
import UpdateProfile from './UpdateProfile';
jest.mock('../../../api');

const profile: Profile = {
  alias: 'userAlias',
  firstName: 'John',
  lastName: 'Smith',
  email: 'jsmith@email.com',
};

const defaultProps = {
  onAuthError: jest.fn(),
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
  });
});
