import { render, screen } from '@testing-library/react';

import StarBadge from './StarBadge';

describe('StarBadge', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<StarBadge starsNumber={1} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<StarBadge starsNumber={3} />);
    expect(screen.getByTestId('starBadge')).toBeInTheDocument();
    expect(screen.getByText(3)).toBeInTheDocument();
  });

  it('renders xs size', () => {
    render(<StarBadge starsNumber={1} size="xs" />);
    const el = screen.getByTestId('starBadge');
    expect(el).toHaveClass('size-xs');
  });

  describe('does not render component', () => {
    it('when stars number is undefined', () => {
      const { container } = render(<StarBadge />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when stars is not a number', () => {
      const { container } = render(<StarBadge starsNumber="7" />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
