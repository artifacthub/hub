import { render, screen } from '@testing-library/react';

import { Organization } from '../../../types';
import Modal from './Modal';

const orgMock: Organization = {
  name: 'orgTest',
  displayName: 'Org test',
  homeUrl: 'http://test.org',
  logoImageId: '1234',
  description: 'Org description',
};

const defaultProps = {
  open: true,
  organization: orgMock,
  onAuthError: jest.fn(),
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

describe('OrganizationModal - organizations section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Modal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component when org is defined', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByTestId('organizationForm')).toBeInTheDocument();
      expect(screen.getByText('Update organization')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('renders component when org is undefined', () => {
      render(<Modal {...defaultProps} organization={undefined} />);

      expect(screen.getByTestId('organizationForm')).toBeInTheDocument();
      expect(screen.getByText('Add organization')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });
});
