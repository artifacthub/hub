import { render } from '@testing-library/react';
import React from 'react';

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
    const result = render(<Modal {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component when org is defined', () => {
      const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

      expect(getByTestId('organizationForm')).toBeInTheDocument();
      expect(getByText('Update organization')).toBeInTheDocument();
      expect(getByText('Update')).toBeInTheDocument();
    });

    it('renders component when org is undefined', () => {
      const { getByTestId, getByText } = render(<Modal {...defaultProps} organization={undefined} />);

      expect(getByTestId('organizationForm')).toBeInTheDocument();
      expect(getByText('Add organization')).toBeInTheDocument();
      expect(getByText('Add')).toBeInTheDocument();
    });
  });
});
