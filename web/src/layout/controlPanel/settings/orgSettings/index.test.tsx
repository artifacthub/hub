import { render, screen } from '@testing-library/react';

import OrganizationSettingsSection from './index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../../../common/SectionPanel', () => (props: any) => <div>{props.defaultSection}</div>);

const defaultProps = {
  activePage: null,
  activeSection: 'user',
  onAuthError: jest.fn(),
};

describe('OrganizationSettingsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OrganizationSettingsSection {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders profile section', () => {
      render(<OrganizationSettingsSection subsection="profile" {...defaultProps} />);

      expect(screen.getByText('profile')).toBeInTheDocument();
    });

    it('renders webhooks section', () => {
      render(<OrganizationSettingsSection subsection="webhooks" {...defaultProps} />);

      expect(screen.getByText('webhooks')).toBeInTheDocument();
    });

    it('renders authorization section', () => {
      render(<OrganizationSettingsSection subsection="authorization" {...defaultProps} />);

      expect(screen.getByText('authorization')).toBeInTheDocument();
    });

    it('renders profile as default section', () => {
      render(<OrganizationSettingsSection {...defaultProps} />);

      expect(screen.getByText('profile')).toBeInTheDocument();
    });
  });
});
