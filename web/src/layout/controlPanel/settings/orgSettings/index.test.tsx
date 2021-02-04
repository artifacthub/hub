import { render } from '@testing-library/react';
import React from 'react';

import OrganizationSettingsSection from './index';

jest.mock('../../../common/SectionPanel', () => (props: any) => <div>{props.defaultSection}</div>);

const defaultProps = {
  activeSection: 'user',
  onAuthError: jest.fn(),
};

describe('OrganizationSettingsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<OrganizationSettingsSection {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders profile section', () => {
      const { getByText } = render(<OrganizationSettingsSection subsection="profile" {...defaultProps} />);

      expect(getByText('profile')).toBeInTheDocument();
    });

    it('renders webhooks section', () => {
      const { getByText } = render(<OrganizationSettingsSection subsection="webhooks" {...defaultProps} />);

      expect(getByText('webhooks')).toBeInTheDocument();
    });

    it('renders authorization section', () => {
      const { getByText } = render(<OrganizationSettingsSection subsection="authorization" {...defaultProps} />);

      expect(getByText('authorization')).toBeInTheDocument();
    });

    it('renders profile as default section', () => {
      const { getByText } = render(<OrganizationSettingsSection {...defaultProps} />);

      expect(getByText('profile')).toBeInTheDocument();
    });
  });
});
