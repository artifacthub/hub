import { render, screen } from '@testing-library/react';

import DisabledRepositoryBadge from './DisabledRepositoryBadge';

describe('DisabledRepositoryBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<DisabledRepositoryBadge disabled />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders label', () => {
    render(<DisabledRepositoryBadge disabled />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<DisabledRepositoryBadge disabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
