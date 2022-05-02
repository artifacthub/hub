import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HoverableItem from './HoverableItem';

const onHoverMock = jest.fn();
const onLeaveMock = jest.fn();

const defaultProps = {
  onHover: onHoverMock,
  onLeave: onLeaveMock,
};

describe('HoverableItem', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<HoverableItem {...defaultProps}>hi</HoverableItem>);
    expect(asFragment()).toMatchSnapshot();
  });

  it('calls events', async () => {
    render(<HoverableItem {...defaultProps}>hi</HoverableItem>);

    const item = screen.getByText('hi');
    expect(item).toBeInTheDocument();

    await userEvent.hover(item);
    expect(onHoverMock).toHaveBeenCalledTimes(1);

    await userEvent.unhover(item);
    expect(onLeaveMock).toHaveBeenCalledTimes(1);
  });
});
