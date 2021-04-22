import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import ButtonCopyToClipboard from './ButtonCopyToClipboard';

const copyToClipboardMock = jest.fn();
const clipboardWriteTextMock = jest.fn();

document.execCommand = copyToClipboardMock;

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: clipboardWriteTextMock,
  },
  writable: true,
});

describe('ButtonCopyToClipboard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders tooltip after clicking button', async () => {
    render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(screen.queryByRole('tooltip')).toBeNull();

    const btn = screen.getByTestId('ctcBtn');
    userEvent.click(btn);

    expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    expect(clipboardWriteTextMock).toHaveBeenCalledWith('Text to copy');

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('renders tooltip after clicking button when navidator.clipboard is undefined', async () => {
    (navigator as any).clipboard = null;
    render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(screen.queryByRole('tooltip')).toBeNull();

    const btn = screen.getByTestId('ctcBtn');
    userEvent.click(btn);

    await waitFor(() => expect(copyToClipboardMock).toHaveBeenCalledWith('copy'));
    expect(copyToClipboardMock).toHaveBeenCalledTimes(1);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip after 2 seconds', async () => {
    jest.useFakeTimers();

    render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(screen.queryByRole('tooltip')).toBeNull();

    const btn = screen.getByTestId('ctcBtn');
    userEvent.click(btn);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole('tooltip')).toBeNull();

    jest.useRealTimers();
  });
});
