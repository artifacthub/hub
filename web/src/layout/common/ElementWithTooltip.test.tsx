import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import ElementWithTooltip from './ElementWithTooltip';

const defaultProps = {
  tooltipMessage: 'Tooltip message',
  element: <div>label</div>,
  active: true,
  visibleTooltip: true,
};

describe('ElementWithTooltip', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ElementWithTooltip {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders properly', () => {
    const { getByTestId, getByText } = render(<ElementWithTooltip {...defaultProps} />);
    expect(getByTestId('elementWithTooltip')).toBeInTheDocument();
    expect(getByText('label')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<ElementWithTooltip {...defaultProps} active={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays tooltip', async () => {
    jest.useFakeTimers();

    render(<ElementWithTooltip {...defaultProps} />);

    const badge = screen.getByTestId('elementWithTooltip');
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.tooltipMessage)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('hides tooltip on mouse leave', async () => {
    jest.useFakeTimers();

    render(<ElementWithTooltip {...defaultProps} />);

    const badge = screen.getByTestId('elementWithTooltip');
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.tooltipMessage)).toBeInTheDocument();

    userEvent.unhover(badge);

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(screen.queryByRole('tooltip')).toBeNull();

    jest.useRealTimers();
  });

  it('does not display tooltip when visibleTooltip is false', () => {
    const props = {
      ...defaultProps,
      visibleTooltip: false,
    };
    render(<ElementWithTooltip {...props} />);

    const badge = screen.getByTestId('elementWithTooltip');
    userEvent.hover(badge);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
