import { render, screen } from '@testing-library/react';

import { Organization } from '../../../../../types';
import UpdateOrg from './UpdateOrg';
jest.mock('../../../../../api');

const getMockOrganization = (fixtureId: string): Organization => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

    const { asFragment } = render(<UpdateOrg {...defaultProps} organization={mockOrganization} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders organization details in form', () => {
      const mockOrganization = getMockOrganization('2');

      render(<UpdateOrg {...defaultProps} organization={mockOrganization} />);

      const form = screen.getByTestId('organizationForm');

      expect(form).toBeInTheDocument();
      expect(screen.getByAltText('Logo')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.displayName!)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.homeUrl!)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOrganization.description!)).toBeInTheDocument();
    });
  });
});
