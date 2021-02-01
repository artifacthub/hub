import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { SecurityTargetReport } from '../../../types';
import SecurityTable from './Table';

const getMockSecurityReport = (fixtureId: string): SecurityTargetReport[] => {
  return require(`./__fixtures__/Table/${fixtureId}.json`) as SecurityTargetReport[];
};

const mockSetExpandedTarget = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  image: 'imgName',
  expandedTarget: null,
  hasOnlyOneTarget: false,
  setExpandedTarget: mockSetExpandedTarget,
};

describe('SecurityTable', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockReports = getMockSecurityReport('1');

    const result = render(<SecurityTable {...defaultProps} reports={mockReports} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockReports = getMockSecurityReport('2');

      const { getAllByTestId } = render(<SecurityTable {...defaultProps} reports={mockReports} />);

      const targets = getAllByTestId('targetTitle');
      expect(targets).toHaveLength(2);
      expect(targets[0]).toHaveTextContent('Target:centos 7.7.1908');
      expect(targets[1]).toHaveTextContent('Target:usr/share/ceph/mgr/dashboard/frontend/package-lock.json');
    });

    it('renders empty report', () => {
      const mockReports = getMockSecurityReport('3');

      const { queryByTestId } = render(<SecurityTable {...defaultProps} reports={mockReports} />);

      expect(queryByTestId('btnExpand')).toBeNull();
    });

    it('collapses report', () => {
      const mockReports = getMockSecurityReport('4');

      const { getByTestId } = render(
        <SecurityTable
          {...defaultProps}
          reports={mockReports}
          expandedTarget="imgName_usr/share/ceph/mgr/dashboard/frontend/package-lock.json"
        />
      );

      expect(getByTestId('securityReportInfo')).toBeInTheDocument();
      const reportBtn = getByTestId('btnExpand');
      fireEvent.click(reportBtn);

      expect(mockSetExpandedTarget).toHaveBeenCalledTimes(1);
      expect(mockSetExpandedTarget).toHaveBeenCalledWith(null);
    });

    it('renders expanded target report', () => {
      const mockReports = getMockSecurityReport('5');

      const { getAllByTestId, getByTestId, getByText } = render(
        <SecurityTable
          {...defaultProps}
          reports={mockReports}
          expandedTarget="imgName_rook/ceph:v1.1.1 (centos 7.7.1908)"
        />
      );

      const reportBtn = getByTestId('btnExpand');
      expect(reportBtn).toBeInTheDocument();
      expect(reportBtn).toHaveTextContent('Target:centos 7.7.1908Rating:FHide vulnerabilities');

      expect(getByText('ID')).toBeInTheDocument();
      expect(getByText('Severity')).toBeInTheDocument();
      expect(getByText('Package')).toBeInTheDocument();
      expect(getByText('Version')).toBeInTheDocument();
      expect(getByText('Fixed in')).toBeInTheDocument();
      expect(getByText('Displaying only the first 100 entries')).toBeInTheDocument();

      expect(getAllByTestId('vulnerabilityCell')).toHaveLength(100);
    });
  });
});
