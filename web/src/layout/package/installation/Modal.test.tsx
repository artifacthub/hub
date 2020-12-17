import { render } from '@testing-library/react';
import React from 'react';

import Modal from './Modal';

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const defaultProps = {
  package: {
    packageId: 'id',
    name: 'test',
    displayName: 'Pretty name',
    description: 'desc',
    logoImageId: 'imageId',
    appVersion: '1.0.0',
    version: '1.0.0',
    availableVersions: [{ version: '1.0.0', createdAt: 0, prerelease: true, containsSecurityUpdates: false }],
    normalizedName: 'pr',
    deprecated: false,
    isOperator: false,
    signed: false,
    createdAt: 0,
    keywords: ['key1', 'key2'],
    repository: {
      repositoryid: 'id',
      kind: 0,
      name: 'incubator',
      organizationName: 'helm',
      organizationDisplayName: 'Helm',
      url: 'https://repo.url',
    },
  },
  sortedVersions: [],
  visibleInstallationModal: true,
};

describe('HelmInstall', () => {
  it('creates snapshot', () => {
    const result = render(<Modal {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders pre-release message', () => {
      const { getByTestId } = render(<Modal {...defaultProps} />);

      const alert = getByTestId('prerelease-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('This package version is a pre-release and it is not ready for production use.');
    });
  });
});
