import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import { RepositoryKind } from '../../../types';
import modalStyles from '../../common/Modal.module.css';
import Modal from './Modal';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children?: ReactNode }) => {
    return <>{children}</>;
  },
}));
vi.mock('remark-gfm', () => ({
  default: () => <div />,
}));

const mockUseNavigate = jest.fn();

vi.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
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
    const { asFragment } = render(
      <Router>
        <Modal {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders pre-release message', () => {
      render(
        <Router>
          <Modal {...defaultProps} />
        </Router>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('This package version is a pre-release and it is not ready for production use.');
    });

    it('calls replace when install instructions are empty', () => {
      render(
        <Router>
          <Modal
            {...defaultProps}
            package={{
              ...defaultProps.package,
              repository: { ...defaultProps.package.repository, kind: RepositoryKind.KedaScaler },
            }}
          />
        </Router>
      );

      expect(screen.getByRole('button', { name: 'Open installation modal' })).toBeInTheDocument();

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('', { replace: true, state: null });
    });

    it('closes modal when a new pkg is open', async () => {
      const { rerender } = render(
        <Router>
          <Modal {...defaultProps} />
        </Router>
      );

      const modal = await screen.findByRole('dialog');
      expect(modal).toHaveClass(modalStyles.active);
      expect(modal).toHaveClass('d-block');

      rerender(
        <Router>
          <Modal package={{ ...defaultProps.package, packageId: 'id2' }} visibleInstallationModal />
        </Router>
      );

      const rerenderedModal = await screen.findByRole('dialog');
      expect(rerenderedModal).not.toHaveClass(modalStyles.active);
      expect(rerenderedModal).not.toHaveClass('d-block');
    });
  });
});
