import { render } from '@testing-library/react';
import React from 'react';

import { Organization } from '../../../../../types';
import UpdateOrg from './UpdateOrg';
jest.mock('../../../../../api');

const getMockOrganization = (fixtureId: string): Organization => {
  return require(`./__fixtures__/UpdateOrg/${fixtureId}.json`) as Organization;
};

const onAuthErrorMock = jest.fn();
const onSuccessMock = jest.fn();

const defaultProps = {
  selectedOrg: 'orgTest',
  isLoading: false,
  onAuthError: onAuthErrorMock,
  onSuccess: onSuccessMock,
};

describe('Organization settings index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockOrganization = getMockOrganization('1');

    const result = render(<UpdateOrg {...defaultProps} organization={mockOrganization} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders organization details in form', () => {
      const mockOrganization = getMockOrganization('2');

      const { getByTestId, getByAltText, getByDisplayValue } = render(
        <UpdateOrg {...defaultProps} organization={mockOrganization} />
      );

      const form = getByTestId('organizationForm');

      expect(form).toBeInTheDocument();
      expect(getByAltText('Logo')).toBeInTheDocument();
      expect(getByDisplayValue(mockOrganization.name)).toBeInTheDocument();
      expect(getByDisplayValue(mockOrganization.displayName!)).toBeInTheDocument();
      expect(getByDisplayValue(mockOrganization.homeUrl!)).toBeInTheDocument();
      expect(getByDisplayValue(mockOrganization.description!)).toBeInTheDocument();
    });
  });
});
