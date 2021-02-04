import { render } from '@testing-library/react';
import React from 'react';

import { SecurityReport } from '../../../types';
import SummaryTable from './SummaryTable';

const getMockSecurityReport = (fixtureId: string): SecurityReport => {
  return require(`./__fixtures__/SummaryTable/${fixtureId}.json`) as SecurityReport;
};

describe('SummaryTable', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SummaryTable report={getMockSecurityReport('1')} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<SummaryTable report={getMockSecurityReport('2')} />);
      expect(getByText('Image')).toBeInTheDocument();
      expect(getByText('Rating')).toBeInTheDocument();
      expect(getByText('critical')).toBeInTheDocument();
      expect(getByText('high')).toBeInTheDocument();
      expect(getByText('medium')).toBeInTheDocument();
      expect(getByText('low')).toBeInTheDocument();
      expect(getByText('unknown')).toBeInTheDocument();
      expect(getByText('Total')).toBeInTheDocument();
      expect(getByText('rook/ceph:v1.1.1')).toBeInTheDocument();
      expect(getByText('F')).toBeInTheDocument();
      expect(getByText('4')).toBeInTheDocument();
      expect(getByText('22')).toBeInTheDocument();
      expect(getByText('461')).toBeInTheDocument();
      expect(getByText('455')).toBeInTheDocument();
      expect(getByText('0')).toBeInTheDocument();
      expect(getByText('942')).toBeInTheDocument();
    });

    it('renders table with more than one image', () => {
      const { getByText, getAllByText } = render(<SummaryTable report={getMockSecurityReport('3')} />);
      expect(getByText('Image')).toBeInTheDocument();
      expect(getByText('Rating')).toBeInTheDocument();
      expect(getByText('critical')).toBeInTheDocument();
      expect(getByText('high')).toBeInTheDocument();
      expect(getByText('medium')).toBeInTheDocument();
      expect(getByText('low')).toBeInTheDocument();
      expect(getByText('unknown')).toBeInTheDocument();
      expect(getByText('Total')).toBeInTheDocument();
      expect(getByText('artifacthub/hub:v0.7.0')).toBeInTheDocument();
      expect(getByText('artifacthub/scanner:v0.7.0')).toBeInTheDocument();
      expect(getByText('artifacthub/tracker:v0.7.0')).toBeInTheDocument();
      expect(getByText('artifacthub/db-migrator:v0.7.0')).toBeInTheDocument();
      expect(getByText('F')).toBeInTheDocument();
      expect(getAllByText('A')).toHaveLength(3);
      expect(getAllByText('1')).toHaveLength(2);
      expect(getAllByText('0')).toHaveLength(20);
      expect(getByText('7')).toBeInTheDocument();
    });
  });
});
