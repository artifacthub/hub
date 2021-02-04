import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { SecurityReport, VulnerabilitySeverity } from '../../../types';
import SecurityModal from './Modal';
jest.mock('../../../api');

jest.mock('moment', () => () => ({ fromNow: () => '3 hours ago' }));

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
};

describe('SecurityModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockReport = getMockSecurityReport('1');
    mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

    const result = render(<SecurityModal {...defaultProps} visibleSecurityReport />);

    await waitFor(() => {
      expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockReport = getMockSecurityReport('2');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { getByText } = render(<SecurityModal {...defaultProps} />);

      const btn = getByText('Open full report');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });
    });

    it('opens modal', async () => {
      const mockReport = getMockSecurityReport('3');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { queryByRole, getByRole, getByText } = render(<SecurityModal {...defaultProps} />);

      expect(queryByRole('dialog')).toBeNull();

      const btn = getByText('Open full report');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
      });

      expect(getByRole('dialog')).toBeInTheDocument();
      expect(getByText('Security report')).toBeInTheDocument();
      expect(getByText('Summary')).toBeInTheDocument();
      expect(getByText('Vulnerabilities details')).toBeInTheDocument();
    });

    it('renders last scan time', () => {
      const { getByText } = render(<SecurityModal {...defaultProps} createdAt={1603804873} />);

      expect(getByText('Last scan:')).toBeInTheDocument();
      expect(getByText('3 hours ago')).toBeInTheDocument();
    });

    it('calls again to getSnapshotSecurityReport when version is different', async () => {
      const mockReport = getMockSecurityReport('4');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { rerender, getByText, getByRole } = render(<SecurityModal {...defaultProps} />);

      const btn = getByText('Open full report');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      expect(getByRole('dialog')).toBeInTheDocument();

      rerender(<SecurityModal {...defaultProps} version="1.0.0" />);

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(2);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(defaultProps.packageId, '1.0.0');
      });

      expect(getByRole('dialog')).toBeInTheDocument();
    });

    it('calls again to getSnapshotSecurityReport when packageId is different', async () => {
      const mockReport = getMockSecurityReport('5');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { rerender, getByText, getByRole } = render(<SecurityModal {...defaultProps} />);

      const btn = getByText('Open full report');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      rerender(<SecurityModal {...defaultProps} packageId="pkgID2" />);

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(2);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith('pkgID2', defaultProps.version);
      });

      expect(getByRole('dialog')).toBeInTheDocument();
    });

    it('does not call again to getSnapshotSecurityReport to open modal when packageId and version are the same', async () => {
      const mockReport = getMockSecurityReport('6');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { queryByRole, getByText, getByTestId, getByRole } = render(
        <SecurityModal {...defaultProps} visibleSecurityReport />
      );

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledWith(defaultProps.packageId, defaultProps.version);
      });

      const btn = getByTestId('closeModalFooterBtn');
      fireEvent.click(btn);

      expect(queryByRole('dialog')).toBeNull();

      const openBtn = getByText('Open full report');
      fireEvent.click(openBtn);

      await waitFor(() => {
        expect(getByRole('dialog')).toBeInTheDocument();
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
      });
    });

    it('activates target when report has only one image and one target', async () => {
      const mockReport = getMockSecurityReport('7');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { queryByRole, getByRole, getByText } = render(<SecurityModal {...defaultProps} />);

      expect(queryByRole('dialog')).toBeNull();

      const btn = getByText('Open full report');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(getByRole('dialog')).toBeInTheDocument();
      });

      waitFor(() => {
        expect(getByText('ID')).toBeInTheDocument();
        expect(getByText('Severity')).toBeInTheDocument();
        expect(getByText('Package')).toBeInTheDocument();
        expect(getByText('Version')).toBeInTheDocument();
        expect(getByText('Fixed in')).toBeInTheDocument();
      });
    });

    it('does not activate target when report has only one image and one target, but not vulnerabilities', async () => {
      const mockReport = getMockSecurityReport('8');
      mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

      const { queryByRole, getByRole, getByText, queryByText } = render(<SecurityModal {...defaultProps} />);

      expect(queryByRole('dialog')).toBeNull();

      const btn = getByText('Open full report');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getSnapshotSecurityReport).toHaveBeenCalledTimes(1);
        expect(getByRole('dialog')).toBeInTheDocument();
      });

      waitFor(() => {
        expect(queryByText('ID')).toBeNull();
        expect(queryByText('Severity')).toBeNull();
        expect(queryByText('Package')).toBeNull();
        expect(queryByText('Version')).toBeNull();
        expect(queryByText('Fixed in')).toBeNull();
      });
    });
  });
});
