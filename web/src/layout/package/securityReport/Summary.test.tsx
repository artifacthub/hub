import { render } from '@testing-library/react';
import React from 'react';

import SecuritySummary from './Summary';

const defaultProps = {
  summary: {
    critical: 2,
    high: 10,
    low: 53,
    medium: 105,
    unknown: 0,
  },
};

describe('SecuritySummary', () => {
  it('creates snapshot', () => {
    const result = render(<SecuritySummary {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, queryByText } = render(<SecuritySummary {...defaultProps} />);
      expect(getByText('170')).toBeInTheDocument();
      expect(getByText(/vulnerabilities have been detected in the/g)).toBeInTheDocument();
      expect(getByText('2')).toBeInTheDocument();
      expect(getByText('10')).toBeInTheDocument();
      expect(getByText('53')).toBeInTheDocument();
      expect(getByText('105')).toBeInTheDocument();
      expect(queryByText('0')).toBeNull();
    });

    it('renders component with 0 vulnerabilities', () => {
      const { getByText } = render(
        <SecuritySummary
          summary={{
            critical: 0,
            high: 0,
            low: 0,
          }}
        />
      );
      expect(getByText(/No vulnerabilities have been detected in the/g)).toBeInTheDocument();
    });
  });
});
