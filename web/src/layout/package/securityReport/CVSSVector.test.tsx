import { render, screen } from '@testing-library/react';

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
    const { asFragment } = render(<CVSSVector {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<CVSSVector {...defaultProps} />);
      expect(screen.getByText('CVSS v3 Vector')).toBeInTheDocument();
      expect(screen.getByText('Score:')).toBeInTheDocument();
      expect(screen.getByText('9.8')).toBeInTheDocument();
      expect(screen.getByText('Exploitability Metrics')).toBeInTheDocument();
      expect(screen.getByText(/Attack Vector/)).toBeInTheDocument();
      expect(screen.getByText('Physical')).toBeInTheDocument();
      expect(screen.getByText('Local')).toBeInTheDocument();
      expect(screen.getByText('Adjacent Network')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText(/Attack Complexity/)).toBeInTheDocument();
      expect(screen.getAllByText('High')).toHaveLength(5);
      expect(screen.getAllByText('Low')).toHaveLength(5);
      expect(screen.getByText('Changed')).toBeInTheDocument();
      expect(screen.getByText('Unchanged')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getAllByText('None')).toHaveLength(5);
      expect(screen.getByText('Impact Metrics')).toBeInTheDocument();
      expect(screen.getByText(/Confidentiality/)).toBeInTheDocument();
      expect(screen.getByText(/Integrity/)).toBeInTheDocument();
      expect(screen.getByText(/Availability/)).toBeInTheDocument();
    });

    it('renders CVSS v2 when v3 is not provided', () => {
      render(
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
      expect(screen.getByText('CVSS v2 Vector')).toBeInTheDocument();
      expect(screen.getByText('Exploitability Metrics')).toBeInTheDocument();
      expect(screen.getByText(/Access Vector/)).toBeInTheDocument();
      expect(screen.getByText('Local')).toBeInTheDocument();
      expect(screen.getByText('Adjacent Network')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText(/Access Complexity/)).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText(/Authentication/)).toBeInTheDocument();
      expect(screen.getByText('Multiple')).toBeInTheDocument();
      expect(screen.getByText('Single')).toBeInTheDocument();
      expect(screen.getAllByText('None')).toHaveLength(4);
      expect(screen.getByText('Impact Metrics')).toBeInTheDocument();
      expect(screen.getByText(/Confidentiality/)).toBeInTheDocument();
      expect(screen.getAllByText('Partial')).toHaveLength(3);
      expect(screen.getAllByText('Complete')).toHaveLength(3);
      expect(screen.getByText(/Integrity/)).toBeInTheDocument();
      expect(screen.getByText(/Availability/)).toBeInTheDocument();
    });

    it('renders correct value when source is provided', () => {
      render(<CVSSVector {...defaultProps} source="source1" />);

      expect(screen.getByText(/source1/)).toBeInTheDocument();
      expect(screen.getByText('8.1')).toBeInTheDocument();
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

        render(<CVSSVector {...props} />);
        for (let j = 0; j < activeMetrics[i].active.length; j++) {
          const metric = screen.getByTestId(`metric_${activeMetrics[i].active[j]}`);
          expect(metric).toBeInTheDocument();
          expect(metric).toHaveClass('opacity-100');
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
