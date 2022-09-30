import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../../types';
import SecuritySummary from './Summary';

const defaultProps = {
  repoKind: RepositoryKind.Helm,
  totalVulnerabilities: 170,
  summary: {
    critical: 2,
    high: 10,
    low: 53,
    medium: 105,
    unknown: 0,
  },
  totalFixableVulnerabilities: 80,
  fixableSummary: {
    critical: 0,
    high: 7,
    low: 32,
    medium: 41,
    unknown: 0,
  },
  allVulnerabilitiesAreFixable: false,
};

describe('SecuritySummary', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SecuritySummary {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SecuritySummary {...defaultProps} />);
      expect(screen.getByText('170')).toBeInTheDocument();
      expect(screen.getByText(/have been detected in this package's/)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('53')).toBeInTheDocument();
      expect(screen.getByText('105')).toBeInTheDocument();
      expect(screen.queryByText('0')).toBeNull();
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('32')).toBeInTheDocument();
      expect(screen.getByText('41')).toBeInTheDocument();
    });

    it('renders component with 0 vulnerabilities', () => {
      render(
        <SecuritySummary
          repoKind={RepositoryKind.Helm}
          totalVulnerabilities={0}
          summary={{
            critical: 0,
            high: 0,
            low: 0,
          }}
          totalFixableVulnerabilities={0}
          fixableSummary={{
            critical: 0,
            high: 0,
            low: 0,
          }}
          allVulnerabilitiesAreFixable={false}
        />
      );
      expect(screen.getByText(/No vulnerabilities have been detected in this package's/)).toBeInTheDocument();
      expect(screen.getByText('images')).toBeInTheDocument();
    });

    it('renders component with 0 vulnerabilities for Container type', () => {
      render(
        <SecuritySummary
          repoKind={RepositoryKind.Container}
          totalVulnerabilities={0}
          summary={{
            critical: 0,
            high: 0,
            low: 0,
          }}
          totalFixableVulnerabilities={0}
          fixableSummary={{
            critical: 0,
            high: 0,
            low: 0,
          }}
          allVulnerabilitiesAreFixable={false}
        />
      );
      expect(screen.getByText(/No vulnerabilities have been detected in this package's/)).toBeInTheDocument();
      expect(screen.getByText('image')).toBeInTheDocument();
    });
  });
});
