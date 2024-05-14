import { render, screen } from '@testing-library/react';

import UserSettingsSection from './index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../../../common/SectionPanel', () => (props: any) => <div>{props.defaultSection}</div>);

const defaultProps = {
  activePage: null,
  activeSection: 'user',
  onAuthError: jest.fn(),
};

describe('UserSettingsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const { asFragment } = render(<UserSettingsSection {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders profile section', () => {
      render(<UserSettingsSection subsection="profile" {...defaultProps} />);

      expect(screen.getByText('profile')).toBeInTheDocument();
    });

    it('renders subscriptions section', () => {
      render(<UserSettingsSection subsection="subscriptions" {...defaultProps} />);

      expect(screen.getByText('subscriptions')).toBeInTheDocument();
    });

    it('renders apiKeys section', () => {
      render(<UserSettingsSection subsection="api-keys" {...defaultProps} />);

      expect(screen.getByText('api-keys')).toBeInTheDocument();
    });

    it('renders webhooks section', () => {
      render(<UserSettingsSection subsection="webhooks" {...defaultProps} />);

      expect(screen.getByText('webhooks')).toBeInTheDocument();
    });

    it('renders profile as default section', () => {
      render(<UserSettingsSection {...defaultProps} />);

      expect(screen.getByText('profile')).toBeInTheDocument();
    });
  });
});
