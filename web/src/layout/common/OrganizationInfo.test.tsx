import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../api';
import { Organization } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import OrganizationInfo from './OrganizationInfo';
jest.mock('../../api');

const defaultProps = {
  organizationName: 'orgname',
  visibleLegend: false,
};

const user = userEvent.setup({ delay: null });

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const getMockOrganization = (fixtureId: string): Organization => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/OrganizationInfo/${fixtureId}.json`) as Organization;
};

describe('OrganizationInfo', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OrganizationInfo {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<OrganizationInfo {...defaultProps} />);
    expect(screen.getByText(defaultProps.organizationName)).toBeInTheDocument();
    expect(screen.getByLabelText('Organization info')).toBeInTheDocument();
  });

  it('calls navigate to click org link', async () => {
    render(<OrganizationInfo {...defaultProps} />);
    await userEvent.click(screen.getByLabelText('Organization info'));

    await waitFor(() => expect(mockUseNavigate).toHaveBeenCalledTimes(1));
    expect(mockUseNavigate).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQueryString({
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
    await user.hover(screen.getByLabelText('Organization info'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('button')).toBeInTheDocument();
    expect(screen.getByAltText(mockOrganization.displayName!)).toBeInTheDocument();
    expect(screen.getByAltText(mockOrganization.displayName!)).toHaveProperty(
      'src',
      `http://localhost/image/${mockOrganization.logoImageId!}`
    );
    expect(screen.getByText(mockOrganization.description!)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByRole('complementary')).toHaveClass('show');

    await user.unhover(screen.getByLabelText('Organization info'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByRole('complementary')).not.toHaveClass('show');

    jest.useRealTimers();
  });

  it('hides org info to leave org dropdown', async () => {
    jest.useFakeTimers();

    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    render(<OrganizationInfo {...defaultProps} />);
    await user.hover(screen.getByLabelText('Organization info'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('button')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByRole('complementary')).toHaveClass('show');

    await user.unhover(screen.getByRole('complementary'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByRole('complementary')).not.toHaveClass('show');

    jest.useRealTimers();
  });

  it('does not render dropdown content when api call fails', async () => {
    mocked(API).getOrganization.mockRejectedValue('');

    render(<OrganizationInfo {...defaultProps} />);
    await userEvent.hover(screen.getByLabelText('Organization info'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('complementary')).toBeEmptyDOMElement();
  });

  it('does not call getOrganization if user is over link less than 100ms', async () => {
    jest.useFakeTimers();

    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    render(<OrganizationInfo {...defaultProps} />);
    await user.hover(screen.getByLabelText('Organization info'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    await user.unhover(screen.getByLabelText('Organization info'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(0);
    });

    await user.hover(screen.getByLabelText('Organization info'));

    act(() => {
      jest.advanceTimersByTime(150);
    });

    await user.unhover(screen.getByLabelText('Organization info'));

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });
});
