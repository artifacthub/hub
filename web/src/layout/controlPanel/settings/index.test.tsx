import { render, screen } from '@testing-library/react';

import SettingsSection from './index';

jest.mock('./userSettings', () => () => <div>user</div>);
jest.mock('./orgSettings', () => () => <div>org</div>);

const defaultProps = {
  activePage: '1',
  onAuthError: jest.fn(),
};

describe('SettingsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SettingsSection context="user" {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders user settings', () => {
      render(<SettingsSection context="user" {...defaultProps} />);
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    it('renders org settings', () => {
      render(<SettingsSection context="org" {...defaultProps} />);
      expect(screen.getByText('org')).toBeInTheDocument();
    });
  });
});
