import { render, waitFor } from '@testing-library/react';
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
    availableVersions: [{ version: '1.0.0', ts: 0, prerelease: true, containsSecurityUpdates: false }],
    normalizedName: 'pr',
    deprecated: false,
    isOperator: false,
    signed: false,
    createdAt: 0,
    prerelease: true,
    containsSecurityUpdates: false,
    keywords: ['key1', 'key2'],
    repository: {
      repositoryid: 'id',
      kind: 0,
      name: 'incubator',
      organizationName: 'helm',
      organizationDisplayName: 'Helm',
      url: 'https://repo.url',
    },
    ts: 0,
  },
  sortedVersions: [],
  visibleInstallationModal: true,
};

describe('HelmInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

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

    it('closes modal when a new pkg is open', () => {
      const { getByRole, queryByRole, rerender } = render(<Modal {...defaultProps} />);

      expect(getByRole('dialog')).toBeInTheDocument();

      rerender(
        <Modal
          {...defaultProps}
          package={{ ...defaultProps.package, packageId: 'id2' }}
          visibleInstallationModal={false}
        />
      );

      waitFor(() => {
        expect(queryByRole('dialog')).toBeNull();
      });
    });
  });
});
