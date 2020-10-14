import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { SecurityReport, VulnerabilitySeverity } from '../../../types';
import SecurityModal from './Modal';
jest.mock('../../../api');

const getMockSecurityReport = (fixtureId: string): SecurityReport => {
  return require(`./__fixtures__/Modal/${fixtureId}.json`) as SecurityReport;
};

const defaultProps = {
  summary: {
    [VulnerabilitySeverity.Critical]: 4,
    [VulnerabilitySeverity.High]: 8,
    [VulnerabilitySeverity.Medium]: 30,
    [VulnerabilitySeverity.Low]: 67,
    [VulnerabilitySeverity.UnKnown]: 0,
  },
  packageId: 'pkgID',
  version: '1.1.1',
};

describe('SecurityModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockReport = getMockSecurityReport('1');
    mocked(API).getSnapshotSecurityReport.mockResolvedValue(mockReport);

    const result = render(<SecurityModal {...defaultProps} />);

    waitFor(() => {
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
      expect(getByText('Vulnerabilities')).toBeInTheDocument();
    });
  });
});
