import { render, screen } from '@testing-library/react';

import SecuritySummary from './Summary';

const defaultProps = {
  totalVulnerabilities: 170,
  summary: {
    critical: 2,
    high: 10,
    low: 53,
    medium: 105,
    unknown: 0,
  },
};

describe('SecuritySummary', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SecuritySummary {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<SecuritySummary {...defaultProps} />);
      expect(screen.getByText('170')).toBeInTheDocument();
      expect(screen.getByText(/vulnerabilities have been detected in the/g)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('53')).toBeInTheDocument();
      expect(screen.getByText('105')).toBeInTheDocument();
      expect(screen.queryByText('0')).toBeNull();
    });

    it('renders component with 0 vulnerabilities', () => {
      render(
        <SecuritySummary
          totalVulnerabilities={0}
          summary={{
            critical: 0,
            high: 0,
            low: 0,
          }}
        />
      );
      expect(screen.getByText(/No vulnerabilities have been detected in the/g)).toBeInTheDocument();
    });
  });
});
