import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { Organization } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import OrganizationInfo from './OrganizationInfo';
jest.mock('../../api');

const defaultProps = {
  organizationName: 'orgname',
  visibleLegend: false,
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const getMockOrganization = (fixtureId: string): Organization => {
  return require(`./__fixtures__/OrganizationInfo/${fixtureId}.json`) as Organization;
};

describe('OrganizationInfo', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OrganizationInfo {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<OrganizationInfo {...defaultProps} />);
    expect(screen.getByText(defaultProps.organizationName)).toBeInTheDocument();
    expect(screen.getByTestId('orgLink')).toBeInTheDocument();
  });

  it('calls history push to click org link', async () => {
    render(<OrganizationInfo {...defaultProps} />);
    userEvent.click(screen.getByTestId('orgLink'));

    await waitFor(() => expect(mockHistoryPush).toHaveBeenCalledTimes(1));
    expect(mockHistoryPush).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQuerystring({
        pageNumber: 1,
        filters: {
          org: [defaultProps.organizationName],
        },
      }),
    });
  });

  it('displays org info to enter on link and hides on leave', async () => {
    jest.useFakeTimers();

    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    render(<OrganizationInfo {...defaultProps} />);
    userEvent.hover(screen.getByTestId('orgLink'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('externalBtn')).toBeInTheDocument();
    expect(screen.getByAltText(mockOrganization.displayName!)).toBeInTheDocument();
    expect(screen.getByAltText(mockOrganization.displayName!)).toHaveProperty(
      'src',
      `http://localhost/image/${mockOrganization.logoImageId!}`
    );
    expect(screen.getByText(mockOrganization.description!)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByTestId('orgInfoDropdown')).toHaveClass('show');

    userEvent.unhover(screen.getByTestId('orgLink'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByTestId('orgInfoDropdown')).not.toHaveClass('show');

    jest.useRealTimers();
  });

  it('hides org info to leave org dropdown', async () => {
    jest.useFakeTimers();

    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    render(<OrganizationInfo {...defaultProps} />);
    userEvent.hover(screen.getByTestId('orgLink'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    userEvent.hover(screen.getByTestId('orgInfoDropdown'));
    userEvent.unhover(screen.getByTestId('orgLink'));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByTestId('orgInfoDropdown')).toHaveClass('show');

    userEvent.unhover(screen.getByTestId('orgInfoDropdown'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByTestId('orgInfoDropdown')).not.toHaveClass('show');

    jest.useRealTimers();
  });

  it('does not render dropdown content when api call fails', async () => {
    mocked(API).getOrganization.mockRejectedValue('');

    render(<OrganizationInfo {...defaultProps} />);
    userEvent.hover(screen.getByTestId('orgLink'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByTestId('orgInfoDropdown')).toBeEmptyDOMElement();
  });
});
