import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import Version from './Version';

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

describe('Version', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <Version {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <Version {...defaultProps} />
        </Router>
      );

      expect(screen.getByRole('button', { name: /Open version/ })).toBeInTheDocument();
    });

    it('renders active version', () => {
      render(
        <Router>
          <Version {...defaultProps} isActive={true} />
        </Router>
      );

      expect(screen.getByText(defaultProps.version)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Open version/ })).toBeNull();
    });

    it('calls navigate to click version', async () => {
      render(
        <Router>
          <Version {...defaultProps} />
        </Router>
      );

      const versionLink = screen.getByRole('button', { name: /Open version/ });
      await userEvent.click(versionLink);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith(
          {
            pathname: '/packages/helm/repo/pr/1.0.1',
          },
          {
            state: null,
          }
        );
      });

      expect(await screen.findByRole('status')).toBeInTheDocument();
    });

    it('renders linked channel badge', () => {
      render(
        <Router>
          <Version {...defaultProps} linkedChannels={['stable']} />
        </Router>
      );

      expect(screen.getByText('stable')).toBeInTheDocument();
    });

    it('renders some linked channels badge', () => {
      render(
        <Router>
          <Version {...defaultProps} linkedChannels={['stable', 'candidate']} />
        </Router>
      );

      expect(screen.getByText('stable')).toBeInTheDocument();
      expect(screen.getByText('candidate')).toBeInTheDocument();
    });

    it('renders security updates badge', () => {
      render(
        <Router>
          <Version {...defaultProps} containsSecurityUpdates />
        </Router>
      );

      expect(screen.getByText('Contains security updates')).toBeInTheDocument();
    });

    it('renders pre-release badge', () => {
      render(
        <Router>
          <Version {...defaultProps} prerelease />
        </Router>
      );

      expect(screen.getByText('Pre-release')).toBeInTheDocument();
    });
  });
});
