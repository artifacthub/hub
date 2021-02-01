import { render } from '@testing-library/react';
import React from 'react';

import SettingsSection from './index';

jest.mock('./userSettings', () => () => <div>user</div>);
jest.mock('./orgSettings', () => () => <div>org</div>);

const defaultProps = {
  onAuthError: jest.fn(),
};

describe('SettingsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SettingsSection context="user" {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders user settings', () => {
      const { getByText } = render(<SettingsSection context="user" {...defaultProps} />);

      expect(getByText('user')).toBeInTheDocument();
    });

    it('renders org settings', () => {
      const { getByText } = render(<SettingsSection context="org" {...defaultProps} />);

      expect(getByText('org')).toBeInTheDocument();
    });
  });
});
