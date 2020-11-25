import { render } from '@testing-library/react';
import React from 'react';

import DisabledRepositoryBadge from './DisabledRepositoryBadge';

describe('DisabledRepositoryBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<DisabledRepositoryBadge disabled />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', () => {
    const { getByText } = render(<DisabledRepositoryBadge disabled />);
    expect(getByText('Disabled')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<DisabledRepositoryBadge disabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
