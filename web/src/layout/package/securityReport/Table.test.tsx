import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { SecurityReportResult } from '../../../types';
import SecurityTable from './Table';

jest.mock('react-markdown', () => () => <div />);

const getMockSecurityReport = (fixtureId: string): SecurityReportResult[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Table/${fixtureId}.json`) as SecurityReportResult[];
};

const getMockFixableSecurityReport = (fixtureId: string): SecurityReportResult[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Table/${fixtureId}fix.json`) as SecurityReportResult[];
};

const mockSetVisibleImage = jest.fn();
const mockSetVisibleTarget = jest.fn();
const mockSetExpandedTarget = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  image: 'imgName',
  visibleTarget: null,
  visibleImage: null,
  expandedTarget: null,
  hasOnlyOneTarget: false,
  setVisibleImage: mockSetVisibleImage,
  setVisibleTarget: mockSetVisibleTarget,
  setExpandedTarget: mockSetExpandedTarget,
  lastReport: false,
  showOnlyFixableVulnerabilities: false,
};

describe('SecurityTable', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockReports = getMockSecurityReport('1');
    const mockFixableReports = getMockFixableSecurityReport('1');

    const { asFragment } = render(
      <Router>
        <SecurityTable {...defaultProps} reports={mockReports} fixableReports={mockFixableReports} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockReports = getMockSecurityReport('2');
      const mockFixableReports = getMockFixableSecurityReport('2');

      render(
        <Router>
          <SecurityTable {...defaultProps} reports={mockReports} fixableReports={mockFixableReports} />
        </Router>
      );

      const targets = screen.getAllByTestId('targetTitle');
      expect(targets).toHaveLength(2);
      expect(targets[0]).toHaveTextContent('Target:centos 7.7.1908');
      expect(targets[1]).toHaveTextContent('Target:usr/share/ceph/mgr/dashboard/frontend/package-lock.json');
    });

    it('renders empty report', () => {
      const mockReports = getMockSecurityReport('3');
      const mockFixableReports = getMockFixableSecurityReport('3');

      render(
        <Router>
          <SecurityTable {...defaultProps} reports={mockReports} fixableReports={mockFixableReports} />
        </Router>
      );

      expect(screen.queryByTestId('btnExpand')).toBeNull();
    });

    it('collapses report', async () => {
      const mockReports = getMockSecurityReport('4');
      const mockFixableReports = getMockFixableSecurityReport('4');

      render(
        <Router>
          <SecurityTable
            {...defaultProps}
            reports={mockReports}
            fixableReports={mockFixableReports}
            expandedTarget="imgName_usr/share/ceph/mgr/dashboard/frontend/package-lock.json"
          />
        </Router>
      );

      expect(screen.getByTestId('securityReportInfo')).toBeInTheDocument();
      const reportBtn = screen.getByRole('button', { name: 'Close target image vulnerabilities' });
      await userEvent.click(reportBtn);

      await waitFor(() => {
        expect(mockSetExpandedTarget).toHaveBeenCalledTimes(1);
        expect(mockSetExpandedTarget).toHaveBeenCalledWith(null);
      });
    });

    it('renders expanded target report', () => {
      const mockReports = getMockSecurityReport('5');
      const mockFixableReports = getMockFixableSecurityReport('5');

      render(
        <Router>
          <SecurityTable
            {...defaultProps}
            reports={mockReports}
            fixableReports={mockFixableReports}
            expandedTarget="imgName_rook/ceph:v1.1.1 (centos 7.7.1908)"
          />
        </Router>
      );

      const reportBtn = screen.getByRole('button', { name: 'Close target image vulnerabilities' });
      expect(reportBtn).toBeInTheDocument();
      expect(reportBtn).toHaveTextContent('Hide vulnerabilities');

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Fixed in')).toBeInTheDocument();
      expect(screen.getByText('Displaying only the first 100 entries')).toBeInTheDocument();

      expect(screen.getAllByTestId('vulnerabilityCell')).toHaveLength(100);
    });
  });
});
