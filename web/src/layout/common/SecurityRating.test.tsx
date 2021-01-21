import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import SecurityRating from './SecutityRating';

const defaultProps = {
  summary: {
    low: 0,
    high: 7,
    medium: 1,
    unknown: 0,
    critical: 1,
  },
  onlyBadge: false,
};

describe('SecurityRating', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SecurityRating {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', async () => {
    const { getByTestId, getByText, getByRole, getAllByText } = render(<SecurityRating {...defaultProps} />);
    expect(getByText('Images Security Rating')).toBeInTheDocument();
    expect(getByText('F')).toBeInTheDocument();

    const badge = getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    fireEvent.mouseEnter(badge);

    await waitFor(() => {
      expect(getByRole('tooltip')).toBeInTheDocument();
      expect(getByText('No vulnerabilities found')).toBeInTheDocument();
      expect(getAllByText(/Vulnerabilities of severity/g)).toHaveLength(5);
    });
  });

  it('renders A label', () => {
    const { getByText } = render(
      <SecurityRating
        summary={{
          low: 0,
          high: 0,
          medium: 0,
          unknown: 0,
          critical: 0,
        }}
        onlyBadge
      />
    );
    expect(getByText('A')).toBeInTheDocument();
  });

  it('renders B label', () => {
    const { getByText } = render(
      <SecurityRating
        summary={{
          low: 8,
          high: 0,
          medium: 0,
          unknown: 0,
          critical: 0,
        }}
        onlyBadge
      />
    );
    expect(getByText('B')).toBeInTheDocument();
  });

  it('renders C label', () => {
    const { getByText } = render(
      <SecurityRating
        summary={{
          low: 8,
          high: 0,
          medium: 3,
          unknown: 0,
          critical: 0,
        }}
        onlyBadge
      />
    );
    expect(getByText('C')).toBeInTheDocument();
  });

  it('renders D label', () => {
    const { getByText } = render(
      <SecurityRating
        summary={{
          low: 8,
          high: 9,
          medium: 3,
          unknown: 0,
          critical: 0,
        }}
        onlyBadge
      />
    );
    expect(getByText('D')).toBeInTheDocument();
  });

  it('renders F label', () => {
    const { getByText } = render(
      <SecurityRating
        summary={{
          low: 8,
          high: 9,
          medium: 3,
          unknown: 0,
          critical: 1,
        }}
        onlyBadge
      />
    );
    expect(getByText('F')).toBeInTheDocument();
  });

  it('renders - label', () => {
    const { getByText } = render(
      <SecurityRating
        summary={{
          low: 0,
          high: 0,
          medium: 0,
          unknown: 3,
          critical: 0,
        }}
        onlyBadge
      />
    );
    expect(getByText('-')).toBeInTheDocument();
  });

  it('does not full label when onlyBadge is true', () => {
    const { queryByText } = render(<SecurityRating {...defaultProps} onlyBadge />);
    expect(queryByText('Images Security Rating')).toBeNull();
  });

  it('does not render label', () => {
    const { container } = render(<SecurityRating summary={null} onlyBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});
