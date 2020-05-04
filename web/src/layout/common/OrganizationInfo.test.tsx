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
  visibleLegend: false,
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
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
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

  it('displays org info to enter on link and hides on leave', async () => {
    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    const { getByTestId, getByAltText, getByText } = render(<OrganizationInfo {...defaultProps} />);
    fireEvent.mouseEnter(getByTestId('orgLink'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    expect(getByTestId('externalBtn')).toBeInTheDocument();
    expect(getByAltText(mockOrganization.displayName!)).toBeInTheDocument();
    expect(getByAltText(mockOrganization.displayName!)).toHaveProperty(
      'src',
      `http://localhost/image/${mockOrganization.logoImageId!}`
    );
    expect(getByText(mockOrganization.description!)).toBeInTheDocument();

    await waitFor(() => {
      expect(getByTestId('orgInfoDropdown')).toHaveClass('show');
    });

    fireEvent.mouseLeave(getByTestId('orgLink'));
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 200);

    waitFor(() => {
      expect(getByTestId('orgInfoDropdown')).not.toHaveClass('show');
    });
  });

  it('hides org info to leave org dropdown', async () => {
    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    const { getByTestId } = render(<OrganizationInfo {...defaultProps} />);
    fireEvent.mouseEnter(getByTestId('orgLink'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    fireEvent.mouseEnter(getByTestId('orgInfoDropdown'));
    fireEvent.mouseLeave(getByTestId('orgLink'));

    expect(getByTestId('orgInfoDropdown')).toHaveClass('show');

    fireEvent.mouseLeave(getByTestId('orgInfoDropdown'));
    waitFor(() => {
      expect(getByTestId('orgInfoDropdown')).not.toHaveClass('show');
    });
  });

  it('does not render dropdown content when api call fails', async () => {
    mocked(API).getOrganization.mockRejectedValue('');

    const { getByTestId } = render(<OrganizationInfo {...defaultProps} />);
    fireEvent.mouseEnter(getByTestId('orgLink'));

    expect(API.getOrganization).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getByTestId('orgInfoDropdown')).toBeEmpty();
    });
  });
});
