import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { SecurityReport, VulnerabilitySeverity } from '../../../types';
import SecurityModal from './Modal';

jest.mock('../../../api');
jest.mock('react-markdown', () => () => <div />);
jest.mock('moment', () => ({
  ...(jest.requireActual('moment') as object),
  unix: () => ({
    isAfter: () => false,
    fromNow: () => '3 hours ago',
  }),
}));

const getMockSecurityReport = (fixtureId: string): SecurityReport => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Modal/${fixtureId}.json`) as SecurityReport;
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const defaultProps = {
  repoKind: 0,
  totalVulnerabilities: 109,
  summary: {
    [VulnerabilitySeverity.Critical]: 4,
    [VulnerabilitySeverity.High]: 8,
    [VulnerabilitySeverity.Medium]: 30,
    [VulnerabilitySeverity.Low]: 67,
    [VulnerabilitySeverity.UnKnown]: 0,
  },
  packageId: 'pkgID',
  version: '1.1.1',
  visibleSecurityReport: false,
  hasWhitelistedContainers: false,
};

describe('SecurityModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockReport = getMockSecurityReport('1');
    mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

    const { asFragment } = render(
      <Router>
        <SecurityModal {...defaultProps} visibleSecurityReport />
      </Router>
    );

    await waitFor(() => {
      expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockReport = getMockSecurityReport('2');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(
        <Router>
          <SecurityModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Open full report');
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(
          defaultProps.packageId,
          defaultProps.version,
          undefined
        );
      });
    });

    it('opens modal', async () => {
      const mockReport = getMockSecurityReport('3');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(
        <Router>
          <SecurityModal {...defaultProps} />
        </Router>
      );

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByText('Open full report');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Security report')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(await screen.findByText('Vulnerabilities details')).toBeInTheDocument();
    });

    it('renders last scan time', () => {
      render(
        <Router>
          <SecurityModal {...defaultProps} createdAt={1603804873} />
        </Router>
      );

      expect(screen.getByText('Last scan:')).toBeInTheDocument();
      expect(screen.getByText('3 hours ago')).toBeInTheDocument();
    });

    it('calls again to getSnapshotSecurityReport when version is different', async () => {
      const mockReport = getMockSecurityReport('4');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { rerender } = render(
        <Router>
          <SecurityModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Open full report');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(
          defaultProps.packageId,
          defaultProps.version,
          undefined
        );
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      rerender(
        <Router>
          <SecurityModal {...defaultProps} version="1.0.0" />
        </Router>
      );

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(2);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(defaultProps.packageId, '1.0.0', undefined);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('calls to getSnapshotSecurityReport when packageId is different', async () => {
      const mockReport = getMockSecurityReport('5');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { rerender } = render(
        <Router>
          <SecurityModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Open full report');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(
          defaultProps.packageId,
          defaultProps.version,
          undefined
        );
      });

      rerender(
        <Router>
          <SecurityModal {...defaultProps} packageId="pkgID2" />
        </Router>
      );

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(2);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith('pkgID2', defaultProps.version, undefined);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('activates target when report has only one image and one target', async () => {
      const mockReport = getMockSecurityReport('7');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(
        <Router>
          <SecurityModal {...defaultProps} />
        </Router>
      );

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByText('Open full report');
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);

      expect(await screen.findByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Fixed in')).toBeInTheDocument();
    });

    it('does not activate target when report has only one image and one target, but not vulnerabilities', async () => {
      const mockReport = getMockSecurityReport('8');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(
        <Router>
          <SecurityModal {...defaultProps} />
        </Router>
      );

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByText('Open full report');
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(
          screen.queryByText('No vulnerabilities have been detected in the default images used by this package.')
        ).toBeNull();
      });
    });

    it('opens modal', async () => {
      const mockReport = getMockSecurityReport('9');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(
        <Router>
          <SecurityModal {...defaultProps} visibleSecurityReport eventId="eventId" />
        </Router>
      );

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(
          defaultProps.packageId,
          defaultProps.version,
          'eventId'
        );
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
  });
});
