import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { Organization } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import OrganizationInfo from './OrganizationInfo';
jest.mock('../../api');

const defaultProps = {
  organizationName: 'orgname',
  deprecated: false,
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const getMockOrganization = (fixtureId: string): Organization => {
  return require(`./__fixtures__/OrganizationInfo/${fixtureId}.json`) as Organization;
};

describe('OrganizationInfo', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<OrganizationInfo {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByText, getByTestId } = render(<OrganizationInfo {...defaultProps} />);
    expect(getByText(defaultProps.organizationName)).toBeInTheDocument();
    expect(getByTestId('orgLink')).toBeInTheDocument();
  });

  it('calls history push to click org link', () => {
    const { getByTestId } = render(<OrganizationInfo {...defaultProps} />);
    fireEvent.click(getByTestId('orgLink'));
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQuerystring({
        pageNumber: 1,
        filters: {
          org: [defaultProps.organizationName],
        },
        deprecated: defaultProps.deprecated,
      }),
    });
  });

  it('calls history push to click org link', async () => {
    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    const { getByTestId, getByAltText, getByText } = render(<OrganizationInfo {...defaultProps} />);
    fireEvent.mouseEnter(getByTestId('orgLink'));

    expect(API.getOrganization).toHaveBeenCalledTimes(1);
    await waitFor(() => {});

    expect(getByTestId('externalBtn')).toBeInTheDocument();
    expect(getByAltText(mockOrganization.displayName!)).toBeInTheDocument();
    expect(getByAltText(mockOrganization.displayName!)).toHaveProperty(
      'src',
      `http://localhost/image/${mockOrganization.logoImageId!}`
    );
    expect(getByText(mockOrganization.description!)).toBeInTheDocument();
    expect(getByTestId('orgInfoDropdown')).toHaveClass('show');

    fireEvent.mouseLeave(getByTestId('orgLink'));
    expect(getByTestId('orgInfoDropdown')).not.toHaveClass('show');
  });
});
