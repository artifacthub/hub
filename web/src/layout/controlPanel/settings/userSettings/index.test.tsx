import { render } from '@testing-library/react';
import React from 'react';

import UserSettingsSection from './index';

jest.mock('../../../common/SectionPanel', () => (props: any) => <div>{props.defaultSection}</div>);

const defaultProps = {
  activeSection: 'user',
  onAuthError: jest.fn(),
};

describe('UserSettingsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const result = render(<UserSettingsSection {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders profile section', () => {
      const { getByText } = render(<UserSettingsSection subsection="profile" {...defaultProps} />);

      expect(getByText('profile')).toBeInTheDocument();
    });

    it('renders subscriptions section', () => {
      const { getByText } = render(<UserSettingsSection subsection="subscriptions" {...defaultProps} />);

      expect(getByText('subscriptions')).toBeInTheDocument();
    });

    it('renders apiKeys section', () => {
      const { getByText } = render(<UserSettingsSection subsection="api-keys" {...defaultProps} />);

      expect(getByText('api-keys')).toBeInTheDocument();
    });

    it('renders webhooks section', () => {
      const { getByText } = render(<UserSettingsSection subsection="webhooks" {...defaultProps} />);

      expect(getByText('webhooks')).toBeInTheDocument();
    });

    it('renders profile as default section', () => {
      const { getByText } = render(<UserSettingsSection {...defaultProps} />);

      expect(getByText('profile')).toBeInTheDocument();
    });
  });
});
