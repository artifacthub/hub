import { render } from '@testing-library/react';
import React from 'react';

import { VulnerabilitySeverity } from '../../../types';
import CVSSVector from './CVSSVector';

const defaultProps = {
  severity: VulnerabilitySeverity.High,
  CVSS: {
    nvd: {
      V2Score: 7.5,
      V3Score: 9.8,
      V2Vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
      V3Vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    },
    redhat: {
      V3Score: 8.1,
      V3Vector: 'CVSS:3.0/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H',
    },
  },
};

interface Tests {
  vector: string;
  active: string[];
}

const activeMetrics: Tests[] = [
  {
    vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
    active: ['AV_N', 'AC_L', 'Au_N', 'C_P', 'I_P', 'A_P'],
  },
  {
    vector: 'AV:N/AC:M/Au:N/C:P/I:P/A:P',
    active: ['AV_N', 'AC_M', 'Au_N', 'C_P', 'I_P', 'A_P'],
  },
  {
    vector: 'AV:L/AC:H/Au:N/C:P/I:P/A:P',
    active: ['AV_L', 'AC_H', 'Au_N', 'C_P', 'I_P', 'A_P'],
  },
  {
    vector: 'AV:N/AC:M/Au:S/C:P/I:P/A:P',
    active: ['AV_N', 'AC_M', 'Au_S', 'C_P', 'I_P', 'A_P'],
  },
  {
    vector: 'AV:N/AC:M/Au:N/C:C/I:C/A:P',
    active: ['AV_N', 'AC_M', 'Au_N', 'C_C', 'I_C', 'A_P'],
  },
  {
    vector: 'AV:N/AC:M/Au:N/C:P/I:P/A:C',
    active: ['AV_N', 'AC_M', 'Au_N', 'C_P', 'I_P', 'A_C'],
  },
];

describe('CVSSVector', () => {
  it('creates snapshot', () => {
    const result = render(<CVSSVector {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByText } = render(<CVSSVector {...defaultProps} />);
      expect(getByText('CVSS v2 Vector')).toBeInTheDocument();
      expect(getByText('Exploitability Metrics')).toBeInTheDocument();
      expect(getByText('Access Vector')).toBeInTheDocument();
      expect(getByText('Local')).toBeInTheDocument();
      expect(getByText('Adjacent Network')).toBeInTheDocument();
      expect(getByText('Network')).toBeInTheDocument();
      expect(getByText('Access Complexity')).toBeInTheDocument();
      expect(getByText('High')).toBeInTheDocument();
      expect(getByText('Medium')).toBeInTheDocument();
      expect(getByText('Low')).toBeInTheDocument();
      expect(getByText('Authentication')).toBeInTheDocument();
      expect(getByText('Multiple')).toBeInTheDocument();
      expect(getByText('Single')).toBeInTheDocument();
      expect(getAllByText('None')).toHaveLength(4);
      expect(getByText('Impact Metrics')).toBeInTheDocument();
      expect(getByText('Confidentiality')).toBeInTheDocument();
      expect(getAllByText('Partial')).toHaveLength(3);
      expect(getAllByText('Complete')).toHaveLength(3);
      expect(getByText('Integrity')).toBeInTheDocument();
      expect(getByText('Availability')).toBeInTheDocument();
    });

    for (let i = 0; i < activeMetrics.length; i++) {
      it('returns proper activemetrics', () => {
        const props = {
          severity: VulnerabilitySeverity.High,
          CVSS: {
            nvd: {
              V2Vector: activeMetrics[i].vector,
            },
          },
        };

        const { getByTestId } = render(<CVSSVector {...props} />);
        for (let j = 0; j < activeMetrics[i].active.length; j++) {
          const metric = getByTestId(`metric_${activeMetrics[i].active[j]}`);
          expect(metric).toBeInTheDocument();
          expect(metric).toHaveClass('active');
        }
      });
    }
  });

  describe('Does not render component', () => {
    it('when severity is lower than high', () => {
      const props = {
        ...defaultProps,
        severity: VulnerabilitySeverity.Low,
      };
      const { container } = render(<CVSSVector {...props} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when nva is not defined', () => {
      const props = {
        CVSS: {
          redhat: {
            V3Score: 8.1,
            V3Vector: 'CVSS:3.0/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H',
          },
        },
        severity: VulnerabilitySeverity.Low,
      };
      const { container } = render(<CVSSVector {...props} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when nva has not V2Vector', () => {
      const props = {
        CVSS: {
          nva: {
            V3Score: 8.1,
            V3Vector: 'CVSS:3.0/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H',
          },
        },
        severity: VulnerabilitySeverity.Low,
      };
      const { container } = render(<CVSSVector {...props} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
