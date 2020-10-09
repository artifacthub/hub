import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { SecurityTargetReport } from '../../../types';
import SecurityTable from './Table';

const getMockSecurityReport = (fixtureId: string): SecurityTargetReport[] => {
  return require(`./__fixtures__/Table/${fixtureId}.json`) as SecurityTargetReport[];
};

const defaultProps = {
  image: 'imgName',
};

describe('SecurityTable', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockReports = getMockSecurityReport('1');

    const result = render(<SecurityTable {...defaultProps} reports={mockReports} />);

    waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockReports = getMockSecurityReport('2');

      const { getAllByTestId, getByTestId, getByText } = render(
        <SecurityTable {...defaultProps} reports={mockReports} />
      );

      const reportBtn = getByTestId('btnExpand');
      expect(reportBtn).toBeInTheDocument();
      expect(reportBtn).toHaveTextContent('Image:imgName');

      const targets = getAllByTestId('targetTitle');
      expect(targets).toHaveLength(2);
      expect(targets[0]).toHaveTextContent('Target:centos 7.7.1908');
      expect(targets[1]).toHaveTextContent('Target:usr/share/ceph/mgr/dashboard/frontend/package-lock.json');

      expect(getByText('ID')).toBeInTheDocument();
      expect(getByText('Severity')).toBeInTheDocument();
      expect(getByText('Package')).toBeInTheDocument();
      expect(getByText('Version')).toBeInTheDocument();
      expect(getByText('Fixed in')).toBeInTheDocument();
      expect(getByText('Displaying only the first 100 entries')).toBeInTheDocument();

      expect(getAllByTestId('vulnerabilityCell')).toHaveLength(100);
    });

    it('renders empty report', () => {
      const mockReports = getMockSecurityReport('3');

      const { getByText } = render(<SecurityTable {...defaultProps} reports={mockReports} />);

      expect(getByText('No vulnerabilities found')).toBeInTheDocument();
    });

    it('collapses report', () => {
      const mockReports = getMockSecurityReport('4');

      const { queryByTestId, getByTestId } = render(<SecurityTable {...defaultProps} reports={mockReports} />);

      expect(getByTestId('securityReportInfo')).toBeInTheDocument();
      const reportBtn = getByTestId('btnExpand');
      fireEvent.click(reportBtn);

      expect(queryByTestId('securityReportInfo')).toBeNull();
    });
  });
});
