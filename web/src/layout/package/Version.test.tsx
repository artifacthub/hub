import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import Version from './Version';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const packageItem: Package = {
  packageId: 'id',
  name: 'test',
  displayName: 'Pretty name',
  description: 'desc',
  logoImageId: 'imageId',
  appVersion: '1.0.0',
  normalizedName: 'pr',
  deprecated: false,
  isOperator: false,
  keywords: ['key1', 'key2'],
  repository: {
    kind: 0,
    name: 'repo',
    displayName: 'Repo',
    url: 'http://repo.test',
    userAlias: 'user',
  },
  createdAt: 1,
  signed: false,
  availableVersions: [
    {
      version: '1.0.0',
      containsSecurityUpdates: false,
      prerelease: false,
      createdAt: 1,
    },
    { version: '1.0.1', containsSecurityUpdates: false, prerelease: false, createdAt: 1 },
  ],
};

const defaultProps = {
  isActive: false,
  version: '1.0.1',
  containsSecurityUpdates: false,
  prerelease: false,
  createdAt: 0,
  packageItem: packageItem,
};

describe('Version', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <Version {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(
        <Router>
          <Version {...defaultProps} />
        </Router>
      );

      expect(getByTestId('version')).toBeInTheDocument();
    });

    it('renders active version', () => {
      const { getByText, queryByTestId } = render(
        <Router>
          <Version {...defaultProps} isActive={true} />
        </Router>
      );

      expect(getByText(defaultProps.version)).toBeInTheDocument();
      expect(queryByTestId('version')).toBeNull();
    });

    it('calls history push to click version', () => {
      const { getByTestId, getByRole } = render(
        <Router>
          <Version {...defaultProps} />
        </Router>
      );

      const versionLink = getByTestId('version');
      fireEvent.click(versionLink);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: buildPackageURL(packageItem, true),
        state: { searchUrlReferer: undefined, fromStarred: undefined },
      });

      waitFor(() => expect(getByRole('status')).toBeInTheDocument());
    });

    it('renders security updates badge', () => {
      const { getByText } = render(
        <Router>
          <Version {...defaultProps} containsSecurityUpdates />
        </Router>
      );

      expect(getByText('Contains security updates')).toBeInTheDocument();
    });

    it('renders pre-release badge', () => {
      const { getByText } = render(
        <Router>
          <Version {...defaultProps} prerelease />
        </Router>
      );

      expect(getByText('Pre-release')).toBeInTheDocument();
    });
  });
});
