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
    source1: {
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
    vector: 'AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H',
    active: ['AV_N', 'AC_H', 'PR_N', 'UI_N', 'S_U', 'C_H', 'I_H', 'A_H'],
  },
  {
    vector: 'AV:P/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:L',
    active: ['AV_P', 'AC_H', 'PR_N', 'UI_N', 'S_U', 'C_H', 'I_H', 'A_L'],
  },
  {
    vector: 'AV:A/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:L',
    active: ['AV_A', 'AC_H', 'PR_N', 'UI_N', 'S_C', 'C_H', 'I_H', 'A_L'],
  },
  {
    vector: 'AV:P/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:L',
    active: ['AV_P', 'AC_L', 'PR_H', 'UI_N', 'S_U', 'C_H', 'I_H', 'A_L'],
  },
  {
    vector: 'AV:P/AC:L/PR:H/UI:R/S:U/C:H/I:H/A:L',
    active: ['AV_P', 'AC_L', 'PR_H', 'UI_R', 'S_U', 'C_H', 'I_H', 'A_L'],
  },
  {
    vector: 'AV:P/AC:L/PR:H/UI:R/S:U/C:L/I:N/A:L',
    active: ['AV_P', 'AC_L', 'PR_H', 'UI_R', 'S_U', 'C_L', 'I_N', 'A_L'],
  },
];

describe('CVSSVector', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<CVSSVector {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByText } = render(<CVSSVector {...defaultProps} />);
      expect(getByText('CVSS v3 Vector')).toBeInTheDocument();
      expect(getByText('Score:')).toBeInTheDocument();
      expect(getByText('9.8')).toBeInTheDocument();
      expect(getByText('Exploitability Metrics')).toBeInTheDocument();
      expect(getByText(/Attack Vector/g)).toBeInTheDocument();
      expect(getByText('Physical')).toBeInTheDocument();
      expect(getByText('Local')).toBeInTheDocument();
      expect(getByText('Adjacent Network')).toBeInTheDocument();
      expect(getByText('Network')).toBeInTheDocument();
      expect(getByText(/Attack Complexity/g)).toBeInTheDocument();
      expect(getAllByText('High')).toHaveLength(5);
      expect(getAllByText('Low')).toHaveLength(5);
      expect(getByText('Changed')).toBeInTheDocument();
      expect(getByText('Unchanged')).toBeInTheDocument();
      expect(getByText('Required')).toBeInTheDocument();
      expect(getAllByText('None')).toHaveLength(5);
      expect(getByText('Impact Metrics')).toBeInTheDocument();
      expect(getByText(/Confidentiality/g)).toBeInTheDocument();
      expect(getByText(/Integrity/g)).toBeInTheDocument();
      expect(getByText(/Availability/g)).toBeInTheDocument();
    });

    it('renders CVSS v2 when v3 is not provided', () => {
      const { getByText, getAllByText } = render(
        <CVSSVector
          {...defaultProps}
          CVSS={{
            nvd: {
              V2Score: 7.5,
              V2Vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
            },
          }}
        />
      );
      expect(getByText('CVSS v2 Vector')).toBeInTheDocument();
      expect(getByText('Exploitability Metrics')).toBeInTheDocument();
      expect(getByText(/Access Vector/g)).toBeInTheDocument();
      expect(getByText('Local')).toBeInTheDocument();
      expect(getByText('Adjacent Network')).toBeInTheDocument();
      expect(getByText('Network')).toBeInTheDocument();
      expect(getByText(/Access Complexity/g)).toBeInTheDocument();
      expect(getByText('High')).toBeInTheDocument();
      expect(getByText('Medium')).toBeInTheDocument();
      expect(getByText('Low')).toBeInTheDocument();
      expect(getByText(/Authentication/g)).toBeInTheDocument();
      expect(getByText('Multiple')).toBeInTheDocument();
      expect(getByText('Single')).toBeInTheDocument();
      expect(getAllByText('None')).toHaveLength(4);
      expect(getByText('Impact Metrics')).toBeInTheDocument();
      expect(getByText(/Confidentiality/g)).toBeInTheDocument();
      expect(getAllByText('Partial')).toHaveLength(3);
      expect(getAllByText('Complete')).toHaveLength(3);
      expect(getByText(/Integrity/g)).toBeInTheDocument();
      expect(getByText(/Availability/g)).toBeInTheDocument();
    });

    it('renders correct value when source is provided', () => {
      const { getByText } = render(<CVSSVector {...defaultProps} source="source1" />);

      expect(getByText(/source1/g)).toBeInTheDocument();
      expect(getByText('8.1')).toBeInTheDocument();
    });

    for (let i = 0; i < activeMetrics.length; i++) {
      it('returns proper activemetrics', () => {
        const props = {
          severity: VulnerabilitySeverity.High,
          CVSS: {
            nvd: {
              V3Vector: activeMetrics[i].vector,
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
    it('when no vendor', () => {
      const props = {
        ...defaultProps,
        CVSS: {},
      };
      const { container } = render(<CVSSVector {...props} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
