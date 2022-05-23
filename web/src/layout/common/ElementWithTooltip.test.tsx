import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ElementWithTooltip from './ElementWithTooltip';

const defaultProps = {
  tooltipMessage: 'Tooltip message',
  element: <div>label</div>,
  active: true,
  visibleTooltip: true,
};

const user = userEvent.setup({ delay: null });

describe('ElementWithTooltip', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ElementWithTooltip {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders properly', () => {
    render(<ElementWithTooltip {...defaultProps} />);
    expect(screen.getByTestId('elementWithTooltip')).toBeInTheDocument();
    expect(screen.getByText('label')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<ElementWithTooltip {...defaultProps} active={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays tooltip', async () => {
    jest.useFakeTimers();

    render(<ElementWithTooltip {...defaultProps} />);

    const badge = screen.getByTestId('elementWithTooltip');
    await user.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.tooltipMessage)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('hides tooltip on mouse leave', async () => {
    jest.useFakeTimers();

    render(<ElementWithTooltip {...defaultProps} />);

    const badge = screen.getByTestId('elementWithTooltip');
    await user.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.tooltipMessage)).toBeInTheDocument();

    await user.unhover(badge);

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(screen.queryByRole('tooltip')).toBeNull();

    jest.useRealTimers();
  });

  it('does not display tooltip when visibleTooltip is false', async () => {
    const props = {
      ...defaultProps,
      visibleTooltip: false,
    };
    render(<ElementWithTooltip {...props} />);

    const badge = screen.getByTestId('elementWithTooltip');
    await userEvent.hover(badge);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
