import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import VersionInRow from './VersionInRow';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const defaultProps = {
  isActive: false,
  version: '1.0.1',
  containsSecurityUpdates: false,
  prerelease: false,
  ts: 0,
  normalizedName: 'pr',
  repository: {
    kind: 0,
    name: 'repo',
    displayName: 'Repo',
    url: 'http://repo.test',
    userAlias: 'user',
  },
};

describe('VersionInRow', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <table>
          <tbody>
            <VersionInRow {...defaultProps} />
          </tbody>
        </table>
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <table>
            <tbody>
              <VersionInRow {...defaultProps} />
            </tbody>
          </table>
        </Router>
      );

      expect(screen.getByRole('button', { name: /Open version/ })).toBeInTheDocument();
    });

    it('renders active version', () => {
      render(
        <Router>
          <table>
            <tbody>
              <VersionInRow {...defaultProps} isActive={true} />
            </tbody>
          </table>
        </Router>
      );

      expect(screen.getByText(defaultProps.version)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Open version/ })).toBeNull();
    });

    it('calls navigate to click version', async () => {
      render(
        <Router>
          <table>
            <tbody>
              <VersionInRow {...defaultProps} />
            </tbody>
          </table>
        </Router>
      );

      const versionLink = screen.getByRole('button', { name: /Open version/ });
      await userEvent.click(versionLink);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith({ pathname: '/packages/helm/repo/pr/1.0.1' }, { state: null });
      });
    });

    it('renders linked channel badge', () => {
      render(
        <Router>
          <table>
            <tbody>
              <VersionInRow {...defaultProps} linkedChannels={['stable']} />
            </tbody>
          </table>
        </Router>
      );

      expect(screen.getByText('stable')).toBeInTheDocument();
    });

    it('renders some linked channels badge', () => {
      render(
        <Router>
          <table>
            <tbody>
              <VersionInRow {...defaultProps} linkedChannels={['stable', 'candidate']} />
            </tbody>
          </table>
        </Router>
      );

      expect(screen.getByText('stable')).toBeInTheDocument();
      expect(screen.getByText('candidate')).toBeInTheDocument();
    });

    it('renders security updates badge', () => {
      render(
        <Router>
          <table>
            <tbody>
              <VersionInRow {...defaultProps} containsSecurityUpdates />
            </tbody>
          </table>
        </Router>
      );

      expect(screen.getByText('Contains security updates')).toBeInTheDocument();
    });

    it('renders pre-release badge', () => {
      render(
        <Router>
          <table>
            <tbody>
              <VersionInRow {...defaultProps} prerelease />
            </tbody>
          </table>
        </Router>
      );

      expect(screen.getByText('Pre-release')).toBeInTheDocument();
    });
  });
});
