import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'ts-jest/utils';

import API from '../../../api';
import { SecurityReport, VulnerabilitySeverity } from '../../../types';
import SecurityModal from './Modal';
jest.mock('../../../api');

jest.mock('moment', () => ({
  ...(jest.requireActual('moment') as {}),
  unix: () => ({
    isAfter: () => false,
    fromNow: () => '3 hours ago',
  }),
}));

const getMockSecurityReport = (fixtureId: string): SecurityReport => {
  return require(`./__fixtures__/Modal/${fixtureId}.json`) as SecurityReport;
};

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const defaultProps = {
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

    const { asFragment } = render(<SecurityModal {...defaultProps} visibleSecurityReport />);

    await waitFor(() => {
      expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockReport = getMockSecurityReport('2');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(<SecurityModal {...defaultProps} />);

      const btn = screen.getByText('Open full report');
      expect(btn).toBeInTheDocument();
      userEvent.click(btn);

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

      render(<SecurityModal {...defaultProps} />);

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByText('Open full report');
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Security report')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Vulnerabilities details')).toBeInTheDocument();
    });

    it('renders last scan time', () => {
      render(<SecurityModal {...defaultProps} createdAt={1603804873} />);

      expect(screen.getByText('Last scan:')).toBeInTheDocument();
      expect(screen.getByText('3 hours ago')).toBeInTheDocument();
    });

    it('calls again to getSnapshotSecurityReport when version is different', async () => {
      const mockReport = getMockSecurityReport('4');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { rerender } = render(<SecurityModal {...defaultProps} />);

      const btn = screen.getByText('Open full report');
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(
          defaultProps.packageId,
          defaultProps.version,
          undefined
        );
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<SecurityModal {...defaultProps} version="1.0.0" />);

      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(2);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(defaultProps.packageId, '1.0.0', undefined);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls to getSnapshotSecurityReport when packageId is different', async () => {
      const mockReport = getMockSecurityReport('5');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { rerender } = render(<SecurityModal {...defaultProps} />);

      const btn = screen.getByText('Open full report');
      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(
          defaultProps.packageId,
          defaultProps.version,
          undefined
        );
      });

      rerender(<SecurityModal {...defaultProps} packageId="pkgID2" />);

      userEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(2);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith('pkgID2', defaultProps.version, undefined);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('activates target when report has only one image and one target', async () => {
      const mockReport = getMockSecurityReport('7');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(<SecurityModal {...defaultProps} />);

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByText('Open full report');
      userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('Package')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Fixed in')).toBeInTheDocument();
    });

    it('does not activate target when report has only one image and one target, but not vulnerabilities', async () => {
      const mockReport = getMockSecurityReport('8');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(<SecurityModal {...defaultProps} />);

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByText('Open full report');
      userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);

      expect(
        screen.queryByText('No vulnerabilities have been detected in the default images used by this package.')
      ).toBeNull();
    });

    it('opens modal', async () => {
      const mockReport = getMockSecurityReport('9');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      render(<SecurityModal {...defaultProps} visibleSecurityReport eventId="eventId" />);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(
          defaultProps.packageId,
          defaultProps.version,
          'eventId'
        );
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
