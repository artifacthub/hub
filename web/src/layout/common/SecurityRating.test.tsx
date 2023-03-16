import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import SecurityRating from './SecurityRating';

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
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SecurityRating {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders label', async () => {
    render(
      <Router>
        <SecurityRating {...defaultProps} />
      </Router>
    );
    expect(screen.getByText('Images Security Rating')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    await userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('No vulnerabilities found')).toBeInTheDocument();
    expect(screen.getAllByText(/Vulnerabilities of severity/)).toHaveLength(5);
  });

  it('renders A label', () => {
    render(
      <Router>
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
      </Router>
    );
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders B label', () => {
    render(
      <Router>
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
      </Router>
    );
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders C label', () => {
    render(
      <Router>
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
      </Router>
    );
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders D label', () => {
    render(
      <Router>
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
      </Router>
    );
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders F label', () => {
    render(
      <Router>
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
      </Router>
    );
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('renders - label', () => {
    render(
      <Router>
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
      </Router>
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('does not full label when onlyBadge is true', () => {
    render(
      <Router>
        <SecurityRating {...defaultProps} onlyBadge />
      </Router>
    );
    expect(screen.queryByText('Images Security Rating')).toBeNull();
  });

  it('does not render label', () => {
    const { container } = render(
      <Router>
        <SecurityRating summary={null} onlyBadge />
      </Router>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
