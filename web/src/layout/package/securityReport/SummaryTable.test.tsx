import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import { FixableVulnerabilitiesInReport, SecurityReport } from '../../../types';
import SummaryTable from './SummaryTable';

const getMockSecurityReport = (fixtureId: string): SecurityReport => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/SummaryTable/${fixtureId}.json`) as SecurityReport;
};

const getMockFixableSecurityReport = (fixtureId: string): FixableVulnerabilitiesInReport => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/SummaryTable/${fixtureId}fix.json`) as FixableVulnerabilitiesInReport;
};

describe('SummaryTable', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SummaryTable
          report={getMockSecurityReport('1')}
          fixableVulnerabilities={getMockFixableSecurityReport('1')}
          hasWhitelistedContainers={false}
          allVulnerabilitiesAreFixable={false}
        />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <SummaryTable
            report={getMockSecurityReport('2')}
            fixableVulnerabilities={getMockFixableSecurityReport('2')}
            hasWhitelistedContainers={false}
            allVulnerabilitiesAreFixable={false}
          />
        </Router>
      );
      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByText('Fixable')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
      expect(screen.getByText('unknown')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('rook/ceph:v1.1.1')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument();
      expect(screen.getByText('461')).toBeInTheDocument();
      expect(screen.getByText('455')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(7);
      expect(screen.getByText('942')).toBeInTheDocument();
    });

    it('renders table with more than one image', () => {
      render(
        <Router>
          <SummaryTable
            report={getMockSecurityReport('3')}
            fixableVulnerabilities={getMockFixableSecurityReport('3')}
            hasWhitelistedContainers={false}
            allVulnerabilitiesAreFixable={false}
          />
        </Router>
      );
      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
      expect(screen.getByText('unknown')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('artifacthub/hub:v0.7.0')).toBeInTheDocument();
      expect(screen.getByText('artifacthub/scanner:v0.7.0')).toBeInTheDocument();
      expect(screen.getByText('artifacthub/tracker:v0.7.0')).toBeInTheDocument();
      expect(screen.getByText('artifacthub/db-migrator:v0.7.0')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
      expect(screen.getAllByText('A')).toHaveLength(3);
      expect(screen.getAllByText('1')).toHaveLength(4);
      expect(screen.getAllByText('0')).toHaveLength(40);
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });
});
