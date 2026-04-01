import { render, screen } from '@testing-library/react';

import PaginationSummary from './PaginationSummary';

describe('PaginationSummary', () => {
  it('renders range label', () => {
    render(<PaginationSummary offset={0} itemsInPage={10} total={35} />);

    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('1 - 10 of 35 results');
  });

  it('renders single item label', () => {
    render(<PaginationSummary offset={4} itemsInPage={1} total={5} />);

    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('5 of 5 results');
  });

  it('does not render when there are no items', () => {
    const { container } = render(<PaginationSummary offset={0} itemsInPage={0} total={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
