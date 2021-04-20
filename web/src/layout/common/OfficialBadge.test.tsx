import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import OfficialBadge from './OfficialBadge';

describe('OfficialBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OfficialBadge official type="package" />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', async () => {
    render(<OfficialBadge official type="repo" />);
    expect(screen.getByText('Official')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(
      screen.getByText('The publisher owns the software deployed by the packages in this repository')
    ).toBeInTheDocument();
  });

  it('renders label for package', async () => {
    render(<OfficialBadge official type="package" />);
    expect(screen.getByText('Official')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(screen.getByText('The publisher owns the software deployed by this package')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<OfficialBadge official={false} type="package" />);
    expect(container).toBeEmptyDOMElement();
  });
});
